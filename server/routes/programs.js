const express = require('express');
const pgdb = require('../pgdb');
const router = express.Router();

// const JSON_FALLBACK = [
//   'B.Tech CSE', 'B.Tech ECE', 'B.Tech ME', 'B.Tech EE',
//   'BBA', 'MBA', 'BCA', 'MCA', 'B.Sc (Hons)', 'BA LLB', 'LLM',
// ];

// GET all programs
router.get('/', async (req, res) => {
  if (pgdb.ready) {
    const r = await pgdb.pool.query(
      `SELECT id, name, short_name, department_id, duration_years, total_semesters, is_active
       FROM programs
       WHERE is_active = true
       ORDER BY name`
    );
    return res.json(r.rows.map(p => ({ id: p.id, name: p.name, shortName: p.short_name, departmentId: p.department_id, durationYears: p.duration_years, isActive: p.is_active })));
  }
  res.json(JSON_FALLBACK.map((name, i) => ({ id: `prog-${i}`, name })));
});

// POST create
router.post('/', async (req, res) => {
  const { name, shortName, departmentId, durationYears, totalSemesters } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  if (pgdb.ready) {
    const r = await pgdb.pool.query(
      `INSERT INTO programs (name, short_name, department_id, duration_years, total_semesters)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, shortName || '', departmentId || null, durationYears || 4, totalSemesters || 8]
    );
    const p = r.rows[0];
    return res.status(201).json({ id: p.id, name: p.name, shortName: p.short_name, departmentId: p.department_id, durationYears: p.duration_years, isActive: p.is_active });
  }
  res.status(503).json({ error: 'PostgreSQL required to add programs' });
});

// DELETE
router.delete('/:id', async (req, res) => {
  if (pgdb.ready) {
    await pgdb.pool.query('UPDATE programs SET is_active = false WHERE id = $1', [req.params.id]);
    return res.json({ ok: true });
  }
  res.status(503).json({ error: 'PostgreSQL required' });
});

module.exports = router;
