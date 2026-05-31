'use strict';

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const { v4: uuidv4 } = require('uuid');
const pgdb       = require('../pgdb');
const { requireAuth, requireRole, extractUser } = require('../middleware/auth');
const { generateMarksheets } = require('../services/results/marksheet.service');
const { generateMarksheetPDF } = require('../services/results/pdf.service');

const router = express.Router();
const MS_DIR = path.join(__dirname, '../uploads/marksheets');
if (!fs.existsSync(MS_DIR)) fs.mkdirSync(MS_DIR, { recursive: true });

// ── Templates ─────────────────────────────────────────────────────────────────

router.get('/templates', requireAuth, async (req, res) => {
  const r = await pgdb.pool.query(
    `SELECT t.*,
            p.name AS program_name,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', tc.id,
                  'component_id', tc.component_id,
                  'component_name', rc.component_name,
                  'weightage_percentage', tc.weightage_percentage
                ) ORDER BY tc.weightage_percentage DESC
              ) FILTER (WHERE tc.id IS NOT NULL),
              '[]'
            ) AS components
     FROM marksheet_templates t
     LEFT JOIN programs p ON p.id = t.program_id
     LEFT JOIN marksheet_template_components tc ON tc.template_id = t.id
     LEFT JOIN result_components rc ON rc.id = tc.component_id
     WHERE t.is_active = TRUE
     GROUP BY t.id, p.name
     ORDER BY t.created_at DESC`
  );
  res.json(r.rows);
});

