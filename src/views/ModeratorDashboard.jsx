import { useState, useEffect } from 'react';
import { api } from '../api/client';

const STATUS_COLORS = {
  assigned:     'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  moderated:    'bg-purple-100 text-purple-700',
  approved:     'bg-green-100 text-green-700',
  rejected:     'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  assigned:     'Assigned',
  under_review: 'In Progress',
  moderated:    'Submitted',
  approved:     'Approved',
  rejected:     'Returned',
};

const TYPE_ICONS = {
  assignment: 'ri-file-add-line',
  moderated:  'ri-checkbox-circle-line',
  approved:   'ri-shield-check-line',
  rejected:   'ri-arrow-go-back-line',
  message:    'ri-message-3-line',
};

export default function ModeratorDashboard({ user, onOpenAssignment }) {
  const [assignments, setAssignments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('assignments');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [aRes, nRes, sRes] = await Promise.all([
        api.moderation.list(),
        api.moderation.notifications(),
        api.moderation.stats(),
      ]);
      setAssignments(aRes.assignments || []);
      setNotifications(nRes.notifications || []);
      setStats(sRes.stats || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.moderation.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
    finally { setMarkingAll(false); }
  }

  async function markRead(id) {
    try {
      await api.moderation.markNotifRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  }

  const unread = notifications.filter(n => !n.is_read).length;

  const statCards = [
    { label: 'Total Assigned', value: stats.total || 0, icon: 'ri-file-text-line', color: 'bg-blue-50 text-blue-700' },
    { label: 'In Progress', value: stats.under_review || 0, icon: 'ri-edit-line', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Submitted', value: stats.moderated || 0, icon: 'ri-send-plane-line', color: 'bg-purple-50 text-purple-700' },
    { label: 'Approved', value: stats.approved || 0, icon: 'ri-shield-check-line', color: 'bg-green-50 text-green-700' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
              <i className={`${s.icon} text-lg`} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setTab('assignments')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'assignments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >My Assignments</button>
        <button
          onClick={() => setTab('notifications')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors relative ${tab === 'notifications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Notifications
          {unread > 0 && <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{unread}</span>}
        </button>
      </div>

      {/* Assignments tab */}
      {tab === 'assignments' && (
        assignments.length === 0
          ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <i className="ri-file-text-line text-5xl text-gray-300 mb-4 block" />
              <p className="text-gray-500 font-medium">No assignments yet</p>
              <p className="text-sm text-gray-400 mt-1">You'll see your moderation assignments here once admin assigns them.</p>
            </div>
          )
          : (
            <div className="space-y-3">
              {assignments.map(a => {
                const status = a.status;
                const isOverdue = a.deadline && new Date(a.deadline) < new Date() && !['approved', 'moderated'].includes(status);
                return (
                  <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-800 truncate">{a.paper_title || a.subject}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                            {STATUS_LABELS[status] || status}
                          </span>
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">Overdue</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{a.subject} • {a.total_marks} marks</p>
                        {a.instructions && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{a.instructions}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          {a.deadline && (
                            <span><i className="ri-calendar-line mr-1" />Deadline: {new Date(a.deadline).toLocaleDateString()}</span>
                          )}
                          {a.assigned_by_name && (
                            <span><i className="ri-user-line mr-1" />Assigned by {a.assigned_by_name}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenAssignment(a.id)}
                        className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {status === 'assigned' ? 'Start Review' : status === 'under_review' ? 'Continue' : 'View'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
      )}

      {/* Notifications tab */}
      {tab === 'notifications' && (
        <div className="space-y-3">
          {unread > 0 && (
            <div className="flex justify-end">
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >{markingAll ? 'Marking...' : 'Mark all as read'}</button>
            </div>
          )}
          {notifications.length === 0
            ? (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <i className="ri-notification-off-line text-5xl text-gray-300 mb-4 block" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            )
            : notifications.map(n => (
              <div
                key={n.id}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${n.is_read ? 'border-gray-200' : 'border-blue-300 bg-blue-50/30'}`}
                onClick={() => { if (!n.is_read) markRead(n.id); }}
              >
                <div className="flex gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.is_read ? 'bg-gray-100' : 'bg-blue-100'}`}>
                    <i className={`${TYPE_ICONS[n.type] || 'ri-notification-line'} text-sm ${n.is_read ? 'text-gray-500' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {n.sender_name && `From ${n.sender_name} • `}
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
