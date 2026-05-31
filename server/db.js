const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'itm_lms_db.json');

const DEFAULT_DATA = {
  users: [
    { id: 1, email: 'admin@itmuniversity.ac.in', password: 'admin123', name: 'Administrator', role: 'admin' },
    { id: 2, email: 'faculty@itmuniversity.ac.in', password: 'faculty123', name: 'Dr. Amit Kumar', role: 'faculty' },
    { id: 3, email: 'student@itmuniversity.ac.in', password: 'student123', name: 'Aditya Sharma', role: 'student' },
  ],
  departments: [
    { id: 'ITMDEP001', name: 'Computer Science & Engineering', code: 'CSE', hod: 'Dr. Amit Kumar', createdAt: new Date().toISOString() },
    { id: 'ITMDEP002', name: 'Business Management', code: 'MGT', hod: 'Dr. Rajesh Verma', createdAt: new Date().toISOString() },
    { id: 'ITMDEP003', name: 'Electronics & Communication', code: 'ECE', hod: 'Dr. S.K. Jain', createdAt: new Date().toISOString() },
    { id: 'ITMDEP004', name: 'Mechanical Engineering', code: 'ME', hod: 'Dr. P.K. Sharma', createdAt: new Date().toISOString() },
    { id: 'ITMDEP005', name: 'Basic Sciences', code: 'SCI', hod: 'Dr. Anjali Gupta', createdAt: new Date().toISOString() },
    { id: 'ITMDEP006', name: 'Law', code: 'LAW', hod: 'Dr. Vikram Singh', createdAt: new Date().toISOString() },
  ],
  students: [
    { id: 'ITM2024001', firstName: 'Aditya', lastName: 'Sharma', email: 'aditya.s@itmuniversity.ac.in', phone: '+91 9876543210', department: 'Computer Science & Engineering', program: 'B.Tech CSE', batch: '2024-2028', status: 'active', createdAt: new Date().toISOString() },
    { id: 'ITM2024002', firstName: 'Priya', lastName: 'Singh', email: 'priya.s@itmuniversity.ac.in', phone: '+91 9876543211', department: 'Business Management', program: 'BBA', batch: '2024-2027', status: 'active', createdAt: new Date().toISOString() },
    { id: 'ITM2024003', firstName: 'Rahul', lastName: 'Gupta', email: 'rahul.g@itmuniversity.ac.in', phone: '+91 9876543212', department: 'Computer Science & Engineering', program: 'B.Tech CSE', batch: '2024-2028', status: 'active', createdAt: new Date().toISOString() },
  ],
  faculty: [
    { id: 'ITMFAC001', name: 'Dr. Amit Kumar', email: 'amit.k@itmuniversity.ac.in', department: 'Computer Science & Engineering', designation: 'Professor', specialization: 'AI, Machine Learning', phone: '+91 9876543213', createdAt: new Date().toISOString() },
    { id: 'ITMFAC002', name: 'Dr. Rajesh Verma', email: 'rajesh.v@itmuniversity.ac.in', department: 'Business Management', designation: 'Associate Professor', specialization: 'Finance, Marketing', phone: '+91 9876543214', createdAt: new Date().toISOString() },
  ],
  courses: [
    { id: 'ITMCRS001', code: 'CSE301', name: 'Data Structures & Algorithms', department: 'Computer Science & Engineering', credits: 4, type: 'Core', maxStudents: 60, enrolled: 45, semester: '4th', description: 'Advanced data structures, algorithm design, and complexity analysis.', createdAt: new Date().toISOString() },
    { id: 'ITMCRS002', code: 'CSE402', name: 'Machine Learning', department: 'Computer Science & Engineering', credits: 3, type: 'Elective', maxStudents: 40, enrolled: 38, semester: '6th', description: 'Introduction to machine learning concepts and practical applications.', createdAt: new Date().toISOString() },
    { id: 'ITMCRS003', code: 'MGT201', name: 'Business Strategy', department: 'Business Management', credits: 3, type: 'Core', maxStudents: 50, enrolled: 42, semester: '3rd', description: 'Strategic management concepts for modern businesses.', createdAt: new Date().toISOString() },
  ],
  questions: [
    { id: 'Q001', course: 'CSE301', courseName: 'Data Structures', type: 'mcq', topic: 'Module 1', difficulty: 'easy', co: 'CO1', blooms: 'remember', text: 'What is the time complexity of binary search?', options: { A: 'O(1)', B: 'O(log n)', C: 'O(n)', D: 'O(n²)' }, correct: 'B', marks: 1, createdAt: new Date().toISOString() },
    { id: 'Q002', course: 'CSE301', courseName: 'Data Structures', type: 'short', topic: 'Module 2', difficulty: 'medium', co: 'CO2', blooms: 'apply', text: 'Explain the working of a stack data structure with a real-life example.', options: null, correct: null, marks: 3, createdAt: new Date().toISOString() },
    { id: 'Q003', course: 'CSE301', courseName: 'Data Structures', type: 'long', topic: 'Module 3', difficulty: 'hard', co: 'CO3', blooms: 'analyze', text: 'Compare and contrast Binary Search Tree, AVL Tree, and Red-Black Tree.', options: null, correct: null, marks: 7, createdAt: new Date().toISOString() },
  ],
  eval_sessions: [],
  evaluations: [],
  lms_resources: [],
  lms_announcements: [],
  exam_papers: [],
  exam_questions: [],
  student_results: [],
  question_responses: [],
  marksheets: [],
  paper_metadata: [],
  notifications: [],
  moderation_assignments: [],
  moderated_papers: [],
  moderation_logs: [],
  moderation_notifications: [],
  expert_subject_mapping: [],
};

function load() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
    return DEFAULT_DATA;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return DEFAULT_DATA;
  }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Simple synchronous in-memory + file store
class DB {
  constructor() {
    this._data = load();
  }

  _save() { save(this._data); }

  // Generic collection helpers
  all(table) {
    return this._data[table] || [];
  }

  get(table, predicate) {
    return (this._data[table] || []).find(predicate);
  }

  insert(table, item) {
    if (!this._data[table]) this._data[table] = [];
    this._data[table].push(item);
    this._save();
    return item;
  }

  update(table, predicate, updater) {
    const idx = (this._data[table] || []).findIndex(predicate);
    if (idx === -1) return null;
    this._data[table][idx] = { ...this._data[table][idx], ...updater(this._data[table][idx]) };
    this._save();
    return this._data[table][idx];
  }

  remove(table, predicate) {
    const before = (this._data[table] || []).length;
    this._data[table] = (this._data[table] || []).filter(x => !predicate(x));
    this._save();
    return before - this._data[table].length;
  }

  count(table) {
    return (this._data[table] || []).length;
  }
}

module.exports = new DB();
