const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const pgdb = require('../pgdb');
const db = require('../db');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 150 * 1024 * 1024 } });

const GEMINI_MODEL = 'gemini-2.5-flash';

// Resolve MIME type — multer on Windows sometimes returns application/octet-stream for PDFs
function resolveMime(file) {
  if (file.mimetype && file.mimetype !== 'application/octet-stream') return file.mimetype;
  const ext = (file.originalname || '').split('.').pop().toLowerCase();
  return { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[ext] || file.mimetype;
}


// ─── Secure API Key (server-side only, never use VITE_ prefix on backend) ────
const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) console.warn('[syllabus] WARNING: GEMINI_API_KEY is not set in environment');
  return key;
};

// ─── Bloom's level → DB value ─────────────────────────────────────────────────
const BLOOMS_MAP = {
  L1: 'remember', L2: 'understand', L3: 'apply',
  L4: 'analyze',  L5: 'evaluate',   L6: 'create',
  remember: 'remember', understand: 'understand', apply: 'apply',
  analyze: 'analyze', evaluate: 'evaluate', create: 'create',
};

function normalizeBlooms(b) {
  if (!b) return '';
  const mapped = BLOOMS_MAP[b] || BLOOMS_MAP[b.toLowerCase()];
  return mapped || '';
}

// Extract single letter A/B/C/D from whatever Gemini returns for "correct"
function normalizeCorrect(val) {
  if (!val) return null;
  const m = String(val).trim().match(/^([A-Da-d])/);
  return m ? m[1].toUpperCase() : null;
}

// ─── Gemini call (with rate-limit retry) ─────────────────────────────────────
async function callGemini(parts, apiKey, temp = 0.2, _attempt = 0) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: temp,
          maxOutputTokens: 65536,
        },
      }),
    }
  );

  const d = await res.json();

  if (d.error) {
    const msg = d.error.message || '';
    console.error('[Gemini] API error details:', JSON.stringify(d.error));

    const isRateLimit =
      res.status === 429 ||
      msg.toLowerCase().includes('quota') ||
      msg.toLowerCase().includes('resource_exhausted') ||
      msg.toLowerCase().includes('high demand') ||
      msg.toLowerCase().includes('try again later') ||
      msg.toLowerCase().includes('temporarily unavailable');

    if (isRateLimit && _attempt < 4) {
      const waitMs = (_attempt + 1) * 15000;
      console.log(`[Gemini] Rate limited — retrying in ${Math.round(waitMs / 1000)}s (attempt ${_attempt + 1}/4)`);
      await new Promise(r => setTimeout(r, waitMs));
      return callGemini(parts, apiKey, temp, _attempt + 1);
    }

    throw new Error(`Gemini API error: ${msg}`);
  }

  if (!d.candidates?.length) {
    throw new Error('No response candidates from Gemini');
  }

  const raw = d.candidates[0].content.parts
    .map(p => p.text || '')
    .join('')
    .replace(/```json\n?|```\n?/g, '')
    .trim();

  const start = raw.indexOf('{');
  if (start === -1) {
    throw new Error(`No JSON object found in Gemini response: ${raw.slice(0, 200)}`);
  }

  try {
    return JSON.parse(raw.slice(start));
  } catch {
    const text = raw.slice(start);
    for (let i = text.length - 1; i > 0; i--) {
      if (text[i] === '}') {
        try {
          const attempt = text.slice(0, i + 1);
          const opens =
            (attempt.match(/\{/g) || []).length -
            (attempt.match(/\}/g) || []).length;
          return JSON.parse(attempt + '}'.repeat(Math.max(0, opens)));
        } catch {}
      }
    }
    throw new Error(`Malformed JSON from Gemini: ${raw.slice(0, 300)}`);
  }
}

