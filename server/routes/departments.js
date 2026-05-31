const express = require('express');
const db = require('../db');
const pgdb = require('../pgdb');
const router = express.Router();

function mapDept(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code || '',
    hod: row.hod_name || '',
    createdAt: row.created_at,
  };
}

// ─── GET all ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  if (pgdb.ready) {
    const r = await pgdb.pool.query(
      `SELECT d.*, f.name AS hod_name
       FROM departments d
       LEFT JOIN faculty f ON d.hod_id = f.id
       ORDER BY d.name`
    );
    return res.json(r.rows.map(mapDept));
  }
  res.json(db.all('departments').sort((a, b) => a.name.localeCompare(b.name)));
});

// ─── POST create ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, code, hod } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  if (!code) return res.status(400).json({ error: 'code required' });

  if (pgdb.ready) {
    const countR = await pgdb.pool.query('SELECT COUNT(*) FROM departments');
    const id = `ITMDEP${String(parseInt(countR.rows[0].count) + 1).padStart(3, '0')}`;
    const r = await pgdb.pool.query(
      `INSERT INTO departments (id, name, code) VALUES ($1,$2,$3) RETURNING *`,
      [id, name, code.toUpperCase()]
    );
    return res.status(201).json(mapDept({ ...r.rows[0], hod_name: hod || '' }));
  }

  const id = `ITMDEP${String(db.count('departments') + 1).padStart(3, '0')}`;
  const d = db.insert('departments', { id, name, code: code || '', hod: hod || 'TBD', createdAt: new Date().toISOString() });
  res.status(201).json(d);
});

// ─── DELETE ──────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  if (pgdb.ready) {
    await pgdb.pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    return res.json({ ok: true });
  }
  db.remove('departments', d => d.id === req.params.id);
  res.json({ ok: true });
});

module.exports = router;
