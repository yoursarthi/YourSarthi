const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pgdb = require('../pgdb');
const db = require('../db');
const router = express.Router();

function now() { return new Date().toISOString(); }

// ─── Status ───────────────────────────────────────────────────────────────────
router.get('/status', (req, res) => res.json({ ready: true, pgConnected: pgdb.ready }));

// ─── Exam Papers ─────────────────────────────────────────────────────────────
router.post('/papers', async (req, res) => {
  const { title, subject, program, semester, questions, courseId } = req.body;
  const paperId = uuidv4();
  const totalMarks = (questions || []).reduce((s, q) => s + (parseInt(q.maxMarks) || 0), 0);

  if (pgdb.ready) {
    const client = await pgdb.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO exam_papers (id, title, subject, program, semester, total_marks, course_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [paperId, title || 'Untitled Exam', subject || '', program || '', semester || '', totalMarks,
         courseId || null]
      );
      for (let i = 0; i < (questions || []).length; i++) {
        const q = questions[i];
        await client.query(
          `INSERT INTO exam_questions (id, paper_id, question_no, question_text, max_marks, rubric, sub_sections)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [uuidv4(), paperId, q.questionNo || i + 1, q.text || '',
           parseInt(q.maxMarks) || 10, q.rubric || '', JSON.stringify(q.subSections || [])]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: e.message });
    } finally { client.release(); }
  } else {
    db.insert('exam_papers', { id: paperId, title: title || 'Untitled Exam', subject: subject || '', program: program || '', semester: semester || '', total_marks: totalMarks, course_id: courseId || null, created_at: now() });
    for (let i = 0; i < (questions || []).length; i++) {
      const q = questions[i];
      db.insert('exam_questions', { id: uuidv4(), paper_id: paperId, question_no: q.questionNo || i + 1, question_text: q.text || '', max_marks: parseInt(q.maxMarks) || 10, rubric: q.rubric || '', sub_sections: q.subSections || [], created_at: now() });
    }
  }
  res.status(201).json({ paperId, totalMarks, questionCount: (questions || []).length });
});

router.get('/papers', async (req, res) => {
  if (pgdb.ready) {
    const r = await pgdb.pool.query(
      `SELECT p.*, COALESCE(COUNT(DISTINCT q.id)::int,0) AS question_count, COALESCE(COUNT(DISTINCT sr.id)::int,0) AS student_count
       FROM exam_papers p LEFT JOIN exam_questions q ON q.paper_id=p.id LEFT JOIN student_results sr ON sr.paper_id=p.id
       GROUP BY p.id ORDER BY p.created_at DESC`
    );
    return res.json(r.rows);
  }
  const papers = db.all('exam_papers').slice().reverse();
  const questions = db.all('exam_questions');
  const results = db.all('student_results');
  res.json(papers.map(p => ({
    ...p,
    question_count: questions.filter(q => q.paper_id === p.id).length,
    student_count: results.filter(r => r.paper_id === p.id).length,
  })));
});

router.get('/papers/:id', async (req, res) => {
  if (pgdb.ready) {
    const p = await pgdb.pool.query('SELECT * FROM exam_papers WHERE id=$1', [req.params.id]);
    if (!p.rows.length) return res.status(404).json({ error: 'Paper not found' });
    const qs = await pgdb.pool.query('SELECT * FROM exam_questions WHERE paper_id=$1 ORDER BY question_no', [req.params.id]);
    return res.json({ ...p.rows[0], questions: qs.rows });
  }
  const paper = db.get('exam_papers', p => p.id === req.params.id);
  if (!paper) return res.status(404).json({ error: 'Paper not found' });
  const questions = db.all('exam_questions').filter(q => q.paper_id === req.params.id).sort((a, b) => a.question_no - b.question_no);
  res.json({ ...paper, questions });
});

// ─── Student Results ──────────────────────────────────────────────────────────
router.post('/results', async (req, res) => {
  const { paperId, studentName, rollNo, enrollmentNo, totalMarksObtained, maxMarks, percentage, grade,
    transcription, detailedFeedback, strengths, improvements, questionResponses } = req.body;
  const resultId = uuidv4();

  if (pgdb.ready) {
    // Optionally link result to a student record by enrollment number
    let studentId = null;
    if (enrollmentNo) {
      const sr = await pgdb.pool.query(`SELECT id FROM students WHERE id = $1 OR enrollment_no = $1`, [enrollmentNo]);
      studentId = sr.rows[0]?.id ?? null;
    }

    const client = await pgdb.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO student_results
           (id, paper_id, student_id, student_name, roll_no, enrollment_no,
            total_marks_obtained, max_marks, percentage, grade,
            transcription, detailed_feedback, strengths, improvements)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [resultId, paperId, studentId, studentName || '', rollNo || '', enrollmentNo || '',
         totalMarksObtained, maxMarks, percentage, grade,
         transcription || '', detailedFeedback || '',
         JSON.stringify(strengths || []), JSON.stringify(improvements || [])]
      );
      for (const qr of (questionResponses || [])) {
        await client.query(
          `INSERT INTO question_responses
             (id, result_id, question_no, question_text, marks_awarded, max_marks, feedback, sub_section_responses)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [uuidv4(), resultId, qr.questionNo, qr.questionText || '',
           qr.marksAwarded, qr.maxMarks, qr.feedback || '',
           JSON.stringify(qr.subSectionResponses || [])]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: e.message });
    } finally { client.release(); }
  } else {
    db.insert('student_results', {
      id: resultId, paper_id: paperId, student_name: studentName || '', roll_no: rollNo || '',
      enrollment_no: enrollmentNo || '', total_marks_obtained: totalMarksObtained,
      max_marks: maxMarks, percentage, grade, transcription: transcription || '',
      detailed_feedback: detailedFeedback || '', strengths: strengths || [],
      improvements: improvements || [], created_at: now(),
    });
    for (const qr of (questionResponses || [])) {
      db.insert('question_responses', {
        id: uuidv4(), result_id: resultId, question_no: qr.questionNo, question_text: qr.questionText || '',
        marks_awarded: qr.marksAwarded, max_marks: qr.maxMarks, feedback: qr.feedback || '',
        sub_section_responses: qr.subSectionResponses || [], created_at: now(),
      });
    }
  }
  res.status(201).json({ resultId });
});

