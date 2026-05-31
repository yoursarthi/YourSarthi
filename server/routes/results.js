'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pgdb = require('../pgdb');
const { requireAuth, requireRole, extractUser } = require('../middleware/auth');
const { computeGrade } = require('../services/results/grading.service');

const router = express.Router();

// ── Result Components (master reference) ─────────────────────────────────────

router.get('/components', requireAuth, async (req, res) => {
  const r = await pgdb.pool.query(
    `SELECT * FROM result_components WHERE is_active = TRUE ORDER BY component_name`
  );
  res.json(r.rows);
});

router.post('/components', requireRole('admin'), async (req, res) => {
  const { component_name, default_weightage, max_marks, description } = req.body;
  if (!component_name) return res.status(400).json({ error: 'component_name required' });

  const r = await pgdb.pool.query(
    `INSERT INTO result_components (id, component_name, default_weightage, max_marks, description)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (component_name) DO UPDATE
       SET default_weightage = EXCLUDED.default_weightage,
           max_marks         = EXCLUDED.max_marks,
           description       = EXCLUDED.description,
           is_active         = TRUE
     RETURNING *`,
    [uuidv4(), component_name, default_weightage ?? 0, max_marks ?? 100, description || '']
  );
  res.status(201).json(r.rows[0]);
});

// ── Component Marks ───────────────────────────────────────────────────────────

// GET /api/results/marks?studentId=&courseId=&semester=&academicYear=&componentId=
router.get('/marks', requireAuth, async (req, res) => {
  const { studentId, courseId, semester, academicYear, componentId } = req.query;
  const user = extractUser(req);

  const conditions = ['1=1'];
  const params     = [];

  // Faculty can only see marks for their own courses
  if (user.role === 'faculty') {
    params.push(user.id);
    conditions.push(`cm.faculty_id = $${params.length}`);
  }
  // Students can only see their own marks
  if (user.role === 'student') {
    params.push(user.id);
    conditions.push(`cm.student_id = $${params.length}`);
  }

  if (studentId)    { params.push(studentId);    conditions.push(`cm.student_id  = $${params.length}`); }
  if (courseId)     { params.push(courseId);      conditions.push(`cm.course_id   = $${params.length}`); }
  if (semester)     { params.push(semester);      conditions.push(`cm.semester    = $${params.length}`); }
  if (academicYear) { params.push(academicYear);  conditions.push(`cm.academic_year = $${params.length}`); }
  if (componentId)  { params.push(componentId);   conditions.push(`cm.component_id = $${params.length}`); }

  const r = await pgdb.pool.query(
    `SELECT cm.*,
            rc.component_name,
            c.code  AS course_code,
            c.name  AS course_name,
            s.first_name || ' ' || s.last_name AS student_full_name,
            s.id        AS student_roll,
            s.enrollment_no
     FROM component_marks cm
     JOIN result_components rc ON rc.id = cm.component_id
     JOIN courses  c ON c.id = cm.course_id
     JOIN students s ON s.id = cm.student_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.first_name, c.name, rc.component_name`,
    params
  );

  // Add computed grade to each row
  const rows = r.rows.map(row => ({
    ...row,
    percentage: row.max_marks > 0
      ? Math.round((row.marks_obtained / row.max_marks) * 10000) / 100
      : 0,
    grade: row.max_marks > 0
      ? computeGrade((row.marks_obtained / row.max_marks) * 100)
      : 'F',
  }));
  res.json(rows);
});

// POST /api/results/marks — create single entry
router.post('/marks', requireRole('admin', 'faculty'), async (req, res) => {
  const user = extractUser(req);
  const {
    student_id, course_id, semester, academic_year,
    component_id, marks_obtained, max_marks,
    exam_session, remarks,
  } = req.body;

  if (!student_id || !course_id || !component_id || !semester || !academic_year) {
    return res.status(400).json({ error: 'student_id, course_id, component_id, semester, academic_year are required' });
  }
  if (parseFloat(marks_obtained) < 0 || parseFloat(marks_obtained) > parseFloat(max_marks ?? 100)) {
    return res.status(400).json({ error: 'marks_obtained must be between 0 and max_marks' });
  }

  const faculty_id = user.role === 'faculty' ? user.id : (req.body.faculty_id || null);

  try {
    const r = await pgdb.pool.query(
      `INSERT INTO component_marks
         (id, student_id, course_id, semester, academic_year, component_id,
          marks_obtained, max_marks, faculty_id, exam_session, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (student_id, course_id, semester, academic_year, component_id)
       DO UPDATE SET
         marks_obtained = EXCLUDED.marks_obtained,
         max_marks      = EXCLUDED.max_marks,
         faculty_id     = EXCLUDED.faculty_id,
         exam_session   = EXCLUDED.exam_session,
         remarks        = EXCLUDED.remarks,
         updated_at     = NOW()
       WHERE component_marks.is_locked = FALSE
       RETURNING *`,
      [
        uuidv4(), student_id, course_id, semester, academic_year,
        component_id, parseFloat(marks_obtained) || 0,
        parseInt(max_marks) || 100,
        faculty_id, exam_session || '', remarks || '',
      ]
    );
    if (!r.rows.length) return res.status(409).json({ error: 'Marks are locked and cannot be edited' });
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Marks already exist. Use PUT to update.' });
    throw e;
  }
});

