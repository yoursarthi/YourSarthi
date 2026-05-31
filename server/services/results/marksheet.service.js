'use strict';

const pgdb = require('../../pgdb');
const { buildStudentMarksheet } = require('./resultCalculation.service');

/**
 * Fetch template with its components (joined with result_components metadata).
 */
async function getTemplateWithComponents(templateId) {
  const tmplRes = await pgdb.pool.query(
    `SELECT t.*,
            p.name AS program_name
     FROM marksheet_templates t
     LEFT JOIN programs p ON t.program_id = p.id
     WHERE t.id = $1`,
    [templateId]
  );
  if (!tmplRes.rows.length) return null;
  const template = tmplRes.rows[0];

  const compRes = await pgdb.pool.query(
    `SELECT tc.*, rc.component_name, rc.max_marks AS component_max_marks, rc.description
     FROM marksheet_template_components tc
     JOIN result_components rc ON rc.id = tc.component_id
     WHERE tc.template_id = $1
     ORDER BY tc.weightage_percentage DESC`,
    [templateId]
  );
  template.components = compRes.rows;
  return template;
}

/**
 * Fetch component marks for a list of students across a list of courses
 * for a given semester + academic_year.
 * Returns a nested map: { [studentId]: { [courseId]: [markRows] } }
 */
async function fetchComponentMarks(studentIds, courseIds, semester, academicYear) {
  if (!studentIds.length || !courseIds.length) return {};

  const placeholders = studentIds.map((_, i) => `$${i + 1}`).join(',');
  const courseOffset = studentIds.length;
  const coursePlaceholders = courseIds.map((_, i) => `$${courseOffset + i + 1}`).join(',');
  const semParam  = `$${courseOffset + courseIds.length + 1}`;
  const yearParam = `$${courseOffset + courseIds.length + 2}`;

  const params = [...studentIds, ...courseIds, semester, academicYear];

  const r = await pgdb.pool.query(
    `SELECT cm.*, rc.component_name
     FROM component_marks cm
     JOIN result_components rc ON rc.id = cm.component_id
     WHERE cm.student_id IN (${placeholders})
       AND cm.course_id  IN (${coursePlaceholders})
       AND cm.semester      = ${semParam}
       AND cm.academic_year = ${yearParam}`,
    params
  );

  // Build nested map
  const map = {};
  for (const row of r.rows) {
    if (!map[row.student_id]) map[row.student_id] = {};
    if (!map[row.student_id][row.course_id]) map[row.student_id][row.course_id] = [];
    map[row.student_id][row.course_id].push(row);
  }
  return map;
}

/**
 * Assemble marksheets for multiple students using a template.
 *
 * @param {string}   templateId
 * @param {string[]} studentIds
 * @param {string[]} courseIds
 * @param {string}   semester
 * @param {string}   academicYear
 * @returns {{ template, marksheets: Array }}
 */
async function generateMarksheets({ templateId, studentIds, courseIds, semester, academicYear }) {
  if (!pgdb.ready) throw new Error('Database not connected');

  const template = await getTemplateWithComponents(templateId);
  if (!template) throw new Error('Template not found');

  // Fetch students
  const sPlaceholders = studentIds.map((_, i) => `$${i + 1}`).join(',');
  const studentsRes = await pgdb.pool.query(
    `SELECT s.*,
            p.name AS program_name,
            d.name AS department_name
     FROM students s
     LEFT JOIN programs    p ON s.program_id    = p.id
     LEFT JOIN departments d ON s.department_id = d.id
     WHERE s.id IN (${sPlaceholders})`,
    studentIds
  );

  // Fetch courses
  const cPlaceholders = courseIds.map((_, i) => `$${i + 1}`).join(',');
  const coursesRes = await pgdb.pool.query(
    `SELECT * FROM courses WHERE id IN (${cPlaceholders})`,
    courseIds
  );
  const coursesMap = Object.fromEntries(coursesRes.rows.map(c => [c.id, c]));

  // Fetch all component marks
  const marksMap = await fetchComponentMarks(studentIds, courseIds, semester, academicYear);

  // Build marksheet for each student
  const marksheets = studentsRes.rows.map(student => {
    const courseResults = courseIds
      .filter(cid => coursesMap[cid])
      .map(cid => ({
        course:         coursesMap[cid],
        componentMarks: (marksMap[student.id]?.[cid] || []),
      }));

    const msData = buildStudentMarksheet(student, courseResults, template.components);
    return {
      ...msData,
      template_id:   templateId,
      template_name: template.template_name,
      semester,
      academic_year: academicYear,
      institute: {
        name:       'ITM University, Gwalior',
        short_name: 'ITM',
        affiliation: 'Affiliated to RGPV, Bhopal · NAAC Accredited',
      },
      generated_at: new Date().toISOString(),
    };
  });

  return { template, marksheets };
}

module.exports = { generateMarksheets, getTemplateWithComponents };
