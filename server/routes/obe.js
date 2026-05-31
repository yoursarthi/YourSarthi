const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pgdb = require('../pgdb');
const { requireAuth, requireRole } = require('../middleware/auth');
const svc = require('../services/obe/attainment.service');

const NBA_POS = [
  { po_code: 'PO1',  po_description: 'Engineering Knowledge: Apply knowledge of mathematics, science, engineering fundamentals and an engineering specialization.' },
  { po_code: 'PO2',  po_description: 'Problem Analysis: Identify, formulate, research literature and analyse complex engineering problems.' },
  { po_code: 'PO3',  po_description: 'Design/Development of Solutions: Design solutions for complex engineering problems.' },
  { po_code: 'PO4',  po_description: 'Conduct Investigations of Complex Problems: Use research-based knowledge and methods.' },
  { po_code: 'PO5',  po_description: 'Modern Tool Usage: Create, select and apply appropriate techniques, resources and tools.' },
  { po_code: 'PO6',  po_description: 'The Engineer and Society: Apply reasoning to assess societal, health, safety, legal and cultural issues.' },
  { po_code: 'PO7',  po_description: 'Environment and Sustainability: Understand the impact of professional engineering solutions.' },
  { po_code: 'PO8',  po_description: 'Ethics: Apply ethical principles and commit to professional ethics and responsibilities.' },
  { po_code: 'PO9',  po_description: 'Individual and Team Work: Function effectively as an individual, and as a member or leader in diverse teams.' },
  { po_code: 'PO10', po_description: 'Communication: Communicate effectively on complex engineering activities.' },
  { po_code: 'PO11', po_description: 'Project Management and Finance: Demonstrate knowledge and understanding of engineering management principles.' },
  { po_code: 'PO12', po_description: 'Life-long Learning: Recognize the need for, and have the preparation and ability to engage in independent and life-long learning.' },
];

function pgOK(res) {
  if (!pgdb.ready) { res.status(503).json({ error: 'Database not available' }); return false; }
  return true;
}

// ── Course Outcomes ──────────────────────────────────────────────────────────

