'use strict';

const GRADE_THRESHOLDS = [
  { min: 90, grade: 'O',  point: 10 },
  { min: 80, grade: 'A+', point: 9  },
  { min: 70, grade: 'A',  point: 8  },
  { min: 60, grade: 'B+', point: 7  },
  { min: 50, grade: 'B',  point: 6  },
  { min: 40, grade: 'C',  point: 5  },
  { min: 0,  grade: 'F',  point: 0  },
];

function computeGrade(percentage) {
  const pct = parseFloat(percentage) || 0;
  for (const t of GRADE_THRESHOLDS) {
    if (pct >= t.min) return t.grade;
  }
  return 'F';
}

function gradeToPoint(grade) {
  const entry = GRADE_THRESHOLDS.find(t => t.grade === grade);
  return entry ? entry.point : 0;
}

function isPassing(grade) {
  return grade !== 'F';
}

// subjects: [{ credits: number, grade: string }]
function computeSGPA(subjects) {
  const totalCredits = subjects.reduce((s, c) => s + (parseFloat(c.credits) || 0), 0);
  if (!totalCredits) return 0;
  const weightedSum = subjects.reduce(
    (s, c) => s + gradeToPoint(c.grade) * (parseFloat(c.credits) || 0),
    0
  );
  return Math.round((weightedSum / totalCredits) * 100) / 100;
}

// cgpaList: array of SGPA values (one per semester), all weighted equally
function computeCGPA(sgpaList) {
  if (!sgpaList.length) return 0;
  const avg = sgpaList.reduce((s, v) => s + v, 0) / sgpaList.length;
  return Math.round(avg * 100) / 100;
}

module.exports = { computeGrade, gradeToPoint, isPassing, computeSGPA, computeCGPA, GRADE_THRESHOLDS };
