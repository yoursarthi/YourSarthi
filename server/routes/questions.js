const express = require('express');
const db = require('../db');
const pgdb = require('../pgdb');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

function mapQuestion(row) {
  return {
    id: row.id,
    course: row.course_code || '',
    courseName: row.course_name || '',
    type: row.type,
    topic: row.topic || '',
    difficulty: row.difficulty,
    co: row.co || '',
    po: row.po || '',
    blooms: row.blooms || '',
    text: row.text,
    options: row.options || null,
    correct: row.correct || null,
    marks: row.marks,
    createdAt: row.created_at,
  };
}

// ─── GET all ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { courseId, course } = req.query;
  if (pgdb.ready) {
    const conditions = [];
    const params = [];
    if (courseId) { params.push(courseId); conditions.push(`course_id = $${params.length}`); }
    if (course)   { params.push(course);   conditions.push(`course_code = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const r = await pgdb.pool.query(`SELECT * FROM questions ${where} ORDER BY created_at DESC`, params);
    return res.json(r.rows.map(mapQuestion));
  }
  let all = db.all('questions').slice().reverse();
  if (course) all = all.filter(q => q.course === course);
  res.json(all);
});

// ─── POST create ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { course, courseCode, courseId, courseName, type, topic, difficulty, co, po, blooms, text, options, correct, marks, answer } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  if (pgdb.ready) {
    const id = uuidv4();
    // Accept explicit courseId or look up from code
    const courseCodeResolved = course || courseCode || '';
    const courseRow = courseId ? null : await pgdb.getCourseByCode(courseCodeResolved);
    const validTypes = ['mcq', 'short', 'long', 'numerical', 'case-study'];
    const validDiff = ['easy', 'medium', 'hard'];
    const validBlooms = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create', ''];

    await pgdb.pool.query(
      `INSERT INTO questions (id, course_id, course_code, course_name, type, topic, difficulty, co, po, blooms, text, options, correct, marks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        id,
        courseId || courseRow?.id || null,
        courseCodeResolved,
        courseName || courseRow?.name || '',
        validTypes.includes(type) ? type : 'short',
        topic || '',
        validDiff.includes(difficulty) ? difficulty : 'medium',
        co || '', po || '',
        validBlooms.includes(blooms) ? blooms : '',
        text,
        options ? JSON.stringify(options) : null,
        correct || null,
        parseInt(marks) || 1,
      ]
    );
    const created = await pgdb.pool.query('SELECT * FROM questions WHERE id = $1', [id]);
    return res.status(201).json(mapQuestion(created.rows[0]));
  }

  const qid = `Q${String(db.count('questions') + 1).padStart(3, '0')}`;
  const q = db.insert('questions', {
    id: qid, course, courseName: courseName || course, type, topic, difficulty,
    co, blooms, text, options: options || null, correct: correct || null,
    marks: marks || 1, createdAt: new Date().toISOString(),
  });
  res.status(201).json(q);
});

// ─── DELETE ──────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  if (pgdb.ready) {
    await pgdb.pool.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
    return res.json({ ok: true });
  }
  db.remove('questions', q => q.id === req.params.id);
  res.json({ ok: true });
});

// ─── Generate paper ──────────────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  const { courseCode, sections } = req.body;

  if (pgdb.ready) {
    // Fetch all questions for this course code
    const allR = await pgdb.pool.query(
      `SELECT * FROM questions WHERE course_code = $1`,
      [courseCode]
    );
    const all = allR.rows.map(mapQuestion);
    const warnings = [];
    const paper = sections.map(sec => {
      const pool = all.filter(q =>
        q.type === sec.type && (!sec.difficulty || q.difficulty === sec.difficulty)
      );
      const selected = pool.sort(() => Math.random() - 0.5).slice(0, sec.count);
      if (pool.length < sec.count) {
        warnings.push(`Section "${sec.type}" (${sec.difficulty || 'any difficulty'}): requested ${sec.count} but only ${pool.length} available`);
      }
      return { ...sec, questions: selected, available: pool.length, requested: sec.count };
    });
    return res.json({ courseCode, paper, warnings, generatedAt: new Date().toISOString() });
  }

  const all = db.all('questions').filter(q => q.course === courseCode);
  const warnings = [];
  const paper = sections.map(sec => {
    const pool = all.filter(q => q.type === sec.type && (!sec.difficulty || q.difficulty === sec.difficulty));
    const selected = pool.sort(() => Math.random() - 0.5).slice(0, sec.count);
    if (pool.length < sec.count) {
      warnings.push(`Section "${sec.type}" (${sec.difficulty || 'any difficulty'}): requested ${sec.count} but only ${pool.length} available`);
    }
    return { ...sec, questions: selected, available: pool.length, requested: sec.count };
  });
  res.json({ courseCode, paper, warnings, generatedAt: new Date().toISOString() });
});

module.exports = router;
