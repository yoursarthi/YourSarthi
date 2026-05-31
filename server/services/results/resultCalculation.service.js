'use strict';

const { computeGrade, gradeToPoint, computeSGPA } = require('./grading.service');

/**
 * Calculate weighted final marks for one student in one course.
 *
 * @param {Array} componentMarks   rows from component_marks for this student+course
 * @param {Array} templateComps    rows from marksheet_template_components (with component_id + weightage_percentage)
 * @returns {{ breakdown, finalPercentage, finalMarks, maxMarks: 100, grade, passed }}
 */
function calculateWeightedResult(componentMarks, templateComps) {
  let totalWeightedPct = 0;
  let appliedWeightage = 0;
  const breakdown = [];

  for (const tc of templateComps) {
    const mark = componentMarks.find(m => m.component_id === tc.component_id);
    if (!mark) continue;

    const maxM = parseFloat(mark.max_marks) || 0;
    const obtM = parseFloat(mark.marks_obtained) || 0;
    const pct  = maxM > 0 ? (obtM / maxM) * 100 : 0;
    const weightage = parseFloat(tc.weightage_percentage) || 0;
    const weightedContrib = (pct * weightage) / 100;

    totalWeightedPct += weightedContrib;
    appliedWeightage += weightage;

    breakdown.push({
      component_id:    tc.component_id,
      component_name:  mark.component_name || tc.component_name || '',
      marks_obtained:  obtM,
      max_marks:       maxM,
      percentage:      Math.round(pct * 100) / 100,
      weightage,
      weighted_contribution: Math.round(weightedContrib * 100) / 100,
    });
  }

  // Normalise to 100 if not all template components had marks
  const finalPercentage = appliedWeightage > 0
    ? Math.round((totalWeightedPct / appliedWeightage) * 100 * 100) / 100
    : 0;

  const grade = computeGrade(finalPercentage);

  return {
    breakdown,
    finalPercentage,
    finalMarks:  Math.round(finalPercentage * 100) / 100,
    maxMarks:    100,
    grade,
    passed:      grade !== 'F',
    appliedWeightage,
  };
}

/**
 * Build a complete marksheet result object for one student.
 *
 * @param {object} student       { id, first_name, last_name, roll_no, enrollment_no, program, batch }
 * @param {Array}  courseResults [{ course, componentMarks }]  — course has id/code/name/credits
 * @param {Array}  templateComps rows from marksheet_template_components (with component data)
 * @returns Full marksheet data object
 */
function buildStudentMarksheet(student, courseResults, templateComps) {
  const courses = courseResults.map(({ course, componentMarks }) => {
    const result = calculateWeightedResult(componentMarks, templateComps);
    return {
      course_id:    course.id,
      course_code:  course.code || '',
      course_name:  course.name || '',
      credits:      parseInt(course.credits) || 0,
      ...result,
      grade_point:  gradeToPoint(result.grade),
    };
  });

  const sgpaInput = courses.map(c => ({ credits: c.credits, grade: c.grade }));
  const sgpa      = computeSGPA(sgpaInput);
  const totalCredits  = courses.reduce((s, c) => s + c.credits, 0);
  const earnedCredits = courses.filter(c => c.passed).reduce((s, c) => s + c.credits, 0);
  const overallResult = courses.every(c => c.passed) ? 'PASS' : 'FAIL';

  return {
    student: {
      id:            student.id,
      name:          `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      roll_no:       student.roll_no || student.id || '',
      enrollment_no: student.enrollment_no || '',
      program:       student.program_name || '',
      batch:         student.batch || '',
      department:    student.department_name || '',
    },
    courses,
    sgpa,
    total_credits:  totalCredits,
    earned_credits: earnedCredits,
    overall_result: overallResult,
  };
}

module.exports = { calculateWeightedResult, buildStudentMarksheet };