router.get('/courses/:courseId/outcomes', requireAuth, async (req, res) => {
  if (!pgOK(res)) return;
  try {
    const rows = await pgdb.pool.query(
      'SELECT * FROM course_outcomes WHERE course_id = $1 ORDER BY co_code',
      [req.params.courseId]
    );
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/courses/:courseId/outcomes', requireRole('admin', 'faculty'), async (req, res) => {
  if (!pgOK(res)) return;
  const { co_code, co_description = '', bloom_level = '', target_attainment = 2 } = req.body;
  if (!co_code) return res.status(400).json({ error: 'co_code required' });
  try {
    const r = await pgdb.pool.query(
      `INSERT INTO course_outcomes (id, course_id, co_code, co_description, bloom_level, target_attainment)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uuidv4(), req.params.courseId, co_code.trim().toUpperCase(), co_description, bloom_level, target_attainment]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: `${co_code} already exists for this course` });
    res.status(500).json({ error: e.message });
  }
});

router.put('/outcomes/:id', requireRole('admin', 'faculty'), async (req, res) => {
  if (!pgOK(res)) return;
  const { co_description, bloom_level, target_attainment } = req.body;
  try {
    const r = await pgdb.pool.query(
      `UPDATE course_outcomes SET co_description=$1, bloom_level=$2, target_attainment=$3
       WHERE id=$4 RETURNING *`,
      [co_description, bloom_level, target_attainment, req.params.id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/outcomes/:id', requireRole('admin', 'faculty'), async (req, res) => {
  if (!pgOK(res)) return;
  try {
    await pgdb.pool.query('DELETE FROM course_outcomes WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Component → CO Mapping ───────────────────────────────────────────────────

router.get('/courses/:courseId/mapping', requireAuth, async (req, res) => {
  if (!pgOK(res)) return;
  try {
    const rows = await pgdb.pool.query(
      `SELECT ccm.*, co.co_code, rc.component_name
       FROM component_co_mapping ccm
       JOIN course_outcomes co ON co.id = ccm.co_id
       JOIN result_components rc ON rc.id = ccm.component_id
       WHERE ccm.course_id = $1`,
      [req.params.courseId]
    );
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// body: { rows: [{ component_id, co_id, co_weight }] }  — full replace for this course
router.post('/courses/:courseId/mapping', requireRole('admin', 'faculty'), async (req, res) => {
  if (!pgOK(res)) return;
  const { rows = [] } = req.body;
  const client = await pgdb.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM component_co_mapping WHERE course_id=$1', [req.params.courseId]);
    for (const row of rows) {
      if (!row.component_id || !row.co_id) continue;
      await client.query(
        `INSERT INTO component_co_mapping (id, course_id, component_id, co_id, co_weight)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (course_id, component_id, co_id) DO UPDATE SET co_weight=$5`,
        [uuidv4(), req.params.courseId, row.component_id, row.co_id, row.co_weight || 1]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, saved: rows.length });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ── OBE Course Config ────────────────────────────────────────────────────────

router.get('/courses/:courseId/config', requireAuth, async (req, res) => {
  if (!pgOK(res)) return;
  try {
    const r = await pgdb.pool.query('SELECT * FROM obe_course_config WHERE course_id=$1', [req.params.courseId]);
    res.json(r.rows[0] || { course_id: req.params.courseId, threshold_pct: 60, level_3_pct: 80, level_2_pct: 70, level_1_pct: 60, target_level: 2, weight_direct: 0.8, weight_indirect: 0.2 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/courses/:courseId/config', requireRole('admin', 'faculty'), async (req, res) => {
  if (!pgOK(res)) return;
  const { threshold_pct = 60, level_3_pct = 80, level_2_pct = 70, level_1_pct = 60, target_level = 2, weight_direct = 0.8, weight_indirect = 0.2 } = req.body;
  try {
    const r = await pgdb.pool.query(
      `INSERT INTO obe_course_config (id, course_id, threshold_pct, level_3_pct, level_2_pct, level_1_pct, target_level, weight_direct, weight_indirect)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (course_id) DO UPDATE SET
         threshold_pct=$3, level_3_pct=$4, level_2_pct=$5, level_1_pct=$6,
         target_level=$7, weight_direct=$8, weight_indirect=$9, updated_at=NOW()
       RETURNING *`,
      [uuidv4(), req.params.courseId, threshold_pct, level_3_pct, level_2_pct, level_1_pct, target_level, weight_direct, weight_indirect]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Program Outcomes ─────────────────────────────────────────────────────────

router.get('/programs/:programId/outcomes', requireAuth, async (req, res) => {
  if (!pgOK(res)) return;
  try {
    const rows = await pgdb.pool.query(
      'SELECT * FROM program_outcomes WHERE program_id=$1 ORDER BY po_code',
      [req.params.programId]
    );
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Seed NBA POs or add custom POs
router.post('/programs/:programId/outcomes', requireRole('admin', 'faculty'), async (req, res) => {
  if (!pgOK(res)) return;
  const { seed_nba, pos = [] } = req.body;
  const toInsert = seed_nba ? NBA_POS : pos;
  if (!toInsert.length) return res.status(400).json({ error: 'No POs to add' });
  const client = await pgdb.pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const po of toInsert) {
      const r = await client.query(
        `INSERT INTO program_outcomes (id, program_id, po_code, po_description)
         VALUES ($1,$2,$3,$4) ON CONFLICT (program_id, po_code) DO NOTHING RETURNING *`,
        [uuidv4(), req.params.programId, po.po_code, po.po_description || '']
      );
      if (r.rows[0]) inserted.push(r.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ inserted: inserted.length, pos: inserted });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

router.delete('/programs/outcomes/:id', requireRole('admin'), async (req, res) => {
  if (!pgOK(res)) return;
  try {
    await pgdb.pool.query('DELETE FROM program_outcomes WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CO-PO Mapping Matrix ─────────────────────────────────────────────────────

// Get CO-PO mapping for a course's COs
router.get('/courses/:courseId/co-po-mapping', requireAuth, async (req, res) => {
  if (!pgOK(res)) return;
  try {
    const rows = await pgdb.pool.query(
      `SELECT cpm.*, co.co_code, po.po_code
       FROM co_po_mapping cpm
       JOIN course_outcomes co ON co.id = cpm.co_id
       JOIN program_outcomes po ON po.id = cpm.po_id
       WHERE co.course_id = $1`,
      [req.params.courseId]
    );
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// body: { rows: [{ co_id, po_id, mapping_strength }] }  — full replace for course
router.post('/courses/:courseId/co-po-mapping', requireRole('admin', 'faculty'), async (req, res) => {
  if (!pgOK(res)) return;
  const { rows = [] } = req.body;
  const client = await pgdb.pool.connect();
  try {
    await client.query('BEGIN');
    // Delete existing mappings for COs of this course
    await client.query(
      `DELETE FROM co_po_mapping WHERE co_id IN (SELECT id FROM course_outcomes WHERE course_id=$1)`,
      [req.params.courseId]
    );
    for (const row of rows) {
      if (!row.co_id || !row.po_id || !row.mapping_strength) continue;
      await client.query(
        `INSERT INTO co_po_mapping (id, co_id, po_id, mapping_strength)
         VALUES ($1,$2,$3,$4) ON CONFLICT (co_id, po_id) DO UPDATE SET mapping_strength=$4`,
        [uuidv4(), row.co_id, row.po_id, row.mapping_strength]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ── Analytics ────────────────────────────────────────────────────────────────

router.get('/courses/:courseId/attainment', requireAuth, async (req, res) => {
  if (!pgOK(res)) return;
  try {
    const data = await svc.getCOAttainment(req.params.courseId, req.query.semester, req.query.academic_year);
    res.json(data || { cos: [], results: {}, studentDetail: [], config: {} });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/courses/:courseId/po-attainment', requireAuth, async (req, res) => {
  if (!pgOK(res)) return;
  try {
    const data = await svc.getPOAttainmentForCourse(req.params.courseId, req.query.semester, req.query.academic_year);
    res.json(data || { pos: [], poResults: {} });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/programs/:programId/po-attainment', requireAuth, async (req, res) => {
  if (!pgOK(res)) return;
  try {
    const data = await svc.getProgramPOAttainment(req.params.programId, req.query.semester, req.query.academic_year);
    res.json(data || { pos: [], poResults: {}, courseAttainments: [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/courses/:courseId/gaps', requireAuth, async (req, res) => {
  if (!pgOK(res)) return;
  try {
    const gaps = await svc.getGapAnalysis(req.params.courseId, req.query.semester, req.query.academic_year);
    res.json(gaps);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/courses/:courseId/at-risk', requireAuth, async (req, res) => {
  if (!pgOK(res)) return;
  try {
    const data = await svc.getCOAttainment(req.params.courseId, req.query.semester, req.query.academic_year);
    res.json(data?.studentDetail?.filter(s => s.risk > 0) || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
