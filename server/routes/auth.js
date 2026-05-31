const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db   = require('../db');
const pgdb = require('../pgdb');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ─── POST /login ──────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  if (pgdb.ready) {
    try {
      const ur = await pgdb.pool.query(
        `SELECT id, email, name, role FROM users
         WHERE email = $1 AND crypt($2, password_hash) = password_hash AND is_active = TRUE`,
        [email, password]
      );
      if (ur.rows.length) {
        const u = ur.rows[0];
        return res.json({ id: u.id, email: u.email, name: u.name, role: u.role });
      }
    } catch (e) {
      console.warn('[auth] PG user lookup failed:', e.message);
    }

    try {
      const sr = await pgdb.pool.query(
        `SELECT s.id, s.email, s.first_name, s.last_name, s.status,
                s.batch, s.enrollment_no,
                d.name AS department_name, p.name AS program_name
         FROM students s
         LEFT JOIN departments d ON s.department_id = d.id
         LEFT JOIN programs    p ON s.program_id    = p.id
         WHERE s.email = $1 AND s.id = $2 AND s.status = 'active'`,
        [email, password]
      );
      if (sr.rows.length) {
        const s = sr.rows[0];
        return res.json({
          id: s.id, email: s.email,
          name: `${s.first_name} ${s.last_name}`,
          role: 'student', studentId: s.id,
          department: s.department_name || '',
          program: s.program_name || '',
          batch: s.batch,
        });
      }
    } catch (e) {
      console.warn('[auth] PG student lookup failed:', e.message);
    }

    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // JSON fallback
  const user = db.get('users', u => u.email === email && u.password === password);
  if (user) return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });

  const student = db.get('students', s => s.email === email && s.id === password && s.status === 'active');
  if (student) {
    return res.json({
      id: student.id, email: student.email,
      name: `${student.firstName} ${student.lastName}`,
      role: 'student', studentId: student.id,
      department: student.department, program: student.program, batch: student.batch,
    });
  }

  res.status(401).json({ error: 'Invalid credentials.' });
});

// ─── GET /users/moderators  (admin only) ──────────────────────────────────────
router.get('/users/moderators', requireAdmin, async (req, res) => {
  try {
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        `SELECT id, email, name, role, is_active, created_at
         FROM users WHERE role = 'moderator' ORDER BY name`
      );
      return res.json({ moderators: r.rows });
    }
    const mods = db.all('users').filter(u => u.role === 'moderator');
    res.json({ moderators: mods });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /users/moderators  (admin only — create moderator account) ──────────
router.post('/users/moderators', requireAdmin, async (req, res) => {
  const { name, email, password, department } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const id = uuidv4();
  try {
    if (pgdb.ready) {
      await pgdb.pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, crypt($4, gen_salt('bf')), 'moderator', TRUE)`,
        [id, name, email, password]
      );
      const r = await pgdb.pool.query(`SELECT id, name, email, role FROM users WHERE id = $1`, [id]);
      return res.status(201).json({ moderator: r.rows[0] });
    }

    // JSON fallback
    if (db.get('users', u => u.email === email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const mod = { id, name, email, password, role: 'moderator', department: department || '', createdAt: new Date().toISOString() };
    db.insert('users', mod);
    res.status(201).json({ moderator: { id, name, email, role: 'moderator' } });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: e.message });
  }
});

// ─── PATCH /users/moderators/:id  (admin only — toggle active status) ─────────
router.patch('/users/moderators/:id', requireAdmin, async (req, res) => {
  const { is_active } = req.body;
  try {
    if (pgdb.ready) {
      await pgdb.pool.query(
        `UPDATE users SET is_active = $1 WHERE id = $2 AND role = 'moderator'`,
        [is_active !== false, req.params.id]
      );
      return res.json({ success: true });
    }
    db.update('users', u => u.id === req.params.id, u => ({ ...u, isActive: is_active !== false }));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
