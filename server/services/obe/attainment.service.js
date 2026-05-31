const pgdb = require('../../pgdb');

const DEFAULT_CONFIG = {
  threshold_pct: 60,
  level_3_pct: 80,
  level_2_pct: 70,
  level_1_pct: 60,
  target_level: 2,
  weight_direct: 0.8,
  weight_indirect: 0.2,
};

function scoreToLevel(pct, cfg) {
  if (pct >= cfg.level_3_pct) return 3;
  if (pct >= cfg.level_2_pct) return 2;
  if (pct >= cfg.level_1_pct) return 1;
  return 0;
}

async function getCOAttainment(courseId, semester, academicYear) {
  const pool = pgdb.pool;
  if (!pool) return null;

  const cfgRes = await pool.query(
    'SELECT * FROM obe_course_config WHERE course_id = $1',
    [courseId]
  );
  const cfg = cfgRes.rows[0] || DEFAULT_CONFIG;

  const cosRes = await pool.query(
    'SELECT * FROM course_outcomes WHERE course_id = $1 ORDER BY co_code',
    [courseId]
  );
  const cos = cosRes.rows;
  if (!cos.length) return { cos: [], results: {}, studentDetail: [], config: cfg };

  // component → CO weights for this course
  const mappingRes = await pool.query(
    `SELECT ccm.co_id, ccm.component_id, ccm.co_weight, rc.component_name
     FROM component_co_mapping ccm
     JOIN result_components rc ON rc.id = ccm.component_id
     WHERE ccm.course_id = $1`,
    [courseId]
  );
  const coComponentMap = {};
  cos.forEach(co => { coComponentMap[co.id] = []; });
  mappingRes.rows.forEach(m => {
    if (coComponentMap[m.co_id]) coComponentMap[m.co_id].push(m);
  });

  // component marks for this course / semester / year
  const params = [courseId];
  let where = 'cm.course_id = $1';
  if (semester)     { params.push(semester);      where += ` AND cm.semester = $${params.length}`; }
  if (academicYear) { params.push(academicYear);  where += ` AND cm.academic_year = $${params.length}`; }

  const marksRes = await pool.query(
    `SELECT cm.student_id, cm.component_id, cm.marks_obtained, cm.max_marks,
            s.first_name || ' ' || s.last_name AS student_name, s.enrollment_no AS roll_number
     FROM component_marks cm
     JOIN students s ON s.id = cm.student_id
     WHERE ${where}`,
    params
  );

  // group marks by student
  const studentMarks = {};
  marksRes.rows.forEach(m => {
    if (!studentMarks[m.student_id]) {
      studentMarks[m.student_id] = { name: m.student_name, roll: m.roll_number, components: {} };
    }
    studentMarks[m.student_id].components[m.component_id] =
      m.max_marks > 0 ? (m.marks_obtained / m.max_marks) * 100 : 0;
  });

  const studentIds = Object.keys(studentMarks);
  if (!studentIds.length) return { cos, results: {}, studentDetail: [], config: cfg };

  // per-student CO scores
  const studentCOScores = {};
  studentIds.forEach(sid => {
    studentCOScores[sid] = {};
    cos.forEach(co => {
      const mappings = coComponentMap[co.id];
      if (!mappings || !mappings.length) { studentCOScores[sid][co.id] = null; return; }
      let wSum = 0, wTotal = 0;
      mappings.forEach(m => {
        const pct = studentMarks[sid]?.components[m.component_id];
        if (pct !== undefined) { wSum += pct * m.co_weight; wTotal += Number(m.co_weight); }
      });
      studentCOScores[sid][co.id] = wTotal > 0 ? wSum / wTotal : null;
    });
  });

  // attainment per CO
  const results = {};
  cos.forEach(co => {
    let attained = 0, total = 0;
    studentIds.forEach(sid => {
      const score = studentCOScores[sid][co.id];
      if (score !== null) { total++; if (score >= cfg.threshold_pct) attained++; }
    });
    const pct = total > 0 ? (attained / total) * 100 : 0;
    const level = scoreToLevel(pct, cfg);
    results[co.co_code] = {
      co_id: co.id,
      co_code: co.co_code,
      co_description: co.co_description,
      bloom_level: co.bloom_level,
      target_attainment: co.target_attainment,
      attainment_pct: Math.round(pct * 10) / 10,
      level,
      students_attained: attained,
      total_students: total,
      met_target: level >= co.target_attainment,
    };
  });

  // per-student detail
  const studentDetail = studentIds.map(sid => {
    const coScores = {};
    cos.forEach(co => {
      const s = studentCOScores[sid][co.id];
      coScores[co.co_code] = s !== null ? Math.round(s * 10) / 10 : null;
    });
    const vals = Object.values(coScores).filter(v => v !== null);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const weakCOs = Object.entries(coScores)
      .filter(([, v]) => v !== null && v < cfg.threshold_pct)
      .map(([code]) => code);
    const risk = weakCOs.length > 0
      ? Math.min(Math.round((weakCOs.length / cos.length) * 60 + Math.max(0, cfg.threshold_pct - avg) * 0.5), 99)
      : 0;
    return { student_id: sid, name: studentMarks[sid].name, roll: studentMarks[sid].roll, co_scores: coScores, avg_score: Math.round(avg * 10) / 10, weak_cos: weakCOs, risk };
  }).sort((a, b) => b.risk - a.risk);

  return { cos, results, studentDetail, config: cfg };
}

