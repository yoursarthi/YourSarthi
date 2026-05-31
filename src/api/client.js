const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

function authHeaders() {
  try {
    const u = JSON.parse(localStorage.getItem('itm_user') || 'null');
    if (!u) return {};
    return {
      'x-user-id':   u.id   || '',
      'x-user-role': u.role || '',
      'x-user-name': u.name || '',
    };
  } catch {
    return {};
  }
}

async function req(url, opts = {}) {
  const isFormData = opts.body instanceof FormData;
  const res = await fetch(BASE + url, {
    headers: isFormData
      ? authHeaders()
      : { 'Content-Type': 'application/json', ...authHeaders(), ...opts.headers },
    ...opts,
    body: isFormData ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Server error');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email, password) => req('/auth/login', { method: 'POST', body: { email, password } }),

  // Stats
  stats: () => req('/stats'),

  // Students
  students: {
    list: () => req('/students'),
    add: (data) => req('/students', { method: 'POST', body: data }),
    update: (id, data) => req(`/students/${id}`, { method: 'PUT', body: data }),
    remove: (id) => req(`/students/${id}`, { method: 'DELETE' }),
    import: (students) => req('/students/import', { method: 'POST', body: { students } }),
  },

  // Faculty
  faculty: {
    list: () => req('/faculty'),
    add: (data) => req('/faculty', { method: 'POST', body: data }),
    update: (id, data) => req(`/faculty/${id}`, { method: 'PUT', body: data }),
    remove: (id) => req(`/faculty/${id}`, { method: 'DELETE' }),
  },

  // Courses
  courses: {
    list: () => req('/courses'),
    add: (data) => req('/courses', { method: 'POST', body: data }),
    update: (id, data) => req(`/courses/${id}`, { method: 'PUT', body: data }),
    remove: (id) => req(`/courses/${id}`, { method: 'DELETE' }),
    resources: (id) => req(`/courses/${id}/resources`),
    addResource: (id, data) => req(`/courses/${id}/resources`, { method: 'POST', body: data }),
    announcements: (id) => req(`/courses/${id}/announcements`),
    addAnnouncement: (id, data) => req(`/courses/${id}/announcements`, { method: 'POST', body: data }),
  },

  // Departments
  departments: {
    list: () => req('/departments'),
    add: (data) => req('/departments', { method: 'POST', body: data }),
    remove: (id) => req(`/departments/${id}`, { method: 'DELETE' }),
  },

  // Programs
  programs: {
    list: () => req('/programs'),
    add: (data) => req('/programs', { method: 'POST', body: data }),
    remove: (id) => req(`/programs/${id}`, { method: 'DELETE' }),
  },

  // Questions
  questions: {
    list: (params = {}) => { const qs = new URLSearchParams(params).toString(); return req(`/questions${qs ? '?' + qs : ''}`); },
    add: (data) => req('/questions', { method: 'POST', body: data }),
    remove: (id) => req(`/questions/${id}`, { method: 'DELETE' }),
    generate: (data) => req('/questions/generate', { method: 'POST', body: data }),
  },

  // Evaluations (legacy JSON store)
  evaluations: {
    sessions: () => req('/evaluations/sessions'),
    createSession: (data) => req('/evaluations/sessions', { method: 'POST', body: data }),
    session: (id) => req(`/evaluations/sessions/${id}`),
    exportCSV: async (id) => {
      const res = await fetch(`${BASE}/evaluations/sessions/${id}/export`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `session_${id.slice(0, 8)}.csv`;
      a.click();
    },
    saveResult: (data) => req('/evaluations/results', { method: 'POST', body: data }),
    results: () => req('/evaluations/results'),
    flagReview: (id, needsReview) => req(`/evaluations/results/${id}/review`, { method: 'PATCH', body: { needsReview } }),
  },

  // Syllabus Understanding Engine
  syllabus: {
    list: () => req('/syllabus'),
    get: (id) => req(`/syllabus/${id}`),
    parse: (data) => req('/syllabus/parse', { method: 'POST', body: data }),
    update: (id, data) => req(`/syllabus/${id}`, { method: 'PUT', body: data }),
    remove: (id) => req(`/syllabus/${id}`, { method: 'DELETE' }),
    generateQuestions: (id, data) => req(`/syllabus/${id}/generate-questions`, { method: 'POST', body: data }),
    buildPaper: (id, data) => req(`/syllabus/${id}/build-paper`, { method: 'POST', body: data }),
    papers: () => req('/syllabus/papers'),
    notifyTeacher: (paperId, data) => req(`/syllabus/papers/${paperId}/notify`, { method: 'POST', body: data }),
    notifications: () => req('/syllabus/notifications'),
    markNotificationRead: (id) => req(`/syllabus/notifications/${id}/read`, { method: 'PATCH' }),
  },

  // Exams — per-question evaluation, tabulation & marksheets (PostgreSQL)
  exams: {
    status: () => req('/exams/status'),
    createPaper: (data) => req('/exams/papers', { method: 'POST', body: data }),
    papers: () => req('/exams/papers'),
    paper: (id) => req(`/exams/papers/${id}`),
    saveResult: (data) => req('/exams/results', { method: 'POST', body: data }),
    paperResults: (id) => req(`/exams/papers/${id}/results`),
    tabulation: (id) => req(`/exams/papers/${id}/tabulation`),
    exportTabulation: async (id) => {
      const res = await fetch(`${BASE}/exams/papers/${id}/tabulation/export`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `tabulation_${id.slice(0, 8)}.csv`;
      a.click();
    },
    generateMarksheet: (resultId) => req('/exams/marksheets', { method: 'POST', body: { resultId } }),
    marksheet: (resultId) => req(`/exams/marksheets/${resultId}`),
    verifyMarksheet: (code) => req(`/exams/marksheets/verify/${code}`),
    // Filtered result listing
    results: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return req(`/exams/results${qs ? '?' + qs : ''}`);
    },
    resultDetail: (id) => req(`/exams/results/${id}`),
  },

  // Feedback System (v2)
  feedback: {
    list:         (params = {}) => { const qs = new URLSearchParams(params).toString(); return req(`/feedback${qs ? '?' + qs : ''}`); },
    submit:       (data)        => req('/feedback', { method: 'POST', body: data }),
    replies:      (id)          => req(`/feedback/${id}/replies`),
    reply:        (id, data)    => req(`/feedback/${id}/replies`, { method: 'POST', body: data }),
    updateStatus: (id, status, note = '') => req(`/feedback/${id}/status`, { method: 'PATCH', body: { status, note } }),
    remove:       (id)          => req(`/feedback/${id}`, { method: 'DELETE' }),
    log:          (id)          => req(`/feedback/${id}/log`),
    dashboard:    ()            => req('/feedback/stats/dashboard'),
  },

  // AI Tutor
  aiTutor: {
    health:        () => req('/ai-tutor/health'),
    upload:        (courseId, formData) => {
      const headers = authHeaders();
      return fetch(`${BASE}/ai-tutor/upload/${courseId}`, { method: 'POST', headers, body: formData })
        .then(r => r.json());
    },
    documents:     (courseId)           => req(`/ai-tutor/documents/${courseId}`),
    docStatus:     (docId)              => req(`/ai-tutor/documents/${docId}/status`),
    deleteDoc:     (docId)              => req(`/ai-tutor/documents/${docId}`, { method: 'DELETE' }),
    createSession: (courseId, title)    => req(`/ai-tutor/sessions/${courseId}`, { method: 'POST', body: { title } }),
    sessions:      (courseId)           => req(`/ai-tutor/sessions/${courseId}`),
    deleteSession: (sessionId)          => req(`/ai-tutor/sessions/${sessionId}`, { method: 'DELETE' }),
    messages:      (sessionId)          => req(`/ai-tutor/sessions/${sessionId}/messages`),
    quiz:          (courseId, topic, count) => req(`/ai-tutor/quiz/${courseId}`, { method: 'POST', body: { topic, count } }),
    flashcards:    (courseId, topic, count) => req(`/ai-tutor/flashcards/${courseId}`, { method: 'POST', body: { topic, count } }),
    viva:          (courseId, topic, count) => req(`/ai-tutor/viva/${courseId}`, { method: 'POST', body: { topic, count } }),
    summary:       (courseId, topic)    => req(`/ai-tutor/summary/${courseId}`, { method: 'POST', body: { topic } }),
  },

  // Moderator Module
  moderation: {
    // Admin: list all papers with moderation status; Moderator: list own assignments
    list: () => req('/moderation'),
    stats: () => req('/moderation/stats'),

    // Admin only
    assign: (data) => req('/moderation/assign', { method: 'POST', body: data }),
    approve: (assignmentId, notes) => req(`/moderation/${assignmentId}/approve`, { method: 'POST', body: { notes } }),
    reject: (assignmentId, reason) => req(`/moderation/${assignmentId}/reject`, { method: 'POST', body: { reason } }),

    // Moderator actions
    get: (assignmentId) => req(`/moderation/${assignmentId}`),
    start: (assignmentId) => req(`/moderation/${assignmentId}/start`, { method: 'PUT' }),
    saveDraft: (assignmentId, data) => req(`/moderation/${assignmentId}/draft`, { method: 'PUT', body: data }),
    submit: (assignmentId, data) => req(`/moderation/${assignmentId}/submit`, { method: 'POST', body: data }),
    logs: (assignmentId) => req(`/moderation/${assignmentId}/logs`),

    // Notifications
    notifications: () => req('/moderation/notifications/list'),
    markNotifRead: (id) => req(`/moderation/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => req('/moderation/notifications/read-all', { method: 'POST' }),
    sendMessage: (data) => req('/moderation/notifications/send', { method: 'POST', body: data }),

    // Expert mapping
    experts: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return req(`/moderation/experts${qs ? '?' + qs : ''}`);
    },
    addExpert: (data) => req('/moderation/experts', { method: 'POST', body: data }),
    removeExpert: (id) => req(`/moderation/experts/${id}`, { method: 'DELETE' }),

    // Moderator user management (via auth route)
    moderators: () => req('/auth/users/moderators'),
    createModerator: (data) => req('/auth/users/moderators', { method: 'POST', body: data }),
    toggleModerator: (id, is_active) => req(`/auth/users/moderators/${id}`, { method: 'PATCH', body: { is_active } }),
  },

  // Result Management System
  results: {
    components: ()                   => req('/results/components'),
    addComponent: (data)             => req('/results/components', { method: 'POST', body: data }),
    marks: (params = {})             => {
      const qs = new URLSearchParams(params).toString();
      return req(`/results/marks${qs ? '?' + qs : ''}`);
    },
    addMark:    (data)               => req('/results/marks', { method: 'POST', body: data }),
    updateMark: (id, data)           => req(`/results/marks/${id}`, { method: 'PUT', body: data }),
    deleteMark: (id)                 => req(`/results/marks/${id}`, { method: 'DELETE' }),
    lockMark:   (id, locked)         => req(`/results/marks/${id}/lock`, { method: 'PATCH', body: { locked } }),
    bulkImport: (rows)               => req('/results/marks/bulk', { method: 'POST', body: { rows } }),
    studentResults: (studentId, p = {}) => {
      const qs = new URLSearchParams(p).toString();
      return req(`/results/student/${studentId}${qs ? '?' + qs : ''}`);
    },
  },

  // OBE Analytics
  obe: {
    // Setup
    courseOutcomes:   (courseId)          => req(`/obe/courses/${courseId}/outcomes`),
    addCO:            (courseId, data)    => req(`/obe/courses/${courseId}/outcomes`, { method: 'POST', body: data }),
    updateCO:         (id, data)          => req(`/obe/outcomes/${id}`, { method: 'PUT', body: data }),
    deleteCO:         (id)               => req(`/obe/outcomes/${id}`, { method: 'DELETE' }),
    getMapping:       (courseId)          => req(`/obe/courses/${courseId}/mapping`),
    saveMapping:      (courseId, rows)    => req(`/obe/courses/${courseId}/mapping`, { method: 'POST', body: { rows } }),
    getCourseConfig:  (courseId)          => req(`/obe/courses/${courseId}/config`),
    saveCourseConfig: (courseId, data)    => req(`/obe/courses/${courseId}/config`, { method: 'PUT', body: data }),
    programOutcomes:  (programId)         => req(`/obe/programs/${programId}/outcomes`),
    addPOs:           (programId, data)   => req(`/obe/programs/${programId}/outcomes`, { method: 'POST', body: data }),
    deletePO:         (id)               => req(`/obe/programs/outcomes/${id}`, { method: 'DELETE' }),
    getCOPOMapping:   (courseId)          => req(`/obe/courses/${courseId}/co-po-mapping`),
    saveCOPOMapping:  (courseId, rows)    => req(`/obe/courses/${courseId}/co-po-mapping`, { method: 'POST', body: { rows } }),
    // Analytics
    coAttainment:     (courseId, p = {})  => { const qs = new URLSearchParams(p).toString(); return req(`/obe/courses/${courseId}/attainment${qs ? '?' + qs : ''}`); },
    poAttainment:     (courseId, p = {})  => { const qs = new URLSearchParams(p).toString(); return req(`/obe/courses/${courseId}/po-attainment${qs ? '?' + qs : ''}`); },
    programPO:        (programId, p = {}) => { const qs = new URLSearchParams(p).toString(); return req(`/obe/programs/${programId}/po-attainment${qs ? '?' + qs : ''}`); },
    gaps:             (courseId, p = {})  => { const qs = new URLSearchParams(p).toString(); return req(`/obe/courses/${courseId}/gaps${qs ? '?' + qs : ''}`); },
    atRisk:           (courseId, p = {})  => { const qs = new URLSearchParams(p).toString(); return req(`/obe/courses/${courseId}/at-risk${qs ? '?' + qs : ''}`); },
  },

  // Marksheet Builder
  marksheets: {
    templates:      ()         => req('/marksheets/templates'),
    createTemplate: (data)     => req('/marksheets/templates', { method: 'POST', body: data }),
    updateTemplate: (id, data) => req(`/marksheets/templates/${id}`, { method: 'PUT', body: data }),
    deleteTemplate: (id)       => req(`/marksheets/templates/${id}`, { method: 'DELETE' }),
    generate:       (data)     => req('/marksheets/generate', { method: 'POST', body: data }),
    generatePdf:    (data)     => req('/marksheets/generate-pdf', { method: 'POST', body: data }),
    generated:      (p = {})   => {
      const qs = new URLSearchParams(p).toString();
      return req(`/marksheets/generated${qs ? '?' + qs : ''}`);
    },
    downloadUrl:    (id)       => `${BASE}/marksheets/generated/${id}/download`,
  },
};
