const express = require('express');
const db = require('../db');
const pgdb = require('../pgdb');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

function mapCourse(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    department: row.department_name || '',
    credits: row.credits,
    type: row.type,
    maxStudents: row.max_students,
    enrolled: parseInt(row.enrolled_count ?? row.enrolled ?? 0),
    semester: row.semester,
    description: row.description || '',
    isActive: row.is_active !== false,
    createdAt: row.created_at,
  };
}

const COURSE_SELECT = `
  SELECT c.*,
    d.name AS department_name,
    COUNT(DISTINCT ce.student_id) AS enrolled_count
  FROM courses c
  LEFT JOIN departments d ON c.department_id = d.id
  LEFT JOIN course_enrollments ce ON ce.course_id = c.id AND ce.status = 'enrolled'
  GROUP BY c.id, d.name
`;

function genId() { return `ITMCRS${String(db.count('courses') + 1).padStart(3, '0')}`; }

// ─── GET all ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  if (pgdb.ready) {
    const r = await pgdb.pool.query(COURSE_SELECT + ' ORDER BY c.created_at DESC');
    return res.json(r.rows.map(mapCourse));
  }
  res.json(db.all('courses').slice().reverse());
});

// ─── POST create ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { code, name, department, credits, type, maxStudents, semester, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  if (!code) return res.status(400).json({ error: 'code required' });

  if (pgdb.ready) {
    const countR = await pgdb.pool.query('SELECT COUNT(*) FROM courses');
    const id = `ITMCRS${String(parseInt(countR.rows[0].count) + 1).padStart(3, '0')}`;
    const deptId = await pgdb.getDeptId(department);

    await pgdb.pool.query(
      `INSERT INTO courses (id, code, name, department_id, credits, type, max_students, semester, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, code.toUpperCase(), name, deptId, credits || 3,
       type || 'Core', maxStudents || 60, semester || '1st', description || '']
    );
    const created = await pgdb.pool.query(COURSE_SELECT + ' WHERE c.id = $1', [id]);
    return res.status(201).json(mapCourse(created.rows[0]));
  }

  const c = db.insert('courses', {
    id: genId(), code: code || '', name, department: department || '',
    credits: credits || 3, type: type || 'Core', maxStudents: maxStudents || 60,
    enrolled: 0, semester: semester || '1st', description: description || '',
    createdAt: new Date().toISOString(),
  });
  res.status(201).json(c);
});

// ─── PUT update ──────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { code, name, department, credits, type, maxStudents, semester, description } = req.body;

  if (pgdb.ready) {
    const deptId = department ? await pgdb.getDeptId(department) : undefined;
    const fields = [
      ['code', code?.toUpperCase()],
      ['name', name],
      ['department_id', deptId],
      ['credits', credits],
      ['type', type],
      ['max_students', maxStudents],
      ['semester', semester],
      ['description', description],
    ].filter(([, v]) => v !== undefined);

    if (fields.length) {
      const setClauses = fields.map(([col], i) => `${col} = $${i + 1}`).join(', ');
      const values = [...fields.map(([, v]) => v), req.params.id];
      await pgdb.pool.query(`UPDATE courses SET ${setClauses} WHERE id = $${values.length}`, values);
    }
    const updated = await pgdb.pool.query(COURSE_SELECT + ' WHERE c.id = $1', [req.params.id]);
    if (!updated.rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(mapCourse(updated.rows[0]));
  }

  const u = db.update('courses', c => c.id === req.params.id, () => req.body);
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json(u);
});

// ─── DELETE ──────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  if (pgdb.ready) {
    await pgdb.pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
    return res.json({ ok: true });
  }
  db.remove('courses', c => c.id === req.params.id);
  res.json({ ok: true });
});

// ─── LMS Resources ───────────────────────────────────────────────────────────
router.get('/:id/resources', async (req, res) => {
  if (pgdb.ready) {
    const r = await pgdb.pool.query(
      `SELECT * FROM lms_resources WHERE course_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    return res.json(r.rows.map(row => ({
      id: row.id, courseId: row.course_id, title: row.title, type: row.type,
      url: row.url || '', uploadedBy: row.uploader_name || '',
      dueDate: row.due_date || '', createdAt: row.created_at,
    })));
  }
  res.json(db.all('lms_resources').filter(r => r.courseId === req.params.id));
});

router.post('/:id/resources', async (req, res) => {
  const { title, type, url, uploadedBy, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  if (pgdb.ready) {
    const id = uuidv4();
    // Validate type against schema constraint
    const validTypes = ['pdf', 'video', 'assignment', 'link', 'document', 'other'];
    const resType = validTypes.includes(type) ? type : 'other';
    await pgdb.pool.query(
      `INSERT INTO lms_resources (id, course_id, title, type, url, uploader_name, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, req.params.id, title, resType, url || '', uploadedBy || '', dueDate || null]
    );
    return res.status(201).json({
      id, courseId: req.params.id, title, type: resType, url: url || '',
      uploadedBy: uploadedBy || '', dueDate: dueDate || '', createdAt: new Date().toISOString(),
    });
  }

  const r = db.insert('lms_resources', {
    id: uuidv4(), courseId: req.params.id, title, type, url: url || '',
    uploadedBy: uploadedBy || '', dueDate: dueDate || '', createdAt: new Date().toISOString(),
  });
  res.status(201).json(r);
});

// ─── LMS Announcements ───────────────────────────────────────────────────────
router.get('/:id/announcements', async (req, res) => {
  if (pgdb.ready) {
    const r = await pgdb.pool.query(
      `SELECT * FROM lms_announcements WHERE course_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    return res.json(r.rows.map(row => ({
      id: row.id, courseId: row.course_id, title: row.title, content: row.content || '',
      author: row.author_name || '', audience: row.audience || 'all',
      isPinned: row.is_pinned, createdAt: row.created_at,
    })));
  }
  res.json(db.all('lms_announcements').filter(a => a.courseId === req.params.id));
});

router.post('/:id/announcements', async (req, res) => {
  const { title, content, author, audience } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  if (pgdb.ready) {
    const id = uuidv4();
    const validAudiences = ['all', 'faculty', 'students'];
    const aud = validAudiences.includes(audience) ? audience : 'all';
    await pgdb.pool.query(
      `INSERT INTO lms_announcements (id, course_id, title, content, author_name, audience)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, req.params.id, title, content || '', author || '', aud]
    );
    return res.status(201).json({
      id, courseId: req.params.id, title, content: content || '',
      author: author || '', audience: aud, createdAt: new Date().toISOString(),
    });
  }

  const a = db.insert('lms_announcements', {
    id: uuidv4(), courseId: req.params.id, title, content: content || '',
    author: author || '', audience: audience || 'all', createdAt: new Date().toISOString(),
  });
  res.status(201).json(a);
});

module.exports = router;
