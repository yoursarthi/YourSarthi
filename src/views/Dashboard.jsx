import { useEffect, useState } from 'react';
import { api } from '../api/client';

const PLACEMENT = [
  { val: '92%',  label: 'Placed',     color: '#4f46e5' },
  { val: '₹24L', label: 'Highest',    color: '#059669' },
  { val: '₹6.5L',label: 'Average',    color: '#7c3aed' },
  { val: '150+', label: 'Recruiters', color: '#d97706' },
];

const ADMIN_STATS = [
  { label: 'Total Students',  key: 'students',    page: 'students',   icon: 'ri-user-3-line',       grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)', sub: 'Active records', trend: '+2 this month' },
  { label: 'Total Faculty',   key: 'faculty',     page: 'faculty',    icon: 'ri-team-line',          grad: 'linear-gradient(135deg,#10b981,#059669)', sub: 'Teaching staff',  trend: 'Full roster' },
  { label: 'Active Courses',  key: 'courses',     page: 'courses',    icon: 'ri-book-open-line',     grad: 'linear-gradient(135deg,#f59e0b,#d97706)', sub: 'In catalog',      trend: 'All active' },
  { label: 'AI Evaluations',  key: 'evaluations', page: 'evaluation', icon: 'ri-pencil-ruler-line',  grad: 'linear-gradient(135deg,#3b82f6,#6366f1)', sub: 'Sheets graded',   trend: 'This session' },
];

const FACULTY_STATS = [
  { label: 'Active Courses',  key: 'courses',     page: 'courses',    icon: 'ri-book-open-line',    grad: 'linear-gradient(135deg,#f59e0b,#d97706)', sub: 'In catalog',    trend: 'All active' },
  { label: 'AI Evaluations',  key: 'evaluations', page: 'evaluation', icon: 'ri-pencil-ruler-line', grad: 'linear-gradient(135deg,#3b82f6,#6366f1)', sub: 'Sheets graded',  trend: 'This session' },
];

const ADMIN_ACTIONS = [
  { icon: 'ri-user-add-line',       label: 'Add Student',      desc: 'Enroll new students',           page: 'students',   grad: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)' },
  { icon: 'ri-pencil-ruler-line',   label: 'AI Evaluation',    desc: 'Grade answer sheets with AI',    page: 'evaluation', grad: 'linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)' },
  { icon: 'ri-robot-line',          label: 'Career Counsellor',desc: 'AI career guidance',             page: 'counselling',grad: 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)' },
  { icon: 'ri-graduation-cap-line', label: 'Sarthi LMS',        desc: 'Open full LMS hub',             page: 'lms',        grad: 'linear-gradient(135deg,#10b981 0%,#3b82f6 100%)' },
  { icon: 'ri-database-2-line',     label: 'Data Management',  desc: 'Import, export & manage data',  page: 'data',       grad: 'linear-gradient(135deg,#14b8a6 0%,#10b981 100%)' },
  { icon: 'ri-chat-3-line',         label: 'Feedback Board',   desc: 'View & manage feedback',        page: 'feedback',   grad: 'linear-gradient(135deg,#8b5cf6 0%,#a78bfa 100%)' },
];