router.get('/papers/:id/results', async (req, res) => {
  if (pgdb.ready) {
    const r = await pgdb.pool.query(
      `SELECT sr.*, EXISTS(SELECT 1 FROM marksheets ms WHERE ms.result_id=sr.id) AS has_marksheet
       FROM student_results sr WHERE sr.paper_id=$1 ORDER BY sr.created_at`,
      [req.params.id]
    );
    return res.json(r.rows);
  }
  const results = db.all('student_results').filter(r => r.paper_id === req.params.id);
  const marksheets = db.all('marksheets');
  res.json(results.map(r => ({ ...r, has_marksheet: !!marksheets.find(m => m.result_id === r.id) })));
});

// ─── Tabulation ───────────────────────────────────────────────────────────────
function buildTabulation(paper, questions, results, allResponses) {
  return results.map((r, i) => ({
    serialNo: i + 1,
    resultId: r.id,
    studentName: r.student_name,
    rollNo: r.roll_no,
    enrollmentNo: r.enrollment_no,
    questionMarks: questions.map(q => {
      const qno = q.question_no;
      const resp = allResponses.find(x => x.result_id === r.id && parseInt(x.question_no) === parseInt(qno));
      return { questionNo: qno, maxMarks: q.max_marks, marksAwarded: resp ? parseFloat(resp.marks_awarded) : 0, feedback: resp?.feedback || '' };
    }),
    totalMarksObtained: parseFloat(r.total_marks_obtained),
    maxMarks: r.max_marks,
    percentage: parseFloat(r.percentage),
    grade: r.grade,
  }));
}

