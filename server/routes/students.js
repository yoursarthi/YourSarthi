const express = require('express');
const db = require('../db');
const pgdb = require('../pgdb');
const router = express.Router();

function mapStudent(row) {
  return {
    id: row.id,
    enrollmentNo: row.enrollment_no || '',
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    department: row.department_name || '',
    program: row.program_name || '',
    batch: row.batch || '',
    status: row.status || 'active',
    category: row.category || 'General',
    gender: row.gender || '',
    dateOfBirth: row.date_of_birth ? row.date_of_birth.toISOString?.().split('T')[0] ?? row.date_of_birth : '',
    nationality: row.nationality || 'Indian',
    religion: row.religion || '',
    bloodGroup: row.blood_group || '',
    medicalHistory: row.medical_history || '',
    localAddress: row.local_address || '',
    permanentAddress: row.permanent_address || '',
    fatherName: row.father_name || '',
    motherName: row.mother_name || '',
    hobbies: row.hobbies || '',
    careerOptions: row.career_options || '',
    achievements: row.achievements || '',
    linkedin: row.linkedin || '',
    github: row.github || '',
    createdAt: row.created_at,
  };
}

const STUDENT_SELECT = `
  SELECT s.*,
    d.name AS department_name,
    p.name AS program_name
  FROM students s
  LEFT JOIN departments d ON s.department_id = d.id
  LEFT JOIN programs    p ON s.program_id    = p.id
`;

// Extract admission year from batch string ("2024-2028" → "2024")
function admissionYear(batch) {
  const y = (batch || '').split('-')[0].trim();
  return /^\d{4}$/.test(y) ? y : String(new Date().getFullYear());
}