// PUT /api/results/marks/:id
router.put('/marks/:id', requireRole('admin', 'faculty'), async (req, res) => {
  const user = extractUser(req);
  const { marks_obtained, max_marks, exam_session, remarks } = req.body;
  const { id } = req.params;

  const conditions = [`id = $1`, `is_locked = FALSE`];
  const params     = [id];

  if (user.role === 'faculty') {
    params.push(user.id);
    conditions.push(`faculty_id = $${params.length}`);
  }

  params.push(
    parseFloat(marks_obtained), parseInt(max_marks) || 100,
    exam_session || '', remarks || ''
  );
  const setBase = params.length - 3;

  const r = await pgdb.pool.query(
    `UPDATE component_marks
     SET marks_obtained = $${setBase}, max_marks = $${setBase + 1},
         exam_session   = $${setBase + 2}, remarks = $${setBase + 3},
         updated_at     = NOW()
     WHERE ${conditions.join(' AND ')}
     RETURNING *`,
    params
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Record not found, locked, or not yours' });
  res.json(r.rows[0]);
});

// DELETE /api/results/marks/:id — admin only
router.delete('/marks/:id', requireRole('admin'), async (req, res) => {
  const r = await pgdb.pool.query(
    `DELETE FROM component_marks WHERE id = $1 AND is_locked = FALSE RETURNING id`,
    [req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Not found or locked' });
  res.json({ deleted: true });
});

// PATCH /api/results/marks/:id/lock — admin only
router.patch('/marks/:id/lock', requireRole('admin'), async (req, res) => {
  const { locked } = req.body;
  const r = await pgdb.pool.query(
    `UPDATE component_marks SET is_locked = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [!!locked, req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

// ── Bulk CSV Import ───────────────────────────────────────────────────────────

/**
 * POST /api/results/marks/bulk
 * Body: { rows: [{ student_id, course_code, component_name, marks_obtained, max_marks,
 *                  semester, academic_year, remarks? }] }
 */
router.post('/marks/bulk', requireRole('admin', 'faculty'), async (req, res) => {
  const user = extractUser(req);
  const { rows } = req.body;
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(400).json({ error: 'rows array required' });
  }

  // Resolve course_code → course_id
  const codes    = [...new Set(rows.map(r => r.course_code).filter(Boolean))];
  const names    = [...new Set(rows.map(r => r.component_name).filter(Boolean))];

  const codeMap  = {};
  const compMap  = {};

  if (codes.length) {
    const cr = await pgdb.pool.query(
      `SELECT id, code FROM courses WHERE code = ANY($1)`, [codes]
    );
    cr.rows.forEach(c => { codeMap[c.code] = c.id; });
  }
  if (names.length) {
    const nr = await pgdb.pool.query(
      `SELECT id, component_name FROM result_components WHERE component_name = ANY($1)`, [names]
    );
    nr.rows.forEach(c => { compMap[c.component_name] = c.id; });
  }

  const results  = { inserted: 0, updated: 0, errors: [] };
  const faculty_id = user.role === 'faculty' ? user.id : null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const course_id    = codeMap[row.course_code];
    const component_id = compMap[row.component_name];

    if (!row.student_id)    { results.errors.push({ row: i + 1, error: 'missing student_id' }); continue; }
    if (!course_id)         { results.errors.push({ row: i + 1, error: `unknown course_code: ${row.course_code}` }); continue; }
    if (!component_id)      { results.errors.push({ row: i + 1, error: `unknown component_name: ${row.component_name}` }); continue; }
    if (!row.semester)      { results.errors.push({ row: i + 1, error: 'missing semester' }); continue; }
    if (!row.academic_year) { results.errors.push({ row: i + 1, error: 'missing academic_year' }); continue; }

    const maxM  = parseInt(row.max_marks)   || 100;
    const obtM  = parseFloat(row.marks_obtained) || 0;
    if (obtM < 0 || obtM > maxM) { results.errors.push({ row: i + 1, error: `marks_obtained ${obtM} out of range [0,${maxM}]` }); continue; }

    try {
      const r = await pgdb.pool.query(
        `INSERT INTO component_marks
           (id, student_id, course_id, semester, academic_year, component_id,
            marks_obtained, max_marks, faculty_id, exam_session, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (student_id, course_id, semester, academic_year, component_id)
         DO UPDATE SET
           marks_obtained = EXCLUDED.marks_obtained,
           max_marks      = EXCLUDED.max_marks,
           faculty_id     = COALESCE(EXCLUDED.faculty_id, component_marks.faculty_id),
           remarks        = EXCLUDED.remarks,
           updated_at     = NOW()
         WHERE component_marks.is_locked = FALSE
         RETURNING (xmax = 0) AS is_new`,
        [
          uuidv4(), row.student_id, course_id, row.semester, row.academic_year,
          component_id, obtM, maxM,
          faculty_id || row.faculty_id || null,
          row.exam_session || '', row.remarks || '',
        ]
      );
      if (r.rows.length) {
        r.rows[0].is_new ? results.inserted++ : results.updated++;
      }
    } catch (e) {
      results.errors.push({ row: i + 1, error: e.message });
    }
  }

  res.json(results);
});

// ── Student result summary (used by StudentPortal + Dashboard) ────────────────

router.get('/student/:studentId', requireAuth, async (req, res) => {
  const user = extractUser(req);
  const { studentId } = req.params;

  // Students can only view their own data
  if (user.role === 'student' && user.id !== studentId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { semester, academic_year } = req.query;
  const conditions = ['cm.student_id = $1'];
  const params     = [studentId];

  if (semester)     { params.push(semester);     conditions.push(`cm.semester = $${params.length}`); }
  if (academic_year){ params.push(academic_year); conditions.push(`cm.academic_year = $${params.length}`); }

  const r = await pgdb.pool.query(
    `SELECT cm.*,
            rc.component_name,
            c.code AS course_code, c.name AS course_name, c.credits
     FROM component_marks cm
     JOIN result_components rc ON rc.id = cm.component_id
     JOIN courses c ON c.id = cm.course_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY c.name, rc.component_name`,
    params
  );
  res.json(r.rows);
});

module.exports = router;
