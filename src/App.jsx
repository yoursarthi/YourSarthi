import { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import Sidebar from './components/Sidebar';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Students from './views/Students';
import Faculty from './views/Faculty';
import Courses from './views/Courses';
import QuestionBank from './views/QuestionBank';
import Evaluation from './views/Evaluation';
import LMS from './views/LMS';
import CareerCounsellor from './views/CareerCounsellor';
import DataManagement from './views/DataManagement';
import Notifications from './views/Notifications';
import StudentPortal from './views/StudentPortal';
import SyllabusEngine from './views/SyllabusEngine';
import AdminModerationPanel from './views/AdminModerationPanel';
import ModeratorDashboard from './views/ModeratorDashboard';
import ModerationEditor from './views/ModerationEditor';
import Feedback from './views/Feedback';
import AITutor from './views/AITutor';
import ResultManagement from './views/ResultManagement';
import MarksheetBuilder from './views/MarksheetBuilder';
import OBEAnalytics from './views/OBEAnalytics';
import WellBot from './views/WellBot';

const PAGE_TITLES = {
  dashboard:        'Dashboard',
  students:         'Sarthi Students',
  faculty:          'Sarthi Faculty',
  courses:          'Sarthi Courses',
  qb:               'Question Bank',
  syllabus:         'Syllabus Engine',
  evaluation:       'AI Evaluation',
  lms:              'Sarthi Hub',
  counselling:      'Career Counsellor',
  data:             'Data Management',
  notifications:    'Notifications',
  student_portal:   'My Portal',
  moderation_admin: 'Moderation',
  moderation:       'My Assignments',
  feedback:         'Feedback Board',
  ai_tutor:         'AI Tutor',
  results:          'Result Management',
  marksheets:       'Marksheet Builder',
  obe:              'OBE Analytics',
  wellbot:          'Well-Bot AI',
};

const PAGE_SUBTITLES = {
  results:    'Component-wise marks entry and management',
  marksheets: 'Dynamic marksheet generation with configurable weightages',
  obe:        'CO & PO attainment tracking for NBA / NAAC accreditation',
  dashboard:        'Your Sarthi Platform',
  students:         'Manage enrolled students',
  faculty:          'Teaching staff directory',
  courses:          'Course catalog',
  qb:               'Practice question repository',
  syllabus:         'AI-powered syllabus understanding',
  evaluation:       'AI answer sheet grading',
  lms:              'Full LMS with AI evaluation',
  counselling:      'Sarthi Career Guidance',
  data:             'Import, export & manage university data',
  notifications:    'Stay up to date',
  student_portal:   'Your profile, grades & courses',
  moderation_admin: 'Paper review & moderation',
  moderation:       'Your assigned papers',
  feedback:         'Submit feedback, complaints & suggestions',
  ai_tutor:         'Course-specific AI powered by Ollama + Qwen2.5',
  wellbot:          'AI Mental Wellness Assistant · Coming Soon',
};

const ALLOWED_PAGES = {
  admin:     ['dashboard','students','faculty','courses','qb','syllabus','evaluation','lms','counselling','data','notifications','moderation_admin','feedback','ai_tutor','results','marksheets','obe','wellbot'],
  moderator: ['dashboard','moderation','notifications','feedback','wellbot'],
  faculty:   ['dashboard','courses','syllabus','evaluation','lms','notifications','feedback','ai_tutor','results','obe','wellbot'],
  student:   ['dashboard','courses','student_portal','lms','counselling','notifications','feedback','ai_tutor','results','wellbot'],
};

function Main() {
  const toast = useToast();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('itm_user')); } catch { return null; }
  });
  const [moderationAssignmentId, setModerationAssignmentId] = useState(null);
  const [aiTutorCourse, setAiTutorCourse] = useState({ id: null, name: '' });
  const [page, setPage] = useState('dashboard');
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [notifCount] = useState(3);

  const handleLogin = (u) => {
    localStorage.setItem('itm_user', JSON.stringify(u));
    setUser(u);
    toast(`Welcome back, ${u.name}!`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('itm_user');
    setUser(null);
    setPage('dashboard');
  };

  const navigate = (p, extra = {}) => {
    const allowed = ALLOWED_PAGES[user?.role] || ALLOWED_PAGES.admin;
    if (p === 'student_portal' && user?.role !== 'student') return;
    if (!allowed.includes(p) && p !== 'student_portal') {
      setPage('dashboard');
      setMobileSidebar(false);
      return;
    }
    if (extra.assignmentId) setModerationAssignmentId(extra.assignmentId);
    if (extra.courseId) setAiTutorCourse({ id: extra.courseId, name: extra.courseName || '' });
    setPage(p);
    setMobileSidebar(false);
    document.getElementById('main-content')?.scrollTo(0, 0);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const renderPage = () => {
    const role = user?.role;
    switch (page) {
      case 'dashboard':        return <Dashboard user={user} onNavigate={navigate} />;
      case 'students':         return role === 'admin' ? <Students user={user} onNavigate={navigate} /> : <Dashboard user={user} onNavigate={navigate} />;
      case 'faculty':          return role === 'admin' ? <Faculty user={user} /> : <Dashboard user={user} onNavigate={navigate} />;
      case 'courses':          return <Courses user={user} onNavigate={navigate} />;
      case 'qb':               return role !== 'student' ? <QuestionBank user={user} /> : <Dashboard user={user} onNavigate={navigate} />;
      case 'syllabus':         return role !== 'student' ? <SyllabusEngine user={user} /> : <Dashboard user={user} onNavigate={navigate} />;
      case 'evaluation':       return role !== 'student' ? <Evaluation user={user} /> : <Dashboard user={user} onNavigate={navigate} />;
      case 'lms':              return <LMS user={user} onNavigate={navigate} />;
      case 'counselling':      return <CareerCounsellor />;
      case 'data':             return role === 'admin' ? <DataManagement /> : <Dashboard user={user} onNavigate={navigate} />;
      case 'notifications':    return <Notifications />;
      case 'student_portal':   return role === 'student' ? <StudentPortal user={user} /> : <Dashboard user={user} onNavigate={navigate} />;
      case 'moderation_admin': return role === 'admin' ? <AdminModerationPanel user={user} onNavigate={navigate} /> : <Dashboard user={user} onNavigate={navigate} />;
      case 'moderation':       return role === 'moderator'
        ? (moderationAssignmentId
          ? <ModerationEditor user={user} assignmentId={moderationAssignmentId} onBack={() => setModerationAssignmentId(null)} />
          : <ModeratorDashboard user={user} onNavigate={navigate} onOpenAssignment={(id) => setModerationAssignmentId(id)} />)
        : <Dashboard user={user} onNavigate={navigate} />;
      case 'feedback':         return <Feedback user={user} />;
      case 'ai_tutor':         return <AITutor courseId={aiTutorCourse.id} courseName={aiTutorCourse.name} user={user} />;
      case 'results':          return <ResultManagement user={user} />;
      case 'marksheets':       return role === 'admin' ? <MarksheetBuilder user={user} /> : <Dashboard user={user} onNavigate={navigate} />;
      case 'obe':              return <OBEAnalytics user={user} />;
      case 'wellbot':          return <WellBot />;
      default: return <Dashboard user={user} onNavigate={navigate} />;
    }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar
        user={user}
        currentPage={page}
        onNavigate={navigate}
        mobileOpen={mobileSidebar}
        onClose={() => setMobileSidebar(false)}
      />

      <div className="lg:ml-[260px]" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Header */}
        <header className="app-header" style={{ flexShrink: 0, padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setMobileSidebar(true)}
              className="lg:hidden"
              style={{ background: 'rgba(15,23,42,0.06)', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, padding: '6px 8px', color: '#64748b', cursor: 'pointer' }}
            >
              <i className="ri-menu-line" style={{ fontSize: 18 }} />
            </button>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                {PAGE_TITLES[page] || 'Dashboard'}
              </h2>
              <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0 }}>
                {PAGE_SUBTITLES[page] || 'Your Sarthi Platform'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Notification bell */}
            <button
              onClick={() => navigate('notifications')}
              style={{
                position: 'relative',
                background: 'rgba(15,23,42,0.05)',
                border: '1px solid rgba(15,23,42,0.1)',
                borderRadius: 8,
                padding: '7px 9px',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <i className="ri-notification-3-line" style={{ fontSize: 17 }} />
              {notifCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 7, height: 7,
                  background: '#ef4444',
                  borderRadius: '50%',
                  border: '1.5px solid #ffffff',
                }} />
              )}
            </button>

            {/* User avatar + logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                boxShadow: '0 2px 6px rgba(99,102,241,0.3)',
              }}>
                {initials}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: '#b91c1c',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <i className="ri-logout-box-r-line" style={{ fontSize: 14 }} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto page-fade"
          style={{ background: 'var(--bg)', padding: '24px 24px' }}
        >
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Main />
    </ToastProvider>
  );
}
