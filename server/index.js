require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const pgdb = require('./pgdb');
const { createLogger } = require('./utils/logger');
const errorHandler = require('./utils/errorHandler');

const log = createLogger('server');

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  log.error('Uncaught exception:', err.message);
});

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : '*';

const io = new Server(server, { cors: { origin: ALLOWED_ORIGINS }, maxHttpBufferSize: 500 * 1024 * 1024 });

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/faculty', require('./routes/faculty'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/syllabus', require('./routes/syllabus'));
app.use('/api/moderation', require('./routes/moderation'));
app.use('/api/programs', require('./routes/programs'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/files', require('./routes/files'));
app.use('/api/ai-tutor', require('./routes/aiTutor'));
app.use('/api/results', require('./routes/results'));
app.use('/api/marksheets', require('./routes/marksheets'));
app.use('/api/obe', require('./routes/obe'));
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));

app.get('/api/stats', async (req, res) => {
  const db = require('./db');
  if (pgdb.ready) {
    const [students, faculty, courses, departments, questions, evaluations] = await Promise.all([
      pgdb.pool.query(`SELECT COUNT(*) FROM students WHERE status = 'active'`),
      pgdb.pool.query(`SELECT COUNT(*) FROM faculty WHERE is_active = TRUE`),
      pgdb.pool.query(`SELECT COUNT(*) FROM courses WHERE is_active = TRUE`),
      pgdb.pool.query(`SELECT COUNT(*) FROM departments`),
      pgdb.pool.query(`SELECT COUNT(*) FROM questions`),
      pgdb.pool.query(`SELECT COUNT(*) FROM student_results`),
    ]);
    return res.json({
      students: parseInt(students.rows[0].count),
      faculty: parseInt(faculty.rows[0].count),
      courses: parseInt(courses.rows[0].count),
      departments: parseInt(departments.rows[0].count),
      questions: parseInt(questions.rows[0].count),
      evaluations: parseInt(evaluations.rows[0].count),
    });
  }
  res.json({
    students: db.count('students'),
    faculty: db.count('faculty'),
    courses: db.count('courses'),
    departments: db.count('departments'),
    questions: db.count('questions'),
    evaluations: db.all('evaluations').filter(e => e.status === 'done').length,
  });
});

// ─── Gemini API caller for evaluation (per-question and legacy modes) ────────
const GEMINI_EVAL_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const getGeminiKey = () => process.env.GEMINI_API_KEY || '';

function computeGrade(pct) {
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  return 'F';
}

// Effective max for a question (sum of sub-sections if present)
function qMax(q) {
  if (q.subSections && q.subSections.length > 0)
    return q.subSections.reduce((s, ss) => s + (parseInt(ss.maxMarks) || 0), 0);
  return parseInt(q.maxMarks) || 0;
}

function buildQBlock(q, i) {
  const no = q.questionNo || i + 1;
  const max = qMax(q);
  let line = `Q${no} (max ${max} marks): "${q.text}"`;
  if (q.rubric && q.rubric.trim()) line += `\n  Rubric: ${q.rubric}`;
  if (q.subSections && q.subSections.length > 0) {
    q.subSections.forEach(ss => {
      line += `\n  Q${no}(${ss.label}) (max ${ss.maxMarks} marks): "${ss.text || '(see answer sheet)'}"`;
      if (ss.rubric && ss.rubric.trim()) line += `\n    Rubric: ${ss.rubric}`;
    });
  }
  return line;
}

function buildQExample(q, i) {
  const no = q.questionNo || i + 1;
  const max = qMax(q);
  const ex = { questionNo: no, marksAwarded: Math.round(max * 0.7), maxMarks: max, feedback: 'brief feedback' };
  if (q.subSections && q.subSections.length > 0) {
    ex.subSections = q.subSections.map(ss => ({
      label: ss.label,
      marksAwarded: Math.round(parseInt(ss.maxMarks || 0) * 0.7),
      maxMarks: parseInt(ss.maxMarks || 0),
      feedback: 'sub-section feedback',
    }));
  }
  return ex;
}