router.get('/papers/:id/tabulation', async (req, res) => {
  if (pgdb.ready) {
    const [paper, qs, results] = await Promise.all([
      pgdb.pool.query('SELECT * FROM exam_papers WHERE id=$1', [req.params.id]),
      pgdb.pool.query('SELECT * FROM exam_questions WHERE paper_id=$1 ORDER BY question_no', [req.params.id]),
      pgdb.pool.query('SELECT * FROM student_results WHERE paper_id=$1 ORDER BY created_at', [req.params.id]),
    ]);
    if (!paper.rows.length) return res.status(404).json({ error: 'Paper not found' });
    const responses = results.rows.length
      ? await pgdb.pool.query(`SELECT qr.* FROM question_responses qr JOIN student_results sr ON sr.id=qr.result_id WHERE sr.paper_id=$1`, [req.params.id])
      : { rows: [] };
    return res.json({ paper: paper.rows[0], questions: qs.rows, tabulation: buildTabulation(paper.rows[0], qs.rows, results.rows, responses.rows) });
  }
  const paper = db.get('exam_papers', p => p.id === req.params.id);
  if (!paper) return res.status(404).json({ error: 'Paper not found' });
  const questions = db.all('exam_questions').filter(q => q.paper_id === req.params.id).sort((a, b) => a.question_no - b.question_no);
  const results = db.all('student_results').filter(r => r.paper_id === req.params.id);
  const allResponses = db.all('question_responses');
  res.json({ paper, questions, tabulation: buildTabulation(paper, questions, results, allResponses) });
});

