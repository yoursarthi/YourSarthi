const express = require('express');
const db = require('../db');
const pgdb = require('../pgdb');
const router = express.Router();

const VALID_DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'HOD', 'Visiting Faculty'];

function normalizeDesignation(d) {
  if (!d) return 'Assistant Professor';
  const found = VALID_DESIGNATIONS.find(v => v.toLowerCase() === d.toLowerCase());
  return found || 'Assistant Professor';
}

function mapFaculty(row) {
  return {
    id:                   row.id,
    name:                 row.name,
    email:                row.email,
    phone:                row.phone || '',
    department:           row.department_name || '',
    designation:          row.designation || '',
    specialization:       row.specialization || '',
    qualification:        row.qualification || '',
    experienceYears:      row.experience_years || 0,
    isActive:             row.is_active !== false,
    // Personal details
    dateOfBirth:          row.date_of_birth ? (row.date_of_birth.toISOString?.().split('T')[0] ?? row.date_of_birth) : '',
    address:              row.address || '',
    fatherName:           row.father_name || '',
    motherName:           row.mother_name || '',
    spouseName:           row.spouse_name || '',
    // Academic qualifications
    ugDegree:             row.ug_degree || '',
    ugCollege:            row.ug_college || '',
    pgDegree:             row.pg_degree || '',
    pgCollege:            row.pg_college || '',
    phdTitle:             row.phd_title || '',
    phdUniversity:        row.phd_university || '',
    phdYear:              row.phd_year || '',
    // Research
    researchContributions: row.research_contributions || '',
    patents:              row.patents || '',
    awards:               row.awards || '',
    createdAt:            row.created_at,
  };
}

const FACULTY_SELECT = `
  SELECT f.*, d.name AS department_name
  FROM faculty f
  LEFT JOIN departments d ON f.department_id = d.id
`;

function genId() {
  return `ITMFAC${String(db.count('faculty') + 1).padStart(3, '0')}`;
}

// ─── GET all ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (pgdb.ready) {
      const r = await pgdb.pool.query(FACULTY_SELECT + ' ORDER BY f.created_at DESC');
      return res.json(r.rows.map(mapFaculty));
    }
    res.json(db.all('faculty').slice().reverse());
  } catch (err) {
    console.error('[faculty] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch faculty' });
  }
});

// ─── POST create ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    name, email, department, designation, specialization, phone,
    qualification, experienceYears,
    dateOfBirth, address, fatherName, motherName, spouseName,
    ugDegree, ugCollege, pgDegree, pgCollege,
    phdTitle, phdUniversity, phdYear,
    researchContributions, patents, awards,
  } = req.body;

  if (!name) return res.status(400).json({ error: 'name required' });

  if (pgdb.ready) {
    try {
      const countR = await pgdb.pool.query('SELECT COUNT(*) FROM faculty');
      const id = `ITMFAC${String(parseInt(countR.rows[0].count) + 1).padStart(3, '0')}`;
      const deptId = await pgdb.getDeptId(department);

      await pgdb.pool.query(
        `INSERT INTO faculty (
           id, name, email, phone, department_id, designation, specialization,
           qualification, experience_years,
           date_of_birth, address, father_name, mother_name, spouse_name,
           ug_degree, ug_college, pg_degree, pg_college,
           phd_title, phd_university, phd_year,
           research_contributions, patents, awards
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,
           $10,$11,$12,$13,$14,$15,$16,$17,$18,
           $19,$20,$21,$22,$23,$24
         )`,
        [
          id, name, email || '', phone || '', deptId,
          normalizeDesignation(designation), specialization || '',
          qualification || '', parseInt(experienceYears) || 0,
          dateOfBirth || null, address || '',
          fatherName || '', motherName || '', spouseName || '',
          ugDegree || '', ugCollege || '',
          pgDegree || '', pgCollege || '',
          phdTitle || '', phdUniversity || '',
          phdYear ? parseInt(phdYear) : null,
          researchContributions || '', patents || '', awards || '',
        ]
      );
      const created = await pgdb.pool.query(FACULTY_SELECT + ' WHERE f.id = $1', [id]);
      return res.status(201).json(mapFaculty(created.rows[0]));
    } catch (err) {
      console.error('[faculty] POST error:', err.message);
      if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
      return res.status(500).json({ error: 'Failed to create faculty' });
    }
  }

  const f = db.insert('faculty', {
    id: genId(), name, email: email || '', department: department || '',
    designation: designation || '', specialization: specialization || '',
    phone: phone || '', createdAt: new Date().toISOString(),
  });
  res.status(201).json(f);
});

// ─── PUT update ──────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const {
    name, email, department, designation, specialization, phone,
    qualification, experienceYears,
    dateOfBirth, address, fatherName, motherName, spouseName,
    ugDegree, ugCollege, pgDegree, pgCollege,
    phdTitle, phdUniversity, phdYear,
    researchContributions, patents, awards,
  } = req.body;

  if (pgdb.ready) {
    try {
      const deptId = department ? await pgdb.getDeptId(department) : undefined;

      const fields = [
        ['name',                   name],
        ['email',                  email],
        ['phone',                  phone],
        ['department_id',          deptId],
        ['designation',            designation ? normalizeDesignation(designation) : undefined],
        ['specialization',         specialization],
        ['qualification',          qualification],
        ['experience_years',       experienceYears !== undefined ? parseInt(experienceYears) || 0 : undefined],
        ['date_of_birth',          dateOfBirth !== undefined ? (dateOfBirth || null) : undefined],
        ['address',                address],
        ['father_name',            fatherName],
        ['mother_name',            motherName],
        ['spouse_name',            spouseName],
        ['ug_degree',              ugDegree],
        ['ug_college',             ugCollege],
        ['pg_degree',              pgDegree],
        ['pg_college',             pgCollege],
        ['phd_title',              phdTitle],
        ['phd_university',         phdUniversity],
        ['phd_year',               phdYear !== undefined ? (phdYear ? parseInt(phdYear) : null) : undefined],
        ['research_contributions', researchContributions],
        ['patents',                patents],
        ['awards',                 awards],
      ].filter(([, v]) => v !== undefined);

      if (fields.length) {
        const setClauses = fields.map(([col], i) => `${col} = $${i + 1}`).join(', ');
        const values = [...fields.map(([, v]) => v), req.params.id];
        await pgdb.pool.query(
          `UPDATE faculty SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}`,
          values
        );
      }
      const updated = await pgdb.pool.query(FACULTY_SELECT + ' WHERE f.id = $1', [req.params.id]);
      if (!updated.rows.length) return res.status(404).json({ error: 'Not found' });
      return res.json(mapFaculty(updated.rows[0]));
    } catch (err) {
      console.error('[faculty] PUT error:', err.message);
      return res.status(500).json({ error: 'Failed to update faculty' });
    }
  }

  const u = db.update('faculty', f => f.id === req.params.id, () => ({
    name, email, department, designation, specialization, phone,
  }));
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json(u);
});

// ─── DELETE ──────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (pgdb.ready) {
      await pgdb.pool.query('DELETE FROM faculty WHERE id = $1', [req.params.id]);
      return res.json({ ok: true });
    }
    db.remove('faculty', f => f.id === req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[faculty] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete faculty' });
  }
});

module.exports = router;