// JSON-store fallback: scan existing IDs to find next sequence for the year
function genJsonId(batch) {
  const year = admissionYear(batch);
  const prefix = `ITM${year}`;
  const maxSeq = db.all('students').reduce((max, s) => {
    if (typeof s.id === 'string' && s.id.startsWith(prefix)) {
      const n = parseInt(s.id.slice(prefix.length), 10);
      if (!isNaN(n)) return Math.max(max, n);
    }
    return max;
  }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

// PostgreSQL: atomic INSERT ... ON CONFLICT DO UPDATE on a dedicated sequence row.
// This is race-condition-proof — no two transactions can get the same seq for the same year.
async function genPgId(client, batch) {
  const year = admissionYear(batch);
  const r = await client.query(
    `INSERT INTO student_roll_sequences (year, last_seq)
     VALUES ($1, 1)
     ON CONFLICT (year) DO UPDATE
       SET last_seq = student_roll_sequences.last_seq + 1
     RETURNING last_seq`,
    [year]
  );
  const seq = r.rows[0].last_seq;
  return `ITM${year}${String(seq).padStart(3, '0')}`;
}

// ─── GET all ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (pgdb.ready) {
      const r = await pgdb.pool.query(STUDENT_SELECT + ' ORDER BY s.created_at DESC');
      return res.json(r.rows.map(mapStudent));
    }
    res.json(db.all('students').slice().reverse());
  } catch (err) {
    console.error('[students] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Fields students are NOT allowed to self-edit
const STUDENT_LOCKED_FIELDS = [
  'gender', 'date_of_birth', 'nationality', 'religion', 'blood_group',
  'phone', 'whatsapp', 'local_address', 'permanent_address',
  'father_name', 'mother_name',
];

// ─── POST create ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    firstName, lastName, email, phone, whatsapp, department, program, batch, status,
    category, enrollmentNo, fatherName, motherName,
    gender, dateOfBirth, nationality, religion, bloodGroup,
    localAddress, permanentAddress,
  } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: 'firstName and lastName required' });

  if (pgdb.ready) {
    let client;
    try {
      client = await pgdb.pool.connect();
      await client.query('BEGIN');
      const id = await genPgId(client, batch);
      const deptId = await pgdb.getDeptId(department);
      const progId = await pgdb.getProgramId(program);

      await client.query(
        `INSERT INTO students
           (id, enrollment_no, first_name, last_name, email, phone, whatsapp,
            department_id, program_id, batch, status, category,
            father_name, mother_name,
            gender, date_of_birth, nationality, religion, blood_group,
            local_address, permanent_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [
          id, enrollmentNo || null, firstName, lastName, email || '', phone || '', whatsapp || '',
          deptId, progId, batch || '', status || 'active',
          category || 'General', fatherName || '', motherName || '',
          gender || '', dateOfBirth || null, nationality || 'Indian',
          religion || '', bloodGroup || '',
          localAddress || '', permanentAddress || '',
        ]
      );
      await client.query('COMMIT');

      const created = await pgdb.pool.query(STUDENT_SELECT + ' WHERE s.id = $1', [id]);
      return res.status(201).json(mapStudent(created.rows[0]));
    } catch (err) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error('[students] POST error:', err.message);
      if (err.code === '23505') {
        const field = err.detail?.includes('email') ? 'email' : 'ID';
        return res.status(409).json({ error: `Duplicate ${field} — student already exists` });
      }
      return res.status(500).json({ error: 'Failed to create student' });
    } finally {
      if (client) client.release();
    }
  }

  try {
    const id = genJsonId(batch);
    const student = db.insert('students', {
      id, firstName, lastName, email: email || '', phone: phone || '',
      department: department || '', program: program || '', batch: batch || '',
      status: status || 'active', createdAt: new Date().toISOString(),
    });
    res.status(201).json(student);
  } catch (err) {
    console.error('[students] POST JSON error:', err.message);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// ─── PUT update ──────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const role = req.headers['x-user-role'] || 'admin';
  const isStudent = role === 'student';

  const {
    firstName, lastName, email, phone, department, program, batch, status,
    whatsapp, gender, dateOfBirth, nationality, religion, bloodGroup, medicalHistory,
    localAddress, permanentAddress, fatherName, motherName, category, enrollmentNo,
    hobbies, careerOptions, achievements, linkedin, github,
  } = req.body;

  if (pgdb.ready) {
    try {
      const deptId = department ? await pgdb.getDeptId(department) : undefined;
      const progId = program ? await pgdb.getProgramId(program) : undefined;

      let fields = [
        ['first_name', firstName],
        ['last_name', lastName],
        ['email', email],
        ['phone', phone],
        ['department_id', deptId],
        ['program_id', progId],
        ['batch', batch],
        ['status', status],
        ['whatsapp', whatsapp],
        ['gender', gender !== undefined ? (gender || '') : undefined],
        ['date_of_birth', dateOfBirth !== undefined ? (dateOfBirth || null) : undefined],
        ['nationality', nationality],
        ['religion', religion],
        ['blood_group', bloodGroup !== undefined ? (bloodGroup || '') : undefined],
        ['medical_history', medicalHistory],
        ['local_address', localAddress],
        ['permanent_address', permanentAddress],
        ['father_name', fatherName],
        ['mother_name', motherName],
        ['category', category],
        ['enrollment_no', enrollmentNo],
        ['hobbies', hobbies],
        ['career_options', careerOptions],
        ['achievements', achievements],
        ['linkedin', linkedin],
        ['github', github],
      ].filter(([, v]) => v !== undefined);

      // Students cannot self-edit locked fields
      if (isStudent) {
        fields = fields.filter(([col]) => !STUDENT_LOCKED_FIELDS.includes(col));
      }

      if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

      const setClauses = fields.map(([col], i) => `${col} = $${i + 1}`).join(', ');
      const values = [...fields.map(([, v]) => v), req.params.id];

      await pgdb.pool.query(
        `UPDATE students SET ${setClauses} WHERE id = $${values.length}`,
        values
      );
      const updated = await pgdb.pool.query(STUDENT_SELECT + ' WHERE s.id = $1', [req.params.id]);
      if (!updated.rows.length) return res.status(404).json({ error: 'Student not found' });
      return res.json(mapStudent(updated.rows[0]));
    } catch (err) {
      console.error('[students] PUT error:', err.message);
      if (err.code === '23505') return res.status(409).json({ error: 'Email already in use by another student' });
      return res.status(500).json({ error: 'Failed to update student' });
    }
  }

  try {
    const updated = db.update('students', s => s.id === req.params.id, (ex) => ({
      firstName: firstName ?? ex.firstName,
      lastName: lastName ?? ex.lastName,
      email: email ?? ex.email,
      phone: phone ?? ex.phone,
      department: department ?? ex.department,
      program: program ?? ex.program,
      batch: batch ?? ex.batch,
      status: status ?? ex.status,
      whatsapp: whatsapp ?? ex.whatsapp ?? '',
      gender: gender ?? ex.gender ?? '',
      dateOfBirth: dateOfBirth ?? ex.dateOfBirth ?? '',
      nationality: nationality ?? ex.nationality ?? 'Indian',
      religion: religion ?? ex.religion ?? '',
      bloodGroup: bloodGroup ?? ex.bloodGroup ?? '',
      medicalHistory: medicalHistory ?? ex.medicalHistory ?? '',
      localAddress: localAddress ?? ex.localAddress ?? '',
      permanentAddress: permanentAddress ?? ex.permanentAddress ?? '',
      fatherName: fatherName ?? ex.fatherName ?? '',
      motherName: motherName ?? ex.motherName ?? '',
      category: category ?? ex.category ?? '',
      enrollmentNo: enrollmentNo ?? ex.enrollmentNo ?? '',
      hobbies: hobbies ?? ex.hobbies ?? '',
      careerOptions: careerOptions ?? ex.careerOptions ?? '',
      achievements: achievements ?? ex.achievements ?? '',
      linkedin: linkedin ?? ex.linkedin ?? '',
      github: github ?? ex.github ?? '',
    }));
    if (!updated) return res.status(404).json({ error: 'Student not found' });
    res.json(updated);
  } catch (err) {
    console.error('[students] PUT JSON error:', err.message);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// ─── DELETE ──────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (pgdb.ready) {
      await pgdb.pool.query('DELETE FROM students WHERE id = $1', [req.params.id]);
      return res.json({ ok: true });
    }
    db.remove('students', s => s.id === req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[students] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// ─── Bulk import ─────────────────────────────────────────────────────────────
router.post('/import', async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students)) return res.status(400).json({ error: 'students array required' });

  if (pgdb.ready) {
    let client;
    let count = 0;
    try {
      client = await pgdb.pool.connect();
      await client.query('BEGIN');
      for (const s of students) {
        const id = await genPgId(client, s.batch);
        const deptId = await pgdb.getDeptId(s.department);
        const progId = await pgdb.getProgramId(s.department);
        await client.query(
          `INSERT INTO students (id, first_name, last_name, email, phone, department_id, program_id, batch, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [id, s.firstName || '', s.lastName || '', s.email || '', s.phone || '',
           deptId, progId, s.batch || '', s.status || 'active']
        );
        count++;
      }
      await client.query('COMMIT');
      return res.json({ imported: count });
    } catch (err) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error('[students] import error:', err.message);
      return res.status(500).json({ error: err.message });
    } finally {
      if (client) client.release();
    }
  }

  try {
    let count = 0;
    for (const s of students) {
      const id = genJsonId(s.batch);
      db.insert('students', {
        id, firstName: s.firstName || '', lastName: s.lastName || '',
        email: s.email || '', phone: s.phone || '', department: s.department || '',
        program: s.program || '', batch: s.batch || '', status: s.status || 'active',
        createdAt: new Date().toISOString(),
      });
      count++;
    }
    res.json({ imported: count });
  } catch (err) {
    console.error('[students] import JSON error:', err.message);
    res.status(500).json({ error: 'Import failed' });
  }
});

module.exports = router;