router.post('/templates', requireRole('admin'), async (req, res) => {
  const user = extractUser(req);
  const { template_name, description, semester, program_id, components } = req.body;

  if (!template_name) return res.status(400).json({ error: 'template_name required' });
  if (!Array.isArray(components) || !components.length) {
    return res.status(400).json({ error: 'At least one component required' });
  }

  const totalW = components.reduce((s, c) => s + (parseFloat(c.weightage_percentage) || 0), 0);
  if (Math.abs(totalW - 100) > 0.01) {
    return res.status(400).json({ error: `Weightages must total 100% (currently ${totalW}%)` });
  }

  // created_by references faculty(id) — admins are not in faculty table, so use null for them
  const createdBy = user.role === 'faculty' ? (user.id || null) : null;

  const client = await pgdb.pool.connect();
  try {
    await client.query('BEGIN');
    const id = uuidv4();
    await client.query(
      `INSERT INTO marksheet_templates
         (id, template_name, description, semester, program_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, template_name, description || '', semester || '', program_id || null, createdBy]
    );
    for (const c of components) {
      await client.query(
        `INSERT INTO marksheet_template_components
           (id, template_id, component_id, weightage_percentage)
         VALUES ($1,$2,$3,$4)`,
        [uuidv4(), id, c.component_id, parseFloat(c.weightage_percentage) || 0]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ id });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

router.put('/templates/:id', requireRole('admin'), async (req, res) => {
  const { template_name, description, semester, program_id, components } = req.body;
  const { id } = req.params;

  if (components) {
    const totalW = components.reduce((s, c) => s + (parseFloat(c.weightage_percentage) || 0), 0);
    if (Math.abs(totalW - 100) > 0.01) {
      return res.status(400).json({ error: `Weightages must total 100% (currently ${totalW}%)` });
    }
  }

  const client = await pgdb.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE marksheet_templates
       SET template_name = COALESCE($1, template_name),
           description   = COALESCE($2, description),
           semester      = COALESCE($3, semester),
           program_id    = COALESCE($4, program_id),
           updated_at    = NOW()
       WHERE id = $5`,
      [template_name || null, description || null, semester || null, program_id || null, id]
    );
    if (Array.isArray(components)) {
      await client.query(`DELETE FROM marksheet_template_components WHERE template_id = $1`, [id]);
      for (const c of components) {
        await client.query(
          `INSERT INTO marksheet_template_components (id, template_id, component_id, weightage_percentage)
           VALUES ($1,$2,$3,$4)`,
          [uuidv4(), id, c.component_id, parseFloat(c.weightage_percentage) || 0]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ updated: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

router.delete('/templates/:id', requireRole('admin'), async (req, res) => {
  await pgdb.pool.query(
    `UPDATE marksheet_templates SET is_active = FALSE WHERE id = $1`, [req.params.id]
  );
  res.json({ deleted: true });
});

// ── Generate Marksheet Data (preview) ────────────────────────────────────────

router.post('/generate', requireRole('admin', 'faculty'), async (req, res) => {
  const { templateId, studentIds, courseIds, semester, academicYear } = req.body;
  if (!templateId || !studentIds?.length || !courseIds?.length || !semester || !academicYear) {
    return res.status(400).json({ error: 'templateId, studentIds, courseIds, semester, academicYear required' });
  }
  const { template, marksheets } = await generateMarksheets({
    templateId, studentIds, courseIds, semester, academicYear,
  });
  res.json({ template, marksheets });
});

// ── Generate + Save PDF ───────────────────────────────────────────────────────

router.post('/generate-pdf', requireRole('admin', 'faculty'), async (req, res) => {
  const user = extractUser(req);
  const { templateId, studentIds, courseIds, semester, academicYear } = req.body;
  if (!templateId || !studentIds?.length || !courseIds?.length || !semester || !academicYear) {
    return res.status(400).json({ error: 'templateId, studentIds, courseIds, semester, academicYear required' });
  }

  // generated_by references faculty(id) — admins are not in faculty table
  const generatedBy = user.role === 'faculty' ? (user.id || null) : null;

  try {
    const { marksheets } = await generateMarksheets({
      templateId, studentIds, courseIds, semester, academicYear,
    });

    const saved = [];
    for (const ms of marksheets) {
      const msId   = uuidv4();
      const fname  = `marksheet_${msId}.pdf`;
      const fpath  = path.join(MS_DIR, fname);
      const buffer = await generateMarksheetPDF(ms);
      fs.writeFileSync(fpath, buffer);

      const dbPath = `uploads/marksheets/${fname}`;
      await pgdb.pool.query(
        `INSERT INTO generated_marksheets
           (id, student_id, template_id, semester, academic_year,
            generated_pdf_path, generated_by, marksheet_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [msId, ms.student.id, templateId, semester, academicYear, dbPath, generatedBy, JSON.stringify(ms)]
      );
      saved.push({ id: msId, student: ms.student, pdf_path: dbPath });
    }

    res.json({ generated: saved.length, marksheets: saved });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── List Generated Marksheets ─────────────────────────────────────────────────

router.get('/generated', requireAuth, async (req, res) => {
  const user = extractUser(req);
  const conditions = ['1=1'];
  const params = [];

  if (user.role === 'student') {
    params.push(user.id);
    conditions.push(`gm.student_id = $${params.length}`);
  }
  if (req.query.studentId) {
    params.push(req.query.studentId);
    conditions.push(`gm.student_id = $${params.length}`);
  }
  if (req.query.semester) {
    params.push(req.query.semester);
    conditions.push(`gm.semester = $${params.length}`);
  }

  const r = await pgdb.pool.query(
    `SELECT gm.*,
            s.first_name || ' ' || s.last_name AS student_name,
            s.id AS roll_no, s.enrollment_no,
            t.template_name
     FROM generated_marksheets gm
     LEFT JOIN students            s ON s.id = gm.student_id
     LEFT JOIN marksheet_templates t ON t.id = gm.template_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY gm.generated_at DESC`,
    params
  );
  res.json(r.rows);
});

// ── Download PDF ──────────────────────────────────────────────────────────────

router.get('/generated/:id/download', requireAuth, async (req, res) => {
  const user = extractUser(req);
  const r    = await pgdb.pool.query(
    `SELECT * FROM generated_marksheets WHERE id = $1`, [req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });

  const ms = r.rows[0];
  if (user.role === 'student' && ms.student_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const fpath = path.join(__dirname, '../', ms.generated_pdf_path);
  if (!fs.existsSync(fpath)) return res.status(404).json({ error: 'PDF file not found' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="marksheet_${req.params.id}.pdf"`);
  fs.createReadStream(fpath).pipe(res);
});

module.exports = router;