const FACULTY_ACTIONS = [
  { icon: 'ri-book-open-line',      label: 'My Courses',       desc: 'View enrolled courses',         page: 'courses',    grad: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' },
  { icon: 'ri-pencil-ruler-line',   label: 'AI Evaluation',    desc: 'Grade answer sheets with AI',    page: 'evaluation', grad: 'linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)' },
  { icon: 'ri-graduation-cap-line', label: 'Sarthi LMS',        desc: 'Open full LMS hub',             page: 'lms',        grad: 'linear-gradient(135deg,#10b981 0%,#3b82f6 100%)' },
  { icon: 'ri-chat-3-line',         label: 'Feedback Board',   desc: 'Submit feedback & suggestions', page: 'feedback',   grad: 'linear-gradient(135deg,#8b5cf6 0%,#a78bfa 100%)' },
];

const STUDENT_ACTIONS = [
  { icon: 'ri-book-open-line',      label: 'My Courses',       desc: 'View enrolled courses',         page: 'courses',       grad: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' },
  { icon: 'ri-account-circle-line', label: 'My Portal',        desc: 'Grades, profile & details',     page: 'student_portal',grad: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)' },
  { icon: 'ri-graduation-cap-line', label: 'Sarthi LMS',        desc: 'Open full LMS hub',             page: 'lms',           grad: 'linear-gradient(135deg,#10b981 0%,#3b82f6 100%)' },
  { icon: 'ri-robot-line',          label: 'Career Counsellor',desc: 'AI career guidance',             page: 'counselling',   grad: 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)' },
];

const ADMIN_QUICK = [
  { label: 'Add Student',      page: 'students',   icon: 'ri-user-add-line' },
  { label: 'Evaluate Sheets',  page: 'evaluation', icon: 'ri-pencil-ruler-line' },
  { label: 'Career Assessment',page: 'counselling',icon: 'ri-robot-line' },
  { label: 'Feedback Board',   page: 'feedback',   icon: 'ri-chat-3-line' },
  { label: 'Open Sarthi LMS',  page: 'lms',        icon: 'ri-graduation-cap-line' },
];
const FACULTY_QUICK = [
  { label: 'Evaluate Sheets',  page: 'evaluation', icon: 'ri-pencil-ruler-line' },
  { label: 'My Courses',       page: 'courses',    icon: 'ri-book-open-line' },
  { label: 'Feedback Board',   page: 'feedback',   icon: 'ri-chat-3-line' },
  { label: 'Open Sarthi LMS',  page: 'lms',        icon: 'ri-graduation-cap-line' },
];
const STUDENT_QUICK = [
  { label: 'My Courses',       page: 'courses',       icon: 'ri-book-open-line' },
  { label: 'My Grades',        page: 'student_portal',icon: 'ri-account-circle-line' },
  { label: 'Open Sarthi LMS',  page: 'lms',           icon: 'ri-graduation-cap-line' },
  { label: 'Career Counsellor',page: 'counselling',   icon: 'ri-robot-line' },
];

const RECENT_ACTIVITY = [
  { dot: '#10b981', text: 'AI Evaluation module upgraded with Gemini 2.5', time: 'Just now' },
  { dot: '#6366f1', text: 'Student portal launched with grades & profile', time: '1 day ago' },
  { dot: '#f59e0b', text: 'Moderation system went live', time: '3 days ago' },
  { dot: '#3b82f6', text: 'Question bank seeded with 143 questions', time: '1 week ago' },
  { dot: '#8b5cf6', text: 'Syllabus engine enabled for all courses', time: '2 weeks ago' },
];

export default function Dashboard({ user, onNavigate }) {
  const [stats, setStats] = useState({ students: 0, faculty: 0, courses: 0, questions: 0, evaluations: 0 });
  const role = user?.role || 'admin';

  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);

  const statCards   = role === 'admin' ? ADMIN_STATS : role === 'faculty' ? FACULTY_STATS : [];
  const quickGrid   = role === 'admin' ? ADMIN_ACTIONS : role === 'faculty' ? FACULTY_ACTIONS : STUDENT_ACTIONS;
  const sideActions = role === 'admin' ? ADMIN_QUICK : role === 'faculty' ? FACULTY_QUICK : STUDENT_QUICK;

  return (
    <div className="space-y-6 page-fade">
      {/* Student welcome banner */}
      {role === 'student' && (
        <div style={{
          background: 'linear-gradient(135deg,#4f46e5 0%,#6366f1 50%,#3b82f6 100%)',
          borderRadius: 16,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>Welcome back,</p>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>{user?.name}</h2>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              {user?.program} · {user?.department?.split(' ')[0]} · Batch {user?.batch}
            </p>
          </div>
          <div style={{
            width: 52, height: 52,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff',
            border: '2px solid rgba(255,255,255,0.3)',
          }}>
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}

      {/* Stat cards */}
      {statCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statCards.length}, 1fr)`, gap: 16 }} className="sm:grid-cols-2">
          {statCards.map(s => (
            <div
              key={s.key}
              className="dark-card stat-card"
              style={{ padding: '20px 22px', cursor: 'pointer' }}
              onClick={() => onNavigate(s.page)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>{s.label}</p>
                  <p style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats[s.key] ?? 0}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: '#059669' }}>
                      <i className="ri-arrow-up-line" /> {s.trend}
                    </span>
                  </div>
                </div>
                <div style={{
                  width: 44, height: 44,
                  background: s.grad,
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <i className={s.icon} style={{ fontSize: 20, color: '#fff' }} />
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Quick Access grid */}
        <div className="dark-card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Quick Access</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 12 }}>
            {quickGrid.map(a => (
              <div
                key={a.label}
                onClick={() => onNavigate(a.page)}
                className="action-card"
                style={{
                  background: '#f8fafc',
                  border: '1px solid rgba(15,23,42,0.08)',
                  borderRadius: 12,
                  padding: '16px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(15,23,42,0.08)'; }}
              >
                <div style={{
                  width: 36, height: 36,
                  background: a.grad,
                  borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10,
                }}>
                  <i className={a.icon} style={{ fontSize: 17, color: '#fff' }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 3 }}>{a.label}</p>
                <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{a.desc}</p>
                <i className="ri-arrow-right-up-line" style={{
                  position: 'absolute', top: 12, right: 12,
                  fontSize: 14, color: '#94a3b8',
                }} />
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div style={{ marginTop: 22 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 12 }}>Recent Activity</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {RECENT_ACTIVITY.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid rgba(15,23,42,0.06)',
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', background: a.dot, flexShrink: 0, marginTop: 4,
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12.5, color: '#334155' }}>{a.text}</p>
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Quick Actions */}
          <div className="dark-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sideActions.map(a => (
                <button
                  key={a.label}
                  onClick={() => onNavigate(a.page)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px',
                    background: '#f8fafc',
                    border: '1px solid rgba(15,23,42,0.08)',
                    borderRadius: 9,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s',
                    color: '#334155',
                    fontSize: 12.5,
                    fontWeight: 500,
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.color = '#4f46e5'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(15,23,42,0.08)'; e.currentTarget.style.color = '#334155'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className={a.icon} style={{ fontSize: 14 }} />
                    {a.label}
                  </div>
                  <i className="ri-arrow-right-line" style={{ fontSize: 13 }} />
                </button>
              ))}
            </div>
          </div>

          {/* Placement stats */}
          <div style={{
            borderRadius: 12,
            padding: 18,
            background: 'linear-gradient(135deg,rgba(99,102,241,0.06) 0%,rgba(139,92,246,0.04) 100%)',
            border: '1px solid rgba(99,102,241,0.15)',
          }}>
            <h4 style={{ fontSize: 12.5, fontWeight: 600, color: '#4f46e5', marginBottom: 12 }}>
              <i className="ri-bar-chart-2-line" style={{ marginRight: 6 }} />Placement Stats
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {PLACEMENT.map(p => (
                <div key={p.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: p.color, lineHeight: 1.2 }}>{p.val}</p>
                  <p style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>{p.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