// ─── POST /parse ──────────────────────────────────────────────────────────────
router.post('/parse', upload.fields([
  { name: 'syllabusFile', maxCount: 10 },
  { name: 'materialFile', maxCount: 20 },
]), async (req, res) => {
  const courseCode = req.body.courseCode || '';
  const manualCos = req.body.manualCos ? JSON.parse(req.body.manualCos) : [];
  const manualPos = req.body.manualPos ? JSON.parse(req.body.manualPos) : [];
  const syllabusFileList = req.files?.syllabusFile || [];
  const materialFileList = req.files?.materialFile || [];

  const apiKey = getApiKey();
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set in server .env' });
  if (!syllabusFileList.length) return res.status(400).json({ error: 'At least one syllabus PDF is required' });

  try {
    const parts = [];

    syllabusFileList.forEach(f =>
      parts.push({ inlineData: { mimeType: resolveMime(f), data: f.buffer.toString('base64') } })
    );

    if (materialFileList.length) {
      parts.push({ text: '─── ADDITIONAL COURSE MATERIAL ───' });
      materialFileList.forEach(f =>
        parts.push({ inlineData: { mimeType: resolveMime(f), data: f.buffer.toString('base64') } })
      );
    }

    const coBlock = manualCos?.length
      ? `\nAuthoritative Course Outcomes (use these exactly):\n${manualCos.map(c => `${c.code}: ${c.description}`).join('\n')}`
      : '';

    const poBlock = manualPos?.length
      ? `\nProgram Outcomes:\n${manualPos.map(p => `${p.code}: ${p.description}`).join('\n')}`
      : '';

    parts.push({
      text: `You are an academic curriculum expert specialising in NBA/ABET accreditation.
Parse the uploaded syllabus document(s) and extract complete structured information.${coBlock}${poBlock}

Return ONLY raw JSON (no markdown, no code fences):
{
  "courseTitle": "Full course name",
  "courseCode": "${courseCode || 'extract from document'}",
  "credits": 3,
  "semester": "3rd",
  "units": [
    {
      "number": 1,
      "title": "Unit title",
      "hours": 8,
      "topics": ["Topic 1", "Topic 2"],
      "subTopics": {"Topic 1": ["Sub-topic A", "Sub-topic B"]},
      "coMapping": ["CO1", "CO2"],
      "keyConceptsForExam": ["concept1", "concept2"]
    }
  ],
  "courseOutcomes": [
    {
      "code": "CO1",
      "description": "Students will be able to...",
      "bloomsLevel": "L3",
      "bloomsVerb": "Apply",
      "poMapping": ["PO1", "PO2"],
      "unitMapping": [1, 2]
    }
  ],
  "programOutcomes": [
    { "code": "PO1", "description": "Engineering knowledge..." }
  ],
  "textbooks": ["Author. Title. Publisher, Year"],
  "references": ["Author. Title. Publisher, Year"]
}`,
    });

    const parsed = await callGemini(parts, apiKey, 0.1);

    const id = uuidv4();
    const resolvedCode = parsed.courseCode || courseCode || '';
    const courseRow = resolvedCode ? await pgdb.getCourseByCode(resolvedCode) : null;
    const safeCredits = parseInt(parsed.credits) || 3;

    if (pgdb.ready) {
      await pgdb.pool.query(
        `INSERT INTO syllabi (id, course_code, course_id, title, credits, units, cos, pos)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          id,
          resolvedCode,
          courseRow?.id || null,
          parsed.courseTitle || '',
          safeCredits,
          JSON.stringify(parsed.units || []),
          JSON.stringify(parsed.courseOutcomes || []),
          JSON.stringify(parsed.programOutcomes || []),
        ]
      );
    } else {
      db.insert('syllabi', {
        id,
        courseCode: resolvedCode,
        title: parsed.courseTitle || '',
        credits: safeCredits,
        units: parsed.units || [],
        cos: parsed.courseOutcomes || [],
        pos: parsed.programOutcomes || [],
        createdAt: new Date().toISOString(),
      });
    }

    res.status(201).json({
      id,
      ...parsed,
      courseOutcomes: parsed.courseOutcomes || [],
      programOutcomes: parsed.programOutcomes || [],
    });
  } catch (e) {
    console.error('[syllabus/parse]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET / (list all syllabi) ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        `SELECT id, course_code, title, credits, created_at
         FROM syllabi
         ORDER BY created_at DESC`
      );
      return res.json(r.rows);
    }

    res.json(
      db.all('syllabi').map(s => ({
        id: s.id,
        course_code: s.courseCode,
        title: s.title,
        credits: s.credits,
        created_at: s.createdAt,
      }))
    );
  } catch (e) {
    console.error('[syllabus/list]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /papers (must come before /:id) ─────────────────────────────────────
router.get('/papers', async (req, res) => {
  try {
    let papers = [];
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        `SELECT ep.*,
                (SELECT COUNT(*) FROM exam_questions WHERE paper_id = ep.id) AS question_count
         FROM exam_papers ep
         ORDER BY ep.created_at DESC NULLS LAST`
      );
      papers = r.rows;
    } else {
      papers = [...db.all('exam_papers')].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    }
    const allMeta = db.all('paper_metadata');
    papers = papers.map(p => {
      const meta = allMeta.find(m => m.paperId === (p.id || p.paperId)) || {};
      return { ...p, ...meta, id: p.id || meta.paperId };
    });
    res.json({ papers });
  } catch (e) {
    console.error('[syllabus/papers]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /papers/:paperId/notify ─────────────────────────────────────────────
router.post('/papers/:paperId/notify', async (req, res) => {
  try {
    const { teacherName = '', teacherEmail = '', message = '' } = req.body;
    const { paperId } = req.params;

    let paperTitle = '';
    if (pgdb.ready) {
      const r = await pgdb.pool.query(`SELECT title FROM exam_papers WHERE id=$1`, [paperId]);
      paperTitle = r.rows[0]?.title || '';
    } else {
      const p = db.get('exam_papers', ep => ep.id === paperId);
      paperTitle = p?.title || '';
    }
    if (!paperTitle) {
      const meta = db.get('paper_metadata', m => m.paperId === paperId);
      paperTitle = meta?.courseName || paperId;
    }

    const notification = {
      id: uuidv4(),
      paperId,
      paperTitle,
      teacherName,
      teacherEmail,
      message: message || `Question paper "${paperTitle}" has been finalized and is ready for your review.`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    db.insert('notifications', notification);
    db.update('paper_metadata', m => m.paperId === paperId, m => ({ ...m, notified: true, notifiedAt: new Date().toISOString() }));
    res.json({ success: true, notification });
  } catch (e) {
    console.error('[syllabus/notify]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /notifications ───────────────────────────────────────────────────────
router.get('/notifications', (req, res) => {
  try {
    const notifications = [...db.all('notifications')].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json({ notifications, unread: notifications.filter(n => !n.read).length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PATCH /notifications/:id/read ───────────────────────────────────────────
router.patch('/notifications/:id/read', (req, res) => {
  try {
    db.update('notifications', n => n.id === req.params.id, n => ({ ...n, read: true }));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    if (pgdb.ready) {
      const r = await pgdb.pool.query(`SELECT * FROM syllabi WHERE id=$1`, [req.params.id]);
      if (!r.rows.length) return res.status(404).json({ error: 'Syllabus not found' });
      const row = r.rows[0];
      return res.json({
        id: row.id,
        courseCode: row.course_code,
        title: row.title,
        credits: row.credits,
        units: row.units,
        cos: row.cos,
        pos: row.pos,
        createdAt: row.created_at,
      });
    }

    const s = db.get('syllabi', x => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'Syllabus not found' });
    res.json(s);
  } catch (e) {
    console.error('[syllabus/get]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── PUT /:id (edit COs, POs, units) ─────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { title, credits, units, cos, pos } = req.body;

    if (pgdb.ready) {
      await pgdb.pool.query(
        `UPDATE syllabi
         SET title   = COALESCE($1, title),
             credits = COALESCE($2, credits),
             units   = COALESCE($3, units),
             cos     = COALESCE($4, cos),
             pos     = COALESCE($5, pos)
         WHERE id = $6`,
        [
          title   || null,
          credits ? parseInt(credits) : null,
          units   ? JSON.stringify(units) : null,
          cos     ? JSON.stringify(cos)   : null,
          pos     ? JSON.stringify(pos)   : null,
          req.params.id,
        ]
      );

      const r = await pgdb.pool.query(`SELECT * FROM syllabi WHERE id=$1`, [req.params.id]);
      if (!r.rows.length) return res.status(404).json({ error: 'Syllabus not found' });
      const row = r.rows[0];
      return res.json({
        id: row.id,
        courseCode: row.course_code,
        title: row.title,
        credits: row.credits,
        units: row.units,
        cos: row.cos,
        pos: row.pos,
      });
    }

    db.update('syllabi', x => x.id === req.params.id, () => ({ title, credits, units, cos, pos }));
    res.json({ ok: true });
  } catch (e) {
    console.error('[syllabus/update]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (pgdb.ready) {
      await pgdb.pool.query(`DELETE FROM syllabi WHERE id=$1`, [req.params.id]);
      return res.json({ ok: true });
    }
    db.remove('syllabi', x => x.id === req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error('[syllabus/delete]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /:id/generate-questions ─────────────────────────────────────────────
router.post('/:id/generate-questions', upload.fields([
  { name: 'materialFile', maxCount: 20 },
]), async (req, res) => {
  try {
    const unitNumbers = req.body.unitNumbers ? JSON.parse(req.body.unitNumbers) : [];
    const config = req.body.config ? JSON.parse(req.body.config) : {};
    const materialFileList = req.files?.materialFile || [];

    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set in server .env' });

    // ── Fetch syllabus ────────────────────────────────────────────────────────
    let syllabus;
    if (pgdb.ready) {
      const r = await pgdb.pool.query(`SELECT * FROM syllabi WHERE id=$1`, [req.params.id]);
      if (!r.rows.length) return res.status(404).json({ error: 'Syllabus not found' });
      const row = r.rows[0];
      syllabus = {
        courseCode: row.course_code,
        title: row.title,
        units: row.units,
        cos: row.cos,
        pos: row.pos,
      };
    } else {
      syllabus = db.get('syllabi', x => x.id === req.params.id);
      if (!syllabus) return res.status(404).json({ error: 'Syllabus not found' });
    }

    // ── Config defaults ───────────────────────────────────────────────────────
    const {
      typeDistribution = { mcq: 3, short: 3, numerical: 2, long: 2 },
      difficultyRatio  = { easy: 20, medium: 50, hard: 30 },
      bloomsRatio      = { L1: 5, L2: 15, L3: 30, L4: 30, L5: 15, L6: 5 },
    } = config;

    const targetUnits = (syllabus.units || []).filter(u =>
      !unitNumbers?.length || unitNumbers.includes(u.number)
    );
    if (!targetUnits.length) return res.status(400).json({ error: 'No matching units found' });

    const allGenerated = [];
    const errors       = [];
    const validTypes   = ['mcq', 'short', 'long', 'numerical', 'case-study'];
    const validDiff    = ['easy', 'medium', 'hard'];

    // ── Loop over each unit ───────────────────────────────────────────────────
    for (const unit of targetUnits) {
      try {
        const unitCos = (syllabus.cos || []).filter(co =>
          (co.unitMapping || []).includes(unit.number) ||
          (unit.coMapping || []).includes(co.code)
        );
        const effectiveCos = unitCos.length ? unitCos : (syllabus.cos || []).slice(0, 4);

        const distLines = Object.entries(typeDistribution)
          .filter(([, n]) => n > 0)
          .map(([type, count]) => `  ${count} × ${type}`)
          .join('\n');

        const totalQ = Object.values(typeDistribution).reduce((s, n) => s + (n || 0), 0);

        const parts = [];
        materialFileList.forEach(f =>
          parts.push({ inlineData: { mimeType: resolveMime(f), data: f.buffer.toString('base64') } })
        );

        parts.push({
          text: `You are a senior university examiner setting questions per NBA/ABET accreditation standards.

Course: ${syllabus.courseCode} — ${syllabus.title}
Unit ${unit.number}: ${unit.title}
Topics: ${(unit.topics || []).join(', ')}
${
  Object.keys(unit.subTopics || {}).length
    ? 'Sub-topics:\n' +
      Object.entries(unit.subTopics)
        .map(([t, ss]) => `  ${t}: ${ss.join(', ')}`)
        .join('\n')
    : ''
}
Teaching Hours: ${unit.hours || 'N/A'}
Key exam concepts: ${(unit.keyConceptsForExam || []).join(', ') || 'as per topics'}

Course Outcomes for this unit (map each question to ONE):
${effectiveCos.map(co => `  ${co.code} [${co.bloomsLevel || 'L3'}/${co.bloomsVerb || 'Apply'}]: ${co.description}`).join('\n')}

Program Outcomes targeted: ${(syllabus.pos || []).slice(0, 6).map(p => p.code).join(', ')}

GENERATE EXACTLY ${totalQ} questions:
${distLines}

Target Bloom's distribution:
${Object.entries(bloomsRatio).filter(([, v]) => v > 0).map(([l, p]) => `  ${l}: ${p}%`).join('\n')}

Target difficulty distribution:
  Easy: ${difficultyRatio.easy}%  Medium: ${difficultyRatio.medium}%  Hard: ${difficultyRatio.hard}%

RULES:
1. Each question maps to exactly one CO from the list (use exact code e.g. "CO1").
2. Bloom's level must match or be within ±1 of the CO's Bloom's level.
3. Questions must be answerable from the listed unit topics only.
4. MCQ: 4 options as object keys A/B/C/D; correct field = "A"/"B"/"C"/"D".
5. Numerical: include specific numbers; correct field = numeric answer as string.
6. Long/Case: min 10 marks, requires detailed explanation.
7. Marks: MCQ=1-2, Short=3-5, Numerical=5-10, Long=10-15, Case=15-20.
8. Rubric: 2-3 concise marking criteria.
9. Answer: Write a complete, self-contained model answer for each question.
   - MCQ: one sentence explaining why the correct option is right.
   - Short: 3-6 sentences covering all key points a student must state.
   - Numerical: full step-by-step worked solution with final numeric result.
   - Long/Case: structured answer with definitions, explanation, examples, and conclusion (min 8-10 sentences).
   The answer must be detailed enough to evaluate a student's response against it directly.

Return ONLY raw JSON:
{
  "unit": ${unit.number},
  "questions": [
    {
      "text": "Question text",
      "type": "mcq",
      "difficulty": "medium",
      "bloomsLevel": "L3",
      "co": "CO1",
      "po": "PO1",
      "marks": 2,
      "topic": "Topic name",
      "options": {"A": "option1", "B": "option2", "C": "option3", "D": "option4"},
      "correct": "B",
      "answer": "The correct answer is B because... [full explanation]",
      "rubric": "Award 1 mark for correct answer"
    }
  ]
}`,
        });

        const result = await callGemini(parts, apiKey, 0.4);
        const questions = result.questions || [];

        const courseRow = pgdb.ready ? await pgdb.getCourseByCode(syllabus.courseCode) : null;

        for (const q of questions) {
          const qid     = uuidv4();
          const qType   = validTypes.includes(q.type) ? q.type : 'short';
          const qDiff   = validDiff.includes(q.difficulty) ? q.difficulty : 'medium';
          const qBlooms = normalizeBlooms(q.bloomsLevel);
          const qMarks  = parseInt(q.marks) || 1;
          const qCorrect = normalizeCorrect(q.correct);

          const qOptions =
            q.options && typeof q.options === 'object' && !Array.isArray(q.options)
              ? JSON.stringify(q.options)
              : q.options
              ? JSON.stringify({
                  A: q.options[0] || '',
                  B: q.options[1] || '',
                  C: q.options[2] || '',
                  D: q.options[3] || '',
                })
              : null;

          if (pgdb.ready) {
            await pgdb.pool.query(
              `INSERT INTO questions
                 (id, course_id, course_code, course_name, type, topic, difficulty,
                  co, po, blooms, text, options, correct, marks, answer)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
              [
                qid,
                courseRow?.id || null,
                syllabus.courseCode || '',
                syllabus.title || '',
                qType,
                q.topic || unit.title,
                qDiff,
                q.co || '',
                q.po || '',
                qBlooms,
                q.text,
                qOptions,
                qCorrect,
                qMarks,
                q.answer || '',
              ]
            );
          } else {
            db.insert('questions', {
              id: qid,
              course: syllabus.courseCode,
              courseName: syllabus.title,
              type: qType,
              topic: q.topic || unit.title,
              difficulty: qDiff,
              co: q.co || '',
              po: q.po || '',
              blooms: qBlooms,
              text: q.text,
              options: q.options || null,
              correct: qCorrect,
              marks: qMarks,
              answer: q.answer || '',
              createdAt: new Date().toISOString(),
            });
          }

          allGenerated.push({
            id: qid,
            text: q.text,
            type: qType,
            difficulty: qDiff,
            bloomsLevel: q.bloomsLevel,
            co: q.co,
            po: q.po,
            marks: qMarks,
            topic: q.topic,
            options: q.options,
            correct: qCorrect,
            answer: q.answer || '',
            rubric: q.rubric,
            unitNumber: unit.number,
            unitTitle: unit.title,
          });
        }
      } catch (e) {
        errors.push({ unit: unit.number, error: e.message });
        console.error(`[syllabus/generate] Unit ${unit.number}:`, e.message);
      }
    }

    res.json({
      generated: allGenerated.length,
      questions: allGenerated,
      errors,
      message: `Generated ${allGenerated.length} questions across ${targetUnits.length - errors.length}/${targetUnits.length} units`,
    });
  } catch (e) {
    console.error('[syllabus/generate-questions]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /:id/build-paper ────────────────────────────────────────────────────
router.post('/:id/build-paper', async (req, res) => {
  try {
    const {
      title, subject, examDate, duration, sections, totalMarks, instructions,
      examType = 'endterm', unitFilter = [], program = '', department = '',
      semester = '', templateConfig = {}, includeAnswers = false,
    } = req.body;

    if (!title)    return res.status(400).json({ error: 'Paper title is required' });
    if (!sections?.length) return res.status(400).json({ error: 'At least one section is required' });

    // ── Fetch syllabus ────────────────────────────────────────────────────────
    let syllabus;
    if (pgdb.ready) {
      const r = await pgdb.pool.query(`SELECT * FROM syllabi WHERE id=$1`, [req.params.id]);
      if (!r.rows.length) return res.status(404).json({ error: 'Syllabus not found' });
      const row = r.rows[0];
      syllabus = {
        courseCode: row.course_code,
        title: row.title,
        units: row.units,
        cos: row.cos,
        pos: row.pos,
        courseId: row.course_id,
      };
    } else {
      syllabus = db.get('syllabi', x => x.id === req.params.id);
      if (!syllabus) return res.status(404).json({ error: 'Syllabus not found' });
    }

    // ── Fetch question pool ───────────────────────────────────────────────────
    let allQs = [];
    if (pgdb.ready) {
      const qr = await pgdb.pool.query(
        `SELECT * FROM questions WHERE course_code=$1`,
        [syllabus.courseCode]
      );
      allQs = qr.rows;
    } else {
      allQs = db.all('questions').filter(q => q.course === syllabus.courseCode);
    }

    if (!allQs.length) {
      return res.status(400).json({
        error: 'No questions found for this course. Please generate questions first.',
      });
    }

    // Midterm: restrict question pool to topics from selected units only
    if (examType === 'midterm' && unitFilter.length) {
      const selectedUnitsData = (syllabus.units || []).filter(u => unitFilter.includes(u.number));
      const allowedTopics = new Set();
      selectedUnitsData.forEach(u => {
        allowedTopics.add((u.title || '').toLowerCase());
        (u.topics || []).forEach(t => allowedTopics.add(t.toLowerCase()));
      });
      if (allowedTopics.size) {
        allQs = allQs.filter(q => {
          const topic = (q.topic || '').toLowerCase();
          return [...allowedTopics].some(t => topic.includes(t) || t.includes(topic));
        });
      }
    }

    // ── Select questions for each section ─────────────────────────────────────
    const usedIds    = new Set();
    const cosCovered = new Set();
    const paperQs    = [];

    for (const sec of sections) {
      const pool = allQs.filter(q =>
        q.type === sec.type &&
        (!sec.difficulty || q.difficulty === sec.difficulty) &&
        !usedIds.has(q.id)
      );

      // Prioritise questions that cover new COs
      pool.sort((a, b) => {
        const aNew = !cosCovered.has(a.co || '');
        const bNew = !cosCovered.has(b.co || '');
        return aNew === bNew ? 0 : aNew ? -1 : 1;
      });

      const selected = pool.slice(0, sec.count);
      selected.forEach(q => {
        usedIds.add(q.id);
        if (q.co) cosCovered.add(q.co);
      });

      const base = paperQs.length;
      selected.forEach((q, i) =>
        paperQs.push({
          questionNo:   base + i + 1,
          question:     q,
          sectionLabel: sec.label || String.fromCharCode(65 + sections.indexOf(sec)),
          marks:        sec.marksPerQ || q.marks || 1,
        })
      );
    }

    // ── Generate answers on-the-fly for questions that lack them (answer-key mode) ──
    if (includeAnswers) {
      const apiKey = getApiKey();
      const missing = paperQs.filter(pq => !pq.question.answer);
      if (missing.length > 0 && apiKey) {
        try {
          // Build a plain-text list so Gemini does not confuse the input JSON with the output JSON
          const questionLines = missing.map((pq, idx) => {
            const q = pq.question;
            let opts = q.options;
            if (typeof opts === 'string') { try { opts = JSON.parse(opts); } catch { opts = null; } }
            let line = `Q${idx} [${q.type}, ${pq.marks} marks]: ${q.text || q.question_text}`;
            if (q.type === 'mcq' && opts && typeof opts === 'object') {
              const optStr = Object.entries(opts).map(([k, v]) => `${k}) ${v}`).join('  ');
              line += `\n   Options: ${optStr}\n   Correct option: ${q.correct}`;
            }
            return line;
          }).join('\n\n');

          const answerPrompt = `You are a senior university examiner writing an official answer key. Write a complete, detailed model answer for EACH question below. The answers must be thorough enough to directly evaluate a student's written response.

QUESTIONS:
${questionLines}

ANSWER RULES (follow strictly):
- mcq: 1-2 sentences — state the correct option value and clearly explain WHY it is correct.
- short (up to 5 marks): Write 4-6 complete sentences. Cover every key point a student must mention to score full marks. Do NOT say "refer to textbook".
- numerical: Show the complete step-by-step solution — write every formula used, substitute values, show each calculation step, and clearly state the final numeric answer with units.
- long / case-study (10+ marks): Write a fully structured answer — (1) define key terms, (2) explain the concept in depth, (3) give a real-world example, (4) compare or analyse where relevant, (5) conclusion. Minimum 10 sentences.

Return ONLY this JSON object (no markdown fences, no extra text before or after):
{"answers":[{"idx":0,"answer":"..."},{"idx":1,"answer":"..."}]}`;

          const geminiResult = await callGemini([{ text: answerPrompt }], apiKey, 0.3);
          const generatedAnswers = geminiResult.answers || [];
          generatedAnswers.forEach(({ idx, answer }) => {
            if (typeof idx === 'number' && missing[idx]) {
              missing[idx].question.answer = answer || '';
            }
          });
          console.log(`[build-paper] Generated ${generatedAnswers.length} answers for ${missing.length} missing questions`);
        } catch (e) {
          console.warn('[build-paper] Answer generation failed:', e.message);
        }
      }
    }

    const computedTotal = paperQs.reduce((s, q) => s + q.marks, 0);
    const paperId = uuidv4();

    // Store extra metadata (examType, program, dept, template) in JSON store
    db.insert('paper_metadata', {
      id: uuidv4(),
      paperId,
      examType: examType || 'endterm',
      program: program || '',
      department: department || '',
      semester: semester || '',
      courseCode: syllabus.courseCode || '',
      courseName: syllabus.title || subject || title || '',
      templateConfig: templateConfig || {},
      notified: false,
      notifiedAt: null,
      createdAt: new Date().toISOString(),
    });

    // ── Persist paper ─────────────────────────────────────────────────────────
    if (pgdb.ready) {
      await pgdb.pool.query(
        `INSERT INTO exam_papers
           (id, title, subject, course_id, total_marks, duration_mins, instructions, exam_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          paperId,
          title,
          subject || syllabus.title,
          syllabus.courseId || null,
          totalMarks || computedTotal,
          parseInt(duration) || 180,
          instructions || '',
          examDate || null,
        ]
      );

      for (const pq of paperQs) {
        const q = pq.question;
        await pgdb.pool.query(
          `INSERT INTO exam_questions
             (id, paper_id, question_no, question_text, type, max_marks, section_label, rubric, answer)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            uuidv4(),
            paperId,
            pq.questionNo,
            q.text || q.question_text || '',
            q.type || 'short',
            pq.marks,
            pq.sectionLabel,
            q.rubric || '',
            q.answer || '',
          ]
        );
      }
    } else {
      db.insert('exam_papers', {
        id: paperId,
        title,
        subject: subject || syllabus.title,
        totalMarks: totalMarks || computedTotal,
        createdAt: new Date().toISOString(),
      });
    }

    res.status(201).json({
      paperId,
      title,
      subject: subject || syllabus.title,
      examDate,
      duration,
      instructions,
      totalMarks: computedTotal,
      questionsSelected: paperQs.length,
      cosCovered: [...cosCovered].filter(Boolean),
      examType,
      program,
      department,
      semester,
      templateConfig,
      sections: sections.map(sec => ({
        ...sec,
        selected: paperQs.filter(q => q.sectionLabel === sec.label).length,
      })),
      questions: paperQs.map(pq => {
        const q = pq.question;
        let opts = q.options;
        if (typeof opts === 'string') { try { opts = JSON.parse(opts); } catch { opts = null; } }
        return {
          questionNo:   pq.questionNo,
          sectionLabel: pq.sectionLabel,
          marks:        pq.marks,
          text:         q.text || q.question_text,
          type:         q.type,
          difficulty:   q.difficulty,
          co:           q.co,
          blooms:       q.blooms,
          options:      opts || null,
          correct:      q.correct || null,
          topic:        q.topic || null,
          answer:       q.answer || '',
        };
      }),
    });
  } catch (e) {
    console.error('[syllabus/build-paper]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;