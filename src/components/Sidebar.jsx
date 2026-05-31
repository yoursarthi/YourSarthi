const ADMIN_NAV = {
  ACADEMIC: [
    { icon: 'ri-dashboard-line',      label: 'Dashboard',        page: 'dashboard' },
    { icon: 'ri-user-line',           label: 'Students',         page: 'students' },
    { icon: 'ri-team-line',           label: 'Faculty',          page: 'faculty' },
    { icon: 'ri-book-open-line',      label: 'Courses',          page: 'courses' },
  ],
  TOOLS: [
    { icon: 'ri-file-text-line',      label: 'Question Bank',    page: 'qb' },
    { icon: 'ri-brain-line',          label: 'Syllabus Engine',  page: 'syllabus' },
    { icon: 'ri-pencil-ruler-line',   label: 'AI Evaluation',    page: 'evaluation' },
    { icon: 'ri-robot-2-line',        label: 'AI Tutor',         page: 'ai_tutor' },
    { icon: 'ri-shield-check-line',   label: 'Moderation',       page: 'moderation_admin' },
  ],
  RESULTS: [
    { icon: 'ri-bar-chart-box-line',  label: 'Result Management',page: 'results' },
    { icon: 'ri-file-chart-2-line',   label: 'Marksheet Builder',page: 'marksheets' },
    { icon: 'ri-award-line',          label: 'OBE Analytics',    page: 'obe' },
  ],
  SYSTEM: [
    { icon: 'ri-graduation-cap-line', label: 'Sarthi LMS',        page: 'lms' },
    { icon: 'ri-robot-line',          label: 'Career Counsellor',page: 'counselling' },
    { icon: 'ri-database-2-line',     label: 'Data Management',  page: 'data' },
    { icon: 'ri-chat-3-line',         label: 'Feedback Board',   page: 'feedback' },
    { icon: 'ri-notification-3-line', label: 'Notifications',    page: 'notifications' },
  ],
};

const MODERATOR_NAV = {
  PORTAL: [
    { icon: 'ri-dashboard-line',      label: 'Dashboard',        page: 'dashboard' },
    { icon: 'ri-file-edit-line',      label: 'My Assignments',   page: 'moderation' },
    { icon: 'ri-notification-3-line', label: 'Notifications',    page: 'notifications' },
  ],
};

const FACULTY_NAV = {
  ACADEMIC: [
    { icon: 'ri-dashboard-line',      label: 'Dashboard',        page: 'dashboard' },
    { icon: 'ri-book-open-line',      label: 'My Courses',       page: 'courses' },
    { icon: 'ri-brain-line',          label: 'Syllabus Engine',  page: 'syllabus' },
    { icon: 'ri-pencil-ruler-line',   label: 'AI Evaluation',    page: 'evaluation' },
    { icon: 'ri-robot-2-line',        label: 'AI Tutor',         page: 'ai_tutor' },
    { icon: 'ri-bar-chart-box-line',  label: 'Result Management',page: 'results' },
    { icon: 'ri-award-line',          label: 'OBE Analytics',    page: 'obe' },
  ],
  SYSTEM: [
    { icon: 'ri-graduation-cap-line', label: 'Sarthi LMS',        page: 'lms' },
    { icon: 'ri-chat-3-line',         label: 'Feedback Board',   page: 'feedback' },
    { icon: 'ri-notification-3-line', label: 'Notifications',    page: 'notifications' },
  ],
};

const STUDENT_NAV = {
  LEARNING: [
    { icon: 'ri-dashboard-line',      label: 'Dashboard',          page: 'dashboard' },
    { icon: 'ri-book-open-line',      label: 'My Courses',         page: 'courses' },
    { icon: 'ri-account-circle-line', label: 'My Portal',          page: 'student_portal' },
    { icon: 'ri-graduation-cap-line', label: 'Sarthi LMS',          page: 'lms' },
    { icon: 'ri-bar-chart-box-line',  label: 'My Results',         page: 'results' },
  ],
  TOOLS: [
    { icon: 'ri-robot-2-line',        label: 'AI Tutor',           page: 'ai_tutor' },
    { icon: 'ri-robot-line',          label: 'Career Counsellor',  page: 'counselling' },
    { icon: 'ri-chat-3-line',         label: 'Feedback Board',     page: 'feedback' },
    { icon: 'ri-notification-3-line', label: 'Notifications',      page: 'notifications' },
  ],
};

const NAV_CONFIGS = { admin: ADMIN_NAV, moderator: MODERATOR_NAV, faculty: FACULTY_NAV, student: STUDENT_NAV };

const ROLE_LABELS = {
  admin: 'Admin Panel',
  moderator: 'Moderator Portal',
  faculty: 'Faculty Portal',
  student: 'Student Portal',
};

export default function Sidebar({ user, currentPage, onNavigate, mobileOpen, onClose }) {
  const navGroups = NAV_CONFIGS[user?.role] || ADMIN_NAV;
  const roleLabel = ROLE_LABELS[user?.role] || 'Admin Panel';
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <>
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 40, backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}
      <aside style={{
        width: 260,
        minWidth: 260,
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        borderRight: '1px solid rgba(15,23,42,0.09)',
        boxShadow: '2px 0 8px rgba(15,23,42,0.06)',
        transform: mobileOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
              }}>
                <svg viewBox="0 0 36 36" width="22" height="22">
                  <circle cx="18" cy="18" r="16" fill="rgba(255,255,255,0.2)" />
                  <text x="18" y="23" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800" fontFamily="Inter,sans-serif">YS</text>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>Your Sarthi</div>
                <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, lineHeight: 1.4 }}>{roleLabel}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, fontSize: 18 }}
            >
              <i className="ri-close-line" />
            </button>
          </div>
          <div style={{
            marginTop: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: 6,
            padding: '2px 8px',
          }}>
            <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>v2.0 · Live</span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 8px' }}>
          {Object.entries(navGroups).map(([section, items]) => (
            <div key={section}>
              <div className="sidebar-section-label">{section}</div>
              {items.map(item => (
                <button
                  key={item.page}
                  onClick={() => { onNavigate(item.page); onClose(); }}
                  className={`sidebar-item${currentPage === item.page ? ' active' : ''}`}
                >
                  <i className={`${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div style={{ borderTop: '1px solid rgba(15,23,42,0.08)', padding: '12px 14px', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              boxShadow: '0 2px 6px rgba(99,102,241,0.3)',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 6, textAlign: 'center' }}>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>Your Sarthi Platform</span>
          </div>
        </div>
      </aside>
    </>
  );
}