async function getPOAttainmentForCourse(courseId, semester, academicYear) {
  const pool = pgdb.pool;
  if (!pool) return null;

  const coData = await getCOAttainment(courseId, semester, academicYear);
  if (!coData || !coData.cos.length) return { pos: [], poResults: {}, coData };

  const coIds = coData.cos.map(c => c.id);
  const mappingRes = await pool.query(
    `SELECT cpm.co_id, cpm.po_id, cpm.mapping_strength,
            po.po_code, po.po_description, po.program_id
     FROM co_po_mapping cpm
     JOIN program_outcomes po ON po.id = cpm.po_id
     WHERE cpm.co_id = ANY($1::varchar[]) AND cpm.mapping_strength > 0`,
    [coIds]
  );

  const poMap = {};
  mappingRes.rows.forEach(m => {
    if (!poMap[m.po_id]) poMap[m.po_id] = { po_id: m.po_id, po_code: m.po_code, po_description: m.po_description };
  });

  const poScores = {};
  Object.keys(poMap).forEach(pid => { poScores[pid] = { wSum: 0, wTotal: 0 }; });

  mappingRes.rows.forEach(m => {
    const co = coData.cos.find(c => c.id === m.co_id);
    const coResult = co ? coData.results[co.co_code] : null;
    if (!coResult) return;
    const coScore = (coResult.level / 3) * 100;
    poScores[m.po_id].wSum   += coScore * m.mapping_strength;
    poScores[m.po_id].wTotal += m.mapping_strength;
  });

  const poResults = {};
  Object.values(poMap).forEach(po => {
    const s = poScores[po.po_id];
    poResults[po.po_code] = {
      ...po,
      attainment_pct: s.wTotal > 0 ? Math.round((s.wSum / s.wTotal) * 10) / 10 : 0,
    };
  });

  return { pos: Object.values(poMap), poResults, coData };
}

async function getProgramPOAttainment(programId, semester, academicYear) {
  const pool = pgdb.pool;
  if (!pool) return null;

  const posRes = await pool.query(
    'SELECT * FROM program_outcomes WHERE program_id = $1 ORDER BY po_code',
    [programId]
  );
  const pos = posRes.rows;
  if (!pos.length) return { pos: [], poResults: {}, courseAttainments: [] };

  const poIds = pos.map(p => p.id);
  const mappingRes = await pool.query(
    `SELECT cpm.co_id, cpm.po_id, cpm.mapping_strength, co.co_code, co.course_id
     FROM co_po_mapping cpm
     JOIN course_outcomes co ON co.id = cpm.co_id
     WHERE cpm.po_id = ANY($1::varchar[]) AND cpm.mapping_strength > 0`,
    [poIds]
  );

  const courseIds = [...new Set(mappingRes.rows.map(m => m.course_id))];
  const allCOData = {};
  for (const cid of courseIds) {
    const data = await getCOAttainment(cid, semester, academicYear);
    if (data) allCOData[cid] = data;
  }

  const poScores = {};
  poIds.forEach(pid => { poScores[pid] = { wSum: 0, wTotal: 0 }; });

  mappingRes.rows.forEach(m => {
    const cData = allCOData[m.course_id];
    if (!cData) return;
    const coResult = cData.results[m.co_code];
    if (!coResult) return;
    const coScore = (coResult.level / 3) * 100;
    poScores[m.po_id].wSum   += coScore * m.mapping_strength;
    poScores[m.po_id].wTotal += m.mapping_strength;
  });

  const poResults = {};
  pos.forEach(po => {
    const s = poScores[po.id];
    poResults[po.po_code] = {
      po_id: po.id,
      po_code: po.po_code,
      po_description: po.po_description,
      attainment_pct: s.wTotal > 0 ? Math.round((s.wSum / s.wTotal) * 10) / 10 : 0,
    };
  });

  const courseAttainments = courseIds.map(cid => ({
    course_id: cid,
    results: allCOData[cid]?.results || {},
    cos: allCOData[cid]?.cos || [],
  }));

  return { pos, poResults, courseAttainments };
}

async function getGapAnalysis(courseId, semester, academicYear) {
  const coData = await getCOAttainment(courseId, semester, academicYear);
  if (!coData) return [];
  return Object.values(coData.results)
    .filter(r => !r.met_target)
    .map(r => {
      const gap = r.target_attainment - r.level;
      return {
        type: 'CO',
        code: r.co_code,
        description: r.co_description,
        current_level: r.level,
        target_level: r.target_attainment,
        attainment_pct: r.attainment_pct,
        severity: gap >= 2 ? 'Critical' : gap === 1 ? 'High' : 'Medium',
        action: r.attainment_pct < 40
          ? 'Redesign assessment; conduct intensive remedial sessions.'
          : 'Review teaching methods; assign targeted practice problems.',
      };
    });
}

module.exports = { getCOAttainment, getPOAttainmentForCourse, getProgramPOAttainment, getGapAnalysis };
