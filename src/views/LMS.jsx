import { useEffect, useState } from 'react';
import { api } from '../api/client';

const COURSE_GRADS = [
  'linear-gradient(135deg,#4f46e5,#6366f1)',
  'linear-gradient(135deg,#0369a1,#0ea5e9)',
  'linear-gradient(135deg,#059669,#10b981)',
  'linear-gradient(135deg,#b91c1c,#ef4444)',
  'linear-gradient(135deg,#d97706,#f59e0b)',
  'linear-gradient(135deg,#7c3aed,#8b5cf6)',
];

export default function LMS({ user, onNavigate }) {
  const [courses, setCourses] = useState([]);
  const role = user?.role || 'admin';

  useEffect(() => { api.courses.list().then(setCourses).catch(() => {}); }, []);

  const ALL_MODULES = [
    {
      icon: 'ri-pencil-ruler-line',
      label: 'AI Evaluation',
      desc: 'Grade handwritten answer sheets with Gemini AI',
      page: 'evaluation',
      grad: 'linear-gradient(135deg,#3b82f6 0%,#6366f1 100%)',
      roles: ['admin', 'faculty'],
    },
    {
      icon: 'ri-user-3-line',
      label: 'Students',
      desc: 'View and manage enrolled students',
      page: 'students',
      grad: 'linear-gradient(135deg,#0d9488 0%,#3b82f6 100%)',
      roles: ['admin'],
    },
    {
      icon: 'ri-robot-line',
      label: 'Career Counsellor',
      desc: 'AI-powered career guidance and assessment',
      page: 'counselling',
      grad: 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)',
      roles: ['admin', 'faculty', 'student'],
    },
    {
      icon: 'ri-account-circle-line',
      label: 'My Portal',
      desc: 'View your grades, profile and personal details',
      page: 'student_portal',
      grad: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
      roles: ['student'],
    },
    {
      icon: 'ri-chat-3-line',
      label: 'Feedback Board',
      desc: 'Submit feedback, complaints and suggestions',
      page: 'feedback',
      grad: 'linear-gradient(135deg,#8b5cf6 0%,#a78bfa 100%)',
      roles: ['admin', 'faculty', 'student'],
    },
  ];

  const modules = ALL_MODULES.filter(m => m.roles.includes(role));

  return (
    <div className="space-y-6 page-fade">
      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg,#4f46e5 0%,#6366f1 50%,#3b82f6 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ri-graduation-cap-line" style={{ fontSize: 18, color: '#fff' }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>Your Sarthi Learning Platform</h2>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Your Sarthi Platform · Full LMS with AI Evaluation</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '6px 14px', fontSize: 13, color: '#fff', fontWeight: 600 }}>
              {courses.length} Courses
            </span>
          </div>
        </div>
      </div>

      {/* Module cards */}
      <div>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Modules</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {modules.map(m => (
            <div
              key={m.label}
              onClick={() => onNavigate(m.page)}
              style={{
                background: '#fff',
                border: '1px solid rgba(15,23,42,0.08)',
                borderRadius: 14,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(15,23,42,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ background: m.grad, padding: '18px 18px 14px' }}>
                <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <i className={m.icon} style={{ fontSize: 18, color: '#fff' }} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{m.label}</h3>
              </div>
              <div style={{ padding: '12px 18px 16px' }}>
                <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: 0 }}>{m.desc}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, color: '#4f46e5', fontSize: 12, fontWeight: 600 }}>
                  <span>Open</span>
                  <i className="ri-arrow-right-line" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All courses */}
      <div>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Course Catalog</h3>
        {courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <i className="ri-book-open-line" style={{ fontSize: 36, color: '#cbd5e1', display: 'block', marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: '#64748b' }}>No courses yet. <button onClick={() => onNavigate('courses')} style={{ color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600 }}>Add courses</button></p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
            {courses.map((c, idx) => (
              <div
                key={c.id}
                onClick={() => onNavigate('courses')}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(15,23,42,0.08)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.08)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ background: COURSE_GRADS[idx % COURSE_GRADS.length], padding: '12px 14px' }}>
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace' }}>{c.code}</p>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '4px 0 2px', lineHeight: 1.3 }}>{c.name}</h3>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{c.department}</p>
                </div>
                <div style={{ padding: '10px 14px' }}>
                  <p style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.4, margin: 0 }}>{c.description || 'No description.'}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#64748b' }}>
                    <span><i className="ri-book-open-line" style={{ marginRight: 3 }} />{c.credits} Credits</span>
                    <span><i className="ri-user-line" style={{ marginRight: 3 }} />{c.enrolled || 0}/{c.maxStudents}</span>
                    <span>Sem {c.semester}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
