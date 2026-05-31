import { useState } from 'react';

const SAMPLE_NOTIFS = [
  { id: 1, type: 'info',    title: 'Mid-Term Exam Schedule Released',    body: 'Mid-term examinations for Semester 4 will be held from March 15–22, 2026.', time: '2 hours ago', date: 'Today',    read: false },
  { id: 2, type: 'success', title: 'Assignment Graded',                  body: 'Your DSA Assignment 1 has been evaluated. Check your grades.', time: '5 hours ago', date: 'Today',    read: false },
  { id: 3, type: 'warning', title: 'Fee Payment Reminder',               body: 'Semester fee payment is due by March 31, 2026. Late payment carries a fine.', time: '2 days ago', date: 'Yesterday', read: true },
  { id: 4, type: 'info',    title: 'New LMS Resources Uploaded',         body: 'Dr. Amit Kumar has uploaded Week 6 materials for CSE301.', time: '3 days ago', date: 'Yesterday', read: true },
  { id: 5, type: 'success', title: 'Sarthi AI Evaluation Ready',            body: 'The AI-powered answer sheet evaluation system is now live.', time: '5 days ago', date: 'Older',     read: true },
];

const TYPE_CONFIG = {
  info:    { icon: 'ri-information-line', dot: '#3b82f6', borderLeft: '#3b82f6', iconBg: 'rgba(59,130,246,0.1)',  iconColor: '#93c5fd' },
  success: { icon: 'ri-check-double-line', dot: '#10b981', borderLeft: '#10b981', iconBg: 'rgba(16,185,129,0.1)', iconColor: '#6ee7b7' },
  warning: { icon: 'ri-alarm-warning-line', dot: '#f59e0b', borderLeft: '#f59e0b', iconBg: 'rgba(245,158,11,0.1)',iconColor: '#fcd34d' },
  error:   { icon: 'ri-error-warning-line', dot: '#ef4444', borderLeft: '#ef4444', iconBg: 'rgba(239,68,68,0.1)', iconColor: '#fca5a5' },
};

export default function Notifications() {
  const [notifs, setNotifs] = useState(SAMPLE_NOTIFS);
  const unread = notifs.filter(n => !n.read).length;

  const markRead = (id) => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAll  = () => setNotifs(p => p.map(n => ({ ...n, read: true })));
  const remove   = (id) => setNotifs(p => p.filter(n => n.id !== id));

  const grouped = ['Today', 'Yesterday', 'Older'].reduce((acc, g) => {
    const items = notifs.filter(n => n.date === g);
    if (items.length) acc[g] = items;
    return acc;
  }, {});

  return (
    <div className="page-fade" style={{ maxWidth: 700 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Notification Center</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {unread > 0 ? `${unread} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="btn btn-ghost" style={{ gap: 6, fontSize: 12.5 }}>
            <i className="ri-check-double-line" />Mark All Read
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0' }}>
          <i className="ri-notification-off-line" style={{ fontSize: 40, color: '#cbd5e1', display: 'block', marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#64748b' }}>No Notifications</h3>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(n => {
                  const tc = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                  return (
                    <div
                      key={n.id}
                      className={`dark-card fade-in-up notif-${n.type}`}
                      style={{
                        padding: '14px 16px',
                        display: 'flex',
                        gap: 12,
                        opacity: n.read ? 0.7 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: tc.iconBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <i className={tc.icon} style={{ fontSize: 16, color: tc.iconColor }} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                          <p style={{ fontSize: 13.5, fontWeight: n.read ? 500 : 700, color: '#0f172a', margin: 0 }}>{n.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {!n.read && (
                              <button
                                onClick={() => markRead(n.id)}
                                style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
                              >
                                Mark Read
                              </button>
                            )}
                            <button onClick={() => remove(n.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '0 2px', fontSize: 14 }}>
                              <i className="ri-close-line" />
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{n.body}</p>
                        <p style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{n.time}</p>
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <div style={{ flexShrink: 0, paddingTop: 4 }}>
                          <span className="pulse-dot" style={{
                            display: 'block', width: 8, height: 8,
                            borderRadius: '50%', background: tc.dot,
                          }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