async function callGeminiEval({ images, modelAnswer, modelAnswerImages, subject, maxMarks, rubric, studentName, questions }) {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in server .env');

  const parts = [];
  const usingImgMA = modelAnswerImages && modelAnswerImages.length > 0;

  if (usingImgMA) {
    modelAnswerImages.forEach(im => parts.push({ inlineData: { mimeType: im.mime, data: im.b64 } }));
    parts.push({ text: '─── MODEL ANSWER SHEET(S) ABOVE | STUDENT ANSWER SHEET BELOW ───' });
  }
  images.forEach(im => parts.push({ inlineData: { mimeType: im.mime, data: im.b64 } }));

  let promptText;
  if (questions && questions.length > 0) {
    const totalMax = questions.reduce((s, q) => s + qMax(q), 0);
    const qList = questions.map(buildQBlock).join('\n\n');
    const exampleQ = JSON.stringify(questions.map(buildQExample));
    promptText = `You are an expert teacher grading a student's handwritten answer sheet.
Student: ${studentName || 'Unknown'}
Subject: ${subject || 'General'}
Total Maximum Marks: ${totalMax}

EXAM QUESTIONS — evaluate each question and sub-section SEPARATELY:
${qList}
${usingImgMA ? '\nModel answer images shown above separator.' : modelAnswer ? `\nModel Answer:\n"""\n${modelAnswer}\n"""` : ''}

Instructions:
1. Identify each written answer by question number (and sub-section label where applicable).
2. Evaluate each question and sub-section INDEPENDENTLY using its stated rubric.
3. Award marks NOT exceeding each question's / sub-section's stated maximum.
4. If absent/illegible, award 0.
5. For questions WITH sub-sections: marksAwarded = sum of sub-section marks.
6. totalMarksAwarded = sum of all question marksAwarded.
7. Keep ALL feedback under 30 words per question. Keep transcription under 100 words total.
8. Output ALL question scores FIRST before any feedback text — scores must never be cut off.
Return ONLY raw JSON (no markdown, no code fences):
{"questions":${exampleQ},"totalMarksAwarded":${totalMax},"totalMaxMarks":${totalMax},"grade":"A","percentage":70,"strengths":["strength 1","strength 2"],"improvements":["area 1"],"detailedFeedback":"overall paragraph feedback","transcription":"brief summary of student answers"}`;
  } else {
    promptText = `You are an expert teacher grading a student's handwritten answer sheet.\nStudent: ${studentName || 'Unknown'}\nSubject: ${subject || 'General'}\nMax Marks: ${maxMarks}\n${rubric ? `Rubric:\n${rubric}\n` : ''}\n${usingImgMA ? 'Model answer images shown above separator.' : `Model Answer:\n"""\n${modelAnswer}\n"""`}\n\n1. Read and transcribe ALL handwritten text.\n2. Compare each answer against the model answer.\n3. Award marks out of ${maxMarks}.\n\nReturn ONLY raw JSON (no markdown):\n{"transcription":"...","marksAwarded":5,"maxMarks":${maxMarks},"grade":"B","percentage":50,"criteria":[{"name":"Accuracy","score":7,"max":10},{"name":"Completeness","score":6,"max":10},{"name":"Clarity","score":7,"max":10},{"name":"Key Concepts","score":6,"max":10},{"name":"Presentation","score":7,"max":10}],"strengths":["s1","s2"],"improvements":["i1","i2"],"detailedFeedback":"...","teacherNote":"...","comparisonNotes":"..."}`;
  }

  parts.push({ text: promptText });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EVAL_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 65536 },
      }),
    }
  );
  const d = await res.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
  if (!d.candidates?.length) throw new Error('Gemini returned no response');
  const candidate = d.candidates[0];
  const finishReason = candidate.finishReason;
  const raw = (candidate.content?.parts?.[0]?.text || '').replace(/```json\n?|```\n?/g, '').trim();

  if (finishReason === 'MAX_TOKENS') {
    console.warn('[Gemini eval] Response hit MAX_TOKENS — JSON may be truncated');
  }

  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    if (start === -1) throw new Error(`No JSON in Gemini response: ${raw.slice(0, 200)}`);

    let text = raw.slice(start);

    // If truncated mid-string, strip back to the last complete key-value pair
    const quoteCount = (text.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // Find last comma that's NOT inside an unclosed string — trim from there
      const lastClean = Math.max(text.lastIndexOf('},'), text.lastIndexOf('}'));
      if (lastClean > 0) text = text.slice(0, lastClean + 1);
    }

    // Scan backwards for the last position where we can close the structure
    let parsed = null;
    for (let i = text.length - 1; i > 0 && !parsed; i--) {
      if (text[i] === '}' || text[i] === ']') {
        try {
          const attempt = text.slice(0, i + 1);
          const objOpens = (attempt.match(/\{/g) || []).length - (attempt.match(/\}/g) || []).length;
          const arrOpens = (attempt.match(/\[/g) || []).length - (attempt.match(/\]/g) || []).length;
          const closing = ']'.repeat(Math.max(0, arrOpens)) + '}'.repeat(Math.max(0, objOpens));
          parsed = JSON.parse(attempt + closing);
        } catch {}
      }
    }
    if (!parsed) throw new Error(`Malformed JSON from Gemini: ${raw.slice(0, 300)}`);
    result = parsed;
  }

  // Enforce per-question max marks (with sub-section support) and recompute totals
  if (questions && questions.length > 0 && Array.isArray(result.questions)) {
    result.questions = result.questions.map(q => {
      const def = questions.find(dq => dq.questionNo === q.questionNo);
      if (!def) return q;
      const hasSS = def.subSections && def.subSections.length > 0;
      if (hasSS && Array.isArray(q.subSections) && q.subSections.length > 0) {
        const enfSS = q.subSections.map(ss => {
          const ssDef = def.subSections.find(d => d.label === ss.label);
          const cap = ssDef ? parseInt(ssDef.maxMarks) : parseInt(ss.maxMarks || 0);
          return { ...ss, marksAwarded: Math.min(Math.max(0, ss.marksAwarded || 0), cap), maxMarks: cap };
        });
        const ssTotal = enfSS.reduce((s, ss) => s + ss.marksAwarded, 0);
        return { ...q, subSections: enfSS, marksAwarded: ssTotal, maxMarks: qMax(def) };
      }
      const cap = qMax(def);
      return { ...q, marksAwarded: Math.min(Math.max(0, q.marksAwarded || 0), cap), maxMarks: cap };
    });
    const totalMax = questions.reduce((s, q) => s + qMax(q), 0);
    const total = result.questions.reduce((s, q) => s + q.marksAwarded, 0);
    const pct = totalMax > 0 ? Math.round((total / totalMax) * 100) : 0;
    result.totalMarksAwarded = total;
    result.totalMaxMarks = totalMax;
    result.percentage = pct;
    result.grade = computeGrade(pct);
  }

  return result;
}