router.get('/papers/:id/tabulation/export', async (req, res) => {
  let paper, questions, results, allResponses;
  if (pgdb.ready) {
    const [p, qs, rs] = await Promise.all([
      pgdb.pool.query('SELECT * FROM exam_papers WHERE id=$1', [req.params.id]),
      pgdb.pool.query('SELECT * FROM exam_questions WHERE paper_id=$1 ORDER BY question_no', [req.params.id]),
      pgdb.pool.query('SELECT * FROM student_results WHERE paper_id=$1 ORDER BY created_at', [req.params.id]),
    ]);
    if (!p.rows.length) return res.status(404).json({ error: 'Paper not found' });
    const resp = rs.rows.length ? await pgdb.pool.query(`SELECT qr.* FROM question_responses qr JOIN student_results sr ON sr.id=qr.result_id WHERE sr.paper_id=$1`, [req.params.id]) : { rows: [] };
    paper = p.rows[0]; questions = qs.rows; results = rs.rows; allResponses = resp.rows;
  } else {
    paper = db.get('exam_papers', p => p.id === req.params.id);
    if (!paper) return res.status(404).json({ error: 'Paper not found' });
    questions = db.all('exam_questions').filter(q => q.paper_id === req.params.id).sort((a, b) => a.question_no - b.question_no);
    results = db.all('student_results').filter(r => r.paper_id === req.params.id);
    allResponses = db.all('question_responses');
  }
  const tabulation = buildTabulation(paper, questions, results, allResponses);
  const qHeaders = questions.map(q => `Q${q.question_no}(/${q.max_marks})`);
  const rows = [['S.No', 'Student Name', 'Roll No', 'Enrollment No', ...qHeaders, `Total(/${paper.total_marks})`, 'Percentage', 'Grade'].join(',')];
  tabulation.forEach(row => {
    const qMarks = row.questionMarks.map(qm => qm.marksAwarded);
    rows.push([row.serialNo, `"${row.studentName}"`, row.rollNo, row.enrollmentNo, ...qMarks, row.totalMarksObtained, row.percentage + '%', row.grade].join(','));
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="tabulation_${req.params.id.slice(0, 8)}.csv"`);
  res.send(rows.join('\n'));
});

// ─── Marksheets ───────────────────────────────────────────────────────────────
router.post('/marksheets', async (req, res) => {
  const { resultId } = req.body;
  const code = 'ITM-' + uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
  const msId = uuidv4();

  if (pgdb.ready) {
    const existing = await pgdb.pool.query('SELECT * FROM marksheets WHERE result_id=$1', [resultId]);
    if (existing.rows.length) return res.json(existing.rows[0]);

    const r = await pgdb.pool.query('SELECT * FROM student_results WHERE id=$1', [resultId]);
    if (!r.rows.length) return res.status(404).json({ error: 'Result not found' });
    const result = r.rows[0];
    const paper = await pgdb.pool.query('SELECT * FROM exam_papers WHERE id=$1', [result.paper_id]);

    const ms = await pgdb.pool.query(
      `INSERT INTO marksheets
         (id, result_id, paper_id, student_name, roll_no, enrollment_no, program, semester, verification_code,
          total_marks, max_marks, percentage, overall_grade, result_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [msId, resultId, result.paper_id,
       result.student_name, result.roll_no, result.enrollment_no,
       paper.rows[0]?.program || '', paper.rows[0]?.semester || '',
       code,
       parseFloat(result.total_marks_obtained),
       result.max_marks,
       parseFloat(result.percentage),
       result.grade,
       ['O','A+','A','B+','B','C'].includes(result.grade) ? 'PASS' : 'FAIL']
    );
    return res.status(201).json(ms.rows[0]);
  }

  const existing = db.get('marksheets', m => m.result_id === resultId);
  if (existing) return res.json(existing);
  const result = db.get('student_results', r => r.id === resultId);
  if (!result) return res.status(404).json({ error: 'Result not found' });
  const paper = db.get('exam_papers', p => p.id === result.paper_id);
  const ms = {
    id: msId, result_id: resultId, paper_id: result.paper_id,
    student_name: result.student_name, roll_no: result.roll_no, enrollment_no: result.enrollment_no,
    program: paper?.program || '', semester: paper?.semester || '',
    verification_code: code, issued_at: now(),
  };
  db.insert('marksheets', ms);
  res.status(201).json(ms);
});

router.get('/marksheets/:resultId', async (req, res) => {
  if (pgdb.ready) {
    const r = await pgdb.pool.query(
      `SELECT ms.*, sr.total_marks_obtained, sr.max_marks, sr.percentage, sr.grade,
              sr.detailed_feedback, sr.strengths, sr.improvements,
              ep.title AS paper_title, ep.subject, ep.total_marks AS paper_total_marks
       FROM marksheets ms
       JOIN student_results sr ON sr.id=ms.result_id
       JOIN exam_papers ep ON ep.id=ms.paper_id
       WHERE ms.result_id=$1`,
      [req.params.resultId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Marksheet not found' });
    const responses = await pgdb.pool.query(
      `SELECT qr.question_no, qr.question_text, qr.marks_awarded, qr.max_marks, qr.feedback, qr.sub_section_responses
       FROM question_responses qr WHERE qr.result_id=$1 ORDER BY qr.question_no`,
      [req.params.resultId]
    );
    return res.json({ ...r.rows[0], questionResponses: responses.rows });
  }
  const ms = db.get('marksheets', m => m.result_id === req.params.resultId);
  if (!ms) return res.status(404).json({ error: 'Marksheet not found' });
  const result = db.get('student_results', r => r.id === req.params.resultId);
  const paper = db.get('exam_papers', p => p.id === ms.paper_id);
  const responses = db.all('question_responses').filter(qr => qr.result_id === req.params.resultId).sort((a, b) => a.question_no - b.question_no);
  res.json({
    ...ms,
    total_marks_obtained: result?.total_marks_obtained,
    max_marks: result?.max_marks, percentage: result?.percentage, grade: result?.grade,
    detailed_feedback: result?.detailed_feedback,
    strengths: result?.strengths, improvements: result?.improvements,
    paper_title: paper?.title, subject: paper?.subject, paper_total_marks: paper?.total_marks,
    questionResponses: responses,
  });
});

router.get('/marksheets/verify/:code', async (req, res) => {
  if (pgdb.ready) {
    const r = await pgdb.pool.query(
      `SELECT ms.*, sr.total_marks_obtained, sr.max_marks, sr.percentage, sr.grade, ep.title, ep.subject
       FROM marksheets ms JOIN student_results sr ON sr.id=ms.result_id JOIN exam_papers ep ON ep.id=ms.paper_id
       WHERE ms.verification_code=$1`,
      [req.params.code]
    );
    if (!r.rows.length) return res.status(404).json({ valid: false, message: 'Code not found' });
    return res.json({ valid: true, ...r.rows[0] });
  }
  const ms = db.get('marksheets', m => m.verification_code === req.params.code);
  if (!ms) return res.status(404).json({ valid: false, message: 'Code not found' });
  const result = db.get('student_results', r => r.id === ms.result_id);
  const paper = db.get('exam_papers', p => p.id === ms.paper_id);
  res.json({ valid: true, ...ms, total_marks_obtained: result?.total_marks_obtained, max_marks: result?.max_marks, percentage: result?.percentage, grade: result?.grade, title: paper?.title, subject: paper?.subject });
});

// ─── Results — filtered by course / paper / student ─────────────────────────
router.get('/results', async (req, res) => {
  const { course_id, paper_id, student_id, limit = 200 } = req.query;
  try {
    if (pgdb.ready) {
      const conditions = [];
      const values = [];
      if (course_id)  { conditions.push(`ep.course_id = $${values.length + 1}`);  values.push(course_id); }
      if (paper_id)   { conditions.push(`sr.paper_id = $${values.length + 1}`);   values.push(paper_id); }
      if (student_id) { conditions.push(`sr.student_id = $${values.length + 1}`); values.push(student_id); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const r = await pgdb.pool.query(
        `SELECT
           sr.id, sr.paper_id, sr.student_id, sr.student_name, sr.roll_no, sr.enrollment_no,
           sr.total_marks_obtained, sr.max_marks, sr.percentage, sr.grade, sr.created_at,
           ep.title AS paper_title, ep.subject, ep.program, ep.semester, ep.course_id,
           c.name  AS course_name, c.code AS course_code
         FROM student_results sr
         JOIN exam_papers ep ON ep.id = sr.paper_id
         LEFT JOIN courses c ON c.id = ep.course_id
         ${where}
         ORDER BY sr.created_at DESC
         LIMIT $${values.length + 1}`,
        [...values, parseInt(limit)]
      );
      return res.json(r.rows);
    }
    let results = db.all('student_results').slice().reverse();
    const papers  = db.all('exam_papers');
    const courses = db.all('courses');
    if (paper_id)   results = results.filter(r => r.paper_id === paper_id);
    if (student_id) results = results.filter(r => r.student_id === student_id);
    res.json(results.slice(0, parseInt(limit)).map(r => {
      const ep = papers.find(p => p.id === r.paper_id) || {};
      const co = courses.find(c => c.id === ep.course_id) || {};
      return { ...r, paper_title: ep.title, subject: ep.subject, program: ep.program,
               semester: ep.semester, course_id: ep.course_id, course_name: co.name, course_code: co.code };
    }));
  } catch (err) {
    console.error('[exams] GET /results error:', err.message);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// ─── Per-student result detail with question responses ───────────────────────
router.get('/results/:id', async (req, res) => {
  try {
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        `SELECT sr.*, ep.title AS paper_title, ep.subject, ep.program, ep.semester, ep.course_id
         FROM student_results sr JOIN exam_papers ep ON ep.id = sr.paper_id
         WHERE sr.id = $1`, [req.params.id]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Result not found' });
      const qr = await pgdb.pool.query(
        'SELECT * FROM question_responses WHERE result_id = $1 ORDER BY question_no',
        [req.params.id]
      );
      return res.json({ ...r.rows[0], questionResponses: qr.rows });
    }
    const result = db.get('student_results', r => r.id === req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found' });
    const responses = db.all('question_responses').filter(qr => qr.result_id === req.params.id);
    res.json({ ...result, questionResponses: responses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

module.exports = router;
