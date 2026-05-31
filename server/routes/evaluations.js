const express = require('express');
const db = require('../db');
const pgdb = require('../pgdb');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// ─── Sessions ────────────────────────────────────────────────────────────────

router.post('/sessions', async (req, res) => {
  const { subject, maxMarks, rubric, modelAnswer, students, courseId } = req.body;
  const id = uuidv4();

  if (pgdb.ready) {
    await pgdb.pool.query(
      `INSERT INTO eval_sessions (id, name, subject, max_marks) VALUES ($1,$2,$3,$4)`,
      [id, subject || 'Unnamed Session', subject || '', parseInt(maxMarks) || 100]
    );
    return res.status(201).json({ sessionId: id, total: Array.isArray(students) ? students.length : 0 });
  }

  db.insert('eval_sessions', {
    id, subject: subject || '', maxMarks: maxMarks || 10,
    rubric: rubric || '', modelAnswer: modelAnswer || '',
    courseId: courseId || '', createdAt: new Date().toISOString(),
  });
  res.status(201).json({ sessionId: id, total: Array.isArray(students) ? students.length : 0 });
});

router.get('/sessions', async (req, res) => {
  if (pgdb.ready) {
    const r = await pgdb.pool.query(`SELECT * FROM eval_sessions ORDER BY created_at DESC`);
    return res.json(r.rows);
  }
  res.json(db.all('eval_sessions').slice().reverse());
});

router.get('/sessions/:id', async (req, res) => {
  if (pgdb.ready) {
    const session = await pgdb.pool.query(`SELECT * FROM eval_sessions WHERE id = $1`, [req.params.id]);
    if (!session.rows.length) return res.status(404).json({ error: 'Session not found' });
    const evals = await pgdb.pool.query(
      `SELECT sr.*, ep.subject FROM student_results sr
       LEFT JOIN exam_papers ep ON sr.paper_id = ep.id
       WHERE sr.session_id = $1`,
      [req.params.id]
    );
    return res.json({ ...session.rows[0], evaluations: evals.rows });
  }

  const session = db.get('eval_sessions', s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const evals = db.all('evaluations').filter(e => e.sessionId === req.params.id);
  res.json({ ...session, evaluations: evals });
});

router.get('/sessions/:id/export', async (req, res) => {
  let evals;
  if (pgdb.ready) {
    const r = await pgdb.pool.query(
      `SELECT sr.student_name, sr.roll_no, sr.total_marks_obtained AS marks_awarded,
              sr.max_marks, sr.percentage, sr.grade,
              sr.strengths, sr.improvements
       FROM student_results sr WHERE sr.session_id = $1`,
      [req.params.id]
    );
    evals = r.rows.map(e => ({
      studentName: e.student_name, rollNo: e.roll_no,
      marksAwarded: e.marks_awarded, maxMarks: e.max_marks,
      percentage: e.percentage, grade: e.grade,
      strengths: e.strengths || [], improvements: e.improvements || [],
    }));
  } else {
    evals = db.all('evaluations').filter(e => e.sessionId === req.params.id && e.status === 'done');
  }

  if (!evals.length) return res.status(404).json({ error: 'No results' });
  const rows = [['Name', 'Roll No', 'Marks', 'Max', 'Percentage', 'Grade', 'Strengths', 'Improvements'].join(',')];
  for (const e of evals) {
    const str = Array.isArray(e.strengths) ? e.strengths.join('; ') : '';
    const imp = Array.isArray(e.improvements) ? e.improvements.join('; ') : '';
    rows.push([e.studentName, e.rollNo, e.marksAwarded, e.maxMarks, e.percentage, e.grade, `"${str}"`, `"${imp}"`].join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="session_${req.params.id.slice(0, 8)}.csv"`);
  res.send(rows.join('\n'));
});

// ─── Results ─────────────────────────────────────────────────────────────────

// Save a single-student eval result (called from Evaluation.jsx)
router.post('/results', async (req, res) => {
  const { sessionId, studentName, rollNo, result } = req.body;
  const id = uuidv4();

  if (pgdb.ready) {
    // We need a paper_id; if not provided we store without it (nullable FK)
    await pgdb.pool.query(
      `INSERT INTO student_results
         (id, session_id, student_name, roll_no,
          total_marks_obtained, max_marks, percentage, grade,
          transcription, detailed_feedback, strengths, improvements,
          comparison_notes, teacher_note, needs_review)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id, sessionId || null, studentName || '', rollNo || '',
        result.marksAwarded || result.totalMarksAwarded || 0,
        result.maxMarks || result.totalMaxMarks || 0,
        result.percentage || 0, result.grade || 'F',
        result.transcription || '', result.detailedFeedback || '',
        JSON.stringify(result.strengths || []),
        JSON.stringify(result.improvements || []),
        result.comparisonNotes || '', result.teacherNote || '', false,
      ]
    );
    return res.status(201).json({ id });
  }

  db.insert('evaluations', {
    id, sessionId: sessionId || '', studentName: studentName || '', rollNo: rollNo || '',
    marksAwarded: result.marksAwarded, maxMarks: result.maxMarks,
    grade: result.grade, percentage: result.percentage,
    transcription: result.transcription || '', detailedFeedback: result.detailedFeedback || '',
    criteria: result.criteria || [], strengths: result.strengths || [],
    improvements: result.improvements || [], comparisonNotes: result.comparisonNotes || '',
    teacherNote: result.teacherNote || '', needsReview: false, status: 'done',
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ id });
});

// Get all results (used by EvalHistory tab and StudentPortal)
router.get('/results', async (req, res) => {
  if (pgdb.ready) {
    const r = await pgdb.pool.query(
      `SELECT sr.id, sr.student_name AS "studentName", sr.roll_no AS "rollNo",
              sr.total_marks_obtained AS "marksAwarded", sr.max_marks AS "maxMarks",
              sr.percentage, sr.grade, sr.created_at,
              ep.subject, ep.title
       FROM student_results sr
       LEFT JOIN exam_papers ep ON sr.paper_id = ep.id
       ORDER BY sr.created_at DESC`
    );
    return res.json(r.rows);
  }

  const evals = db.all('evaluations').filter(e => e.status === 'done').slice().reverse();
  const sessions = db.all('eval_sessions');
  res.json(evals.map(e => {
    const s = sessions.find(x => x.id === e.sessionId);
    return { ...e, subject: s?.subject || '', courseId: s?.courseId || '' };
  }));
});

router.patch('/results/:id/review', async (req, res) => {
  if (pgdb.ready) {
    await pgdb.pool.query(
      `UPDATE student_results SET needs_review = $1 WHERE id = $2`,
      [req.body.needsReview, req.params.id]
    );
    return res.json({ ok: true });
  }
  db.update('evaluations', e => e.id === req.params.id, () => ({ needsReview: req.body.needsReview }));
  res.json({ ok: true });
});

module.exports = router;