// ─── Bulk Evaluation via Socket.IO ───────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join:session', (sessionId) => socket.join(sessionId));

  socket.on('bulk:start', async ({ sessionId, students, subject, maxMarks, rubric, modelAnswer, modelAnswerImages, questions, paperId }) => {
    if (!getGeminiKey()) { socket.emit('eval:error', { message: 'GEMINI_API_KEY not set in server .env' }); return; }
    const CONCURRENCY = 3;
    let active = 0;
    let idx = 0;
    const queue = [...students];
    const db = require('./db');

    async function runNext() {
      if (idx >= queue.length) return;
      const job = queue[idx++];
      active++;
      io.to(sessionId).emit('eval:update', { clientId: job.clientId, status: 'evaluating', studentName: job.name });
      try {
        const result = await callGeminiEval({ images: job.images, modelAnswer, modelAnswerImages, subject, maxMarks, rubric, studentName: job.name, questions });

        const resultId = uuidv4();

        if (pgdb.ready) {
          // Resolve student_id by enrollment number if provided
          let studentId = null;
          if (job.enrollmentNo) {
            const sr = await pgdb.pool.query(`SELECT id FROM students WHERE id = $1 OR enrollment_no = $1`, [job.enrollmentNo]);
            studentId = sr.rows[0]?.id ?? null;
          }
          const client = await pgdb.pool.connect();
          try {
            await client.query('BEGIN');
            await client.query(
              `INSERT INTO student_results
                 (id, paper_id, session_id, student_id, student_name, roll_no, enrollment_no,
                  total_marks_obtained, max_marks, percentage, grade,
                  transcription, detailed_feedback, strengths, improvements)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
              [resultId, paperId || null, sessionId || null, studentId,
               job.name, job.rollNo || '', job.enrollmentNo || '',
               result.totalMarksAwarded ?? result.marksAwarded ?? 0,
               result.totalMaxMarks ?? result.maxMarks ?? 0,
               result.percentage, result.grade,
               result.transcription || '', result.detailedFeedback || '',
               JSON.stringify(result.strengths || []), JSON.stringify(result.improvements || [])]
            );
            for (const qr of (result.questions || [])) {
              await client.query(
                `INSERT INTO question_responses
                   (id, result_id, question_no, question_text, marks_awarded, max_marks, feedback, sub_section_responses)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [uuidv4(), resultId, qr.questionNo, qr.questionText || '',
                 qr.marksAwarded, qr.maxMarks, qr.feedback || '',
                 JSON.stringify(qr.subSections || [])]
              );
            }
            await client.query('COMMIT');
          } catch (pgErr) {
            await client.query('ROLLBACK');
            console.warn('[bulk] PG save failed:', pgErr.message);
          } finally { client.release(); }
        } else {
          // JSON fallback
          db.insert('student_results', {
            id: resultId, paper_id: paperId || null, student_name: job.name, roll_no: job.rollNo || '',
            enrollment_no: job.enrollmentNo || '',
            total_marks_obtained: result.totalMarksAwarded ?? result.marksAwarded,
            max_marks: result.totalMaxMarks ?? result.maxMarks,
            percentage: result.percentage, grade: result.grade,
            transcription: result.transcription || '', detailed_feedback: result.detailedFeedback || '',
            strengths: result.strengths || [], improvements: result.improvements || [],
            created_at: new Date().toISOString(),
          });
          for (const qr of (result.questions || [])) {
            db.insert('question_responses', {
              id: uuidv4(), result_id: resultId, question_no: qr.questionNo,
              question_text: qr.questionText || '', marks_awarded: qr.marksAwarded,
              max_marks: qr.maxMarks, feedback: qr.feedback || '',
              sub_section_responses: qr.subSections || [], created_at: new Date().toISOString(),
            });
          }
        }

        io.to(sessionId).emit('eval:update', { clientId: job.clientId, status: 'done', result, studentName: job.name });
      } catch (e) {
        io.to(sessionId).emit('eval:update', { clientId: job.clientId, status: 'error', error: e.message, studentName: job.name });
      }
      active--;
      if (idx < queue.length) runNext();
      else if (active === 0) io.to(sessionId).emit('eval:complete');
    }

    for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) runNext();
  });
});

// ─── Central error handler (must be last middleware) ─────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

pgdb.init().then(() => {
  server.listen(PORT, () => log.info(`Running on http://localhost:${PORT} | PostgreSQL: ${pgdb.ready ? 'connected' : 'disabled'}`));
}).catch(() => {
  server.listen(PORT, () => log.info(`Running on http://localhost:${PORT}`));
});
