import { useState, useEffect } from 'react';
import { api } from '../api/client';

const STATUS_STYLE = {
  unassigned:   { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.2)' },
  assigned:     { bg: 'rgba(59,130,246,0.1)',  color: '#1d4ed8', border: 'rgba(59,130,246,0.2)' },
  under_review: { bg: 'rgba(245,158,11,0.1)',  color: '#d97706', border: 'rgba(245,158,11,0.2)' },
  moderated:    { bg: 'rgba(139,92,246,0.1)',  color: '#7c3aed', border: 'rgba(139,92,246,0.2)' },
  approved:     { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.2)' },
  rejected:     { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', border: 'rgba(239,68,68,0.2)' },
};

const STATUS_LABELS = {
  unassigned:   'Unassigned',
  assigned:     'Assigned',
  under_review: 'Under Review',
  moderated:    'Awaiting Approval',
  approved:     'Approved',
  rejected:     'Returned',
};

const STAT_GRADS = {
  blue:   'linear-gradient(135deg,#3b82f6,#6366f1)',
  gray:   'linear-gradient(135deg,#475569,#64748b)',
  yellow: 'linear-gradient(135deg,#f59e0b,#d97706)',
  purple: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  green:  'linear-gradient(135deg,#10b981,#059669)',
};

const lbl = { fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 };

function AssignModal({ paper, moderators, onClose, onAssigned }) {
  const [moderatorId, setModeratorId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAssign() {
    if (!moderatorId) { setError('Please select a moderator'); return; }
    setSaving(true);
    setError('');
    try {
      await api.moderation.assign({ paperId: paper.id, moderatorId, deadline, instructions });
      onAssigned();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Assign Moderator</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, padding: '4px 8px', color: '#475569', cursor: 'pointer', fontSize: 16 }}>
            <i className="ri-close-line" />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, padding: '10px 12px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{paper.title || paper.subject}</p>
            <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{paper.subject} · {paper.total_marks} marks</p>
          </div>
          <div>
            <label style={lbl}>Select Moderator *</label>
            <select value={moderatorId} onChange={e => setModeratorId(e.target.value)} className="form-input">
              <option value="">— Choose moderator —</option>
              {moderators.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Deadline</label>
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="form-input" />
          </div>
          <div>
            <label style={lbl}>Instructions for Moderator</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={3}
              placeholder="Enter any specific instructions or notes for the moderator..."
              className="form-input"
              style={{ resize: 'none' }}
            />
          </div>
          {error && <p style={{ fontSize: 12.5, color: '#f87171' }}>{error}</p>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(15,23,42,0.07)' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
          <button onClick={handleAssign} disabled={saving} className="btn btn-primary" style={{ fontSize: 13 }}>
            {saving ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({ paper, assignment, onClose, onAction }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handle(action) {
    setSaving(true);
    try {
      if (action === 'approve') await api.moderation.approve(assignment.assignment_id || assignment.id, notes);
      else await api.moderation.reject(assignment.assignment_id || assignment.id, notes);
      onAction();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Review Moderated Paper</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, padding: '4px 8px', color: '#475569', cursor: 'pointer', fontSize: 16 }}>
            <i className="ri-close-line" />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 8, padding: '10px 12px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{paper.title || paper.subject}</p>
            <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Moderated by {paper.moderator_name}</p>
          </div>
          <div>
            <label style={lbl}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add approval notes or rejection reason..."
              className="form-input"
              style={{ resize: 'none' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(15,23,42,0.07)' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
          <button onClick={() => handle('reject')} disabled={saving} className="btn btn-danger" style={{ fontSize: 13 }}>
            {saving ? '...' : 'Return for Revision'}
          </button>
          <button onClick={() => handle('approve')} disabled={saving} className="btn btn-primary" style={{ fontSize: 13, background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            {saving ? '...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageModal({ recipient, onClose, onSent }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSend() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.moderation.sendMessage({ recipientId: recipient.id, title, message, type: 'message' });
      onSent();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Message to {recipient.name}</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, padding: '4px 8px', color: '#475569', cursor: 'pointer', fontSize: 16 }}>
            <i className="ri-close-line" />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Subject / Title" className="form-input" />
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder="Message..."
            className="form-input"
            style={{ resize: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(15,23,42,0.07)' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
          <button onClick={handleSend} disabled={saving || !title.trim()} className="btn btn-primary" style={{ fontSize: 13 }}>
            {saving ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpertTab() {
  const [experts, setExperts] = useState([]);
  const [moderators, setModerators] = useState([]);
  const [form, setForm] = useState({ expertId: '', subjectCode: '', subjectName: '', department: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.moderation.experts(), api.moderation.moderators()])
      .then(([e, m]) => { setExperts(e.experts || []); setModerators(m.moderators || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!form.expertId || !form.subjectName) return;
    setSaving(true);
    try {
      await api.moderation.addExpert(form);
      const e = await api.moderation.experts();
      setExperts(e.experts || []);
      setForm({ expertId: '', subjectCode: '', subjectName: '', department: '' });
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    try {
      await api.moderation.removeExpert(id);
      setExperts(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <i className="ri-loader-4-line" style={{ fontSize: 24, color: '#6366f1', display: 'block', marginBottom: 8 }} />
      <p style={{ fontSize: 13, color: '#64748b' }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="dark-card" style={{ padding: 22 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Add Subject-Expert Mapping</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>Expert (Moderator) *</label>
            <select value={form.expertId} onChange={e => setForm(f => ({ ...f, expertId: e.target.value }))} className="form-input">
              <option value="">— Select moderator —</option>
              {moderators.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Subject Name *</label>
            <input value={form.subjectName} onChange={e => setForm(f => ({ ...f, subjectName: e.target.value }))} placeholder="e.g. Data Structures" className="form-input" />
          </div>
          <div>
            <label style={lbl}>Subject Code</label>
            <input value={form.subjectCode} onChange={e => setForm(f => ({ ...f, subjectCode: e.target.value }))} placeholder="e.g. CSE301" className="form-input" />
          </div>
          <div>
            <label style={lbl}>Department</label>
            <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. CSE" className="form-input" />
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving || !form.expertId || !form.subjectName} className="btn btn-primary" style={{ marginTop: 16, fontSize: 13, gap: 6 }}>
          <i className="ri-add-line" />{saving ? 'Adding...' : 'Add Mapping'}
        </button>
      </div>

      <div className="dark-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(15,23,42,0.07)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Expert Mappings <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>({experts.length})</span>
          </h3>
        </div>
        {experts.length === 0
          ? <p style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: '#475569' }}>No mappings yet.</p>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Expert', 'Subject', 'Code', 'Department', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '1px solid rgba(15,23,42,0.07)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {experts.map(e => (
                    <tr key={e.id}
                      style={{ borderBottom: '1px solid rgba(15,23,42,0.05)', transition: 'background 0.15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 16px', fontWeight: 600, color: '#0f172a' }}>{e.expert_name}</td>
                      <td style={{ padding: '11px 16px', color: '#64748b' }}>{e.subject_name}</td>
                      <td style={{ padding: '11px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>{e.subject_code || '—'}</td>
                      <td style={{ padding: '11px 16px', color: '#64748b' }}>{e.department || '—'}</td>
                      <td style={{ padding: '11px 16px' }}>
                        <button onClick={() => handleRemove(e.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, padding: '3px 10px', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}

function ModeratorsTab() {
  const [moderators, setModerators] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.moderation.moderators().then(r => setModerators(r.moderators || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) { setError('All fields required'); return; }
    setSaving(true);
    setError('');
    try {
      await api.moderation.createModerator(form);
      const r = await api.moderation.moderators();
      setModerators(r.moderators || []);
      setForm({ name: '', email: '', password: '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id, currentActive) {
    try {
      await api.moderation.toggleModerator(id, !currentActive);
      setModerators(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentActive } : m));
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <i className="ri-loader-4-line" style={{ fontSize: 24, color: '#6366f1', display: 'block', marginBottom: 8 }} />
      <p style={{ fontSize: 13, color: '#64748b' }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="dark-card" style={{ padding: 22 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Create Moderator Account</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>Full Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. Name" className="form-input" />
          </div>
          <div>
            <label style={lbl}>Email *</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" placeholder="mod@college.ac.in" className="form-input" />
          </div>
          <div>
            <label style={lbl}>Password *</label>
            <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} type="password" placeholder="••••••••" className="form-input" />
          </div>
        </div>
        {error && <p style={{ fontSize: 12.5, color: '#f87171', marginTop: 8 }}>{error}</p>}
        <button onClick={handleCreate} disabled={saving} className="btn btn-primary" style={{ marginTop: 16, fontSize: 13, gap: 6 }}>
          <i className="ri-user-add-line" />{saving ? 'Creating...' : 'Create Moderator'}
        </button>
      </div>

      <div className="dark-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(15,23,42,0.07)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Moderator Accounts <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>({moderators.length})</span>
          </h3>
        </div>
        {moderators.length === 0
          ? <p style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: '#475569' }}>No moderator accounts created yet.</p>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Name', 'Email', 'Status', 'Created', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '1px solid rgba(15,23,42,0.07)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {moderators.map(m => (
                    <tr key={m.id}
                      style={{ borderBottom: '1px solid rgba(15,23,42,0.05)', transition: 'background 0.15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 16px', fontWeight: 600, color: '#0f172a' }}>{m.name}</td>
                      <td style={{ padding: '11px 16px', color: '#64748b' }}>{m.email}</td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 9999, fontSize: 11.5, fontWeight: 600,
                          background: m.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
                          color: m.is_active ? '#6ee7b7' : '#94a3b8',
                          border: `1px solid ${m.is_active ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}`,
                        }}>
                          {m.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', color: '#64748b', fontSize: 12 }}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '11px 16px' }}>
                        <button
                          onClick={() => handleToggle(m.id, m.is_active)}
                          style={{
                            background: m.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                            border: `1px solid ${m.is_active ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}`,
                            borderRadius: 6, padding: '3px 10px',
                            color: m.is_active ? '#f87171' : '#6ee7b7',
                            cursor: 'pointer', fontSize: 12,
                          }}
                        >{m.is_active ? 'Disable' : 'Enable'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}

export default function AdminModerationPanel({ user }) {
  const [papers, setPapers] = useState([]);
  const [stats, setStats] = useState({});
  const [moderators, setModerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('papers');
  const [assignTarget, setAssignTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [messageTarget, setMessageTarget] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, s, m] = await Promise.all([
        api.moderation.list(),
        api.moderation.stats(),
        api.moderation.moderators(),
      ]);
      setPapers(p.papers || []);
      setStats(s.stats || {});
      setModerators(m.moderators || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filterStatus === 'all' ? papers : papers.filter(p => (p.moderation_status || 'unassigned') === filterStatus);

  const statCards = [
    { label: 'Total Papers',       value: stats.total || 0,                                                                        icon: 'ri-file-text-line',       color: 'blue' },
    { label: 'Awaiting Assignment', value: papers.filter(p => !p.moderation_status || p.moderation_status === 'unassigned').length, icon: 'ri-time-line',            color: 'gray' },
    { label: 'Under Review',        value: stats.under_review || 0,                                                                 icon: 'ri-edit-line',            color: 'yellow' },
    { label: 'Awaiting Approval',   value: stats.moderated || 0,                                                                    icon: 'ri-checkbox-circle-line', color: 'purple' },
    { label: 'Approved',            value: stats.approved || 0,                                                                     icon: 'ri-shield-check-line',    color: 'green' },
  ];

  return (
    <div className="space-y-6 page-fade">
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Moderation Panel</h2>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Manage question paper moderation workflow</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {statCards.map(s => (
          <div key={s.label} className="dark-card stat-card" style={{ padding: '16px 14px' }}>
            <div style={{ width: 36, height: 36, background: STAT_GRADS[s.color], borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <i className={s.icon} style={{ fontSize: 16, color: '#fff' }} />
            </div>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="tab-bar" style={{ width: 'fit-content' }}>
        {[['papers', 'ri-file-text-line', 'Papers & Assignments'], ['moderators', 'ri-user-settings-line', 'Moderator Accounts'], ['experts', 'ri-star-line', 'Expert Mapping']].map(([key, ic, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`tab-btn${tab === key ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className={ic} style={{ fontSize: 12 }} />{label}
          </button>
        ))}
      </div>

      {tab === 'moderators' && <ModeratorsTab />}
      {tab === 'experts' && <ExpertTab />}

      {tab === 'papers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'unassigned', 'assigned', 'under_review', 'moderated', 'approved', 'rejected'].map(s => {
              const active = filterStatus === s;
              const ss = STATUS_STYLE[s];
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: active ? (s === 'all' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : ss.bg) : '#f1f5f9',
                    color: active ? (s === 'all' ? '#fff' : ss.color) : '#64748b',
                    border: active ? `1px solid ${s === 'all' ? 'rgba(99,102,241,0.4)' : ss.border}` : '1px solid rgba(15,23,42,0.08)',
                  }}
                >{s === 'all' ? 'All' : STATUS_LABELS[s] || s}</button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <i className="ri-loader-4-line" style={{ fontSize: 28, color: '#6366f1', display: 'block', marginBottom: 10 }} />
              <p style={{ fontSize: 13, color: '#64748b' }}>Loading papers...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <i className="ri-file-list-3-line" style={{ fontSize: 32, color: '#374151', display: 'block', marginBottom: 10, opacity: 0.4 }} />
              <p style={{ fontSize: 13, color: '#475569' }}>No papers found.</p>
            </div>
          ) : (
            <div className="dark-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Paper / Subject', 'Marks', 'Moderator', 'Status', 'Deadline', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '1px solid rgba(15,23,42,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const status = p.moderation_status || 'unassigned';
                      const ss = STATUS_STYLE[status] || STATUS_STYLE.unassigned;
                      return (
                        <tr key={p.id}
                          style={{ borderBottom: '1px solid rgba(15,23,42,0.05)', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <p style={{ fontWeight: 600, color: '#0f172a', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{p.title || p.subject}</p>
                            <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{p.subject}</p>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.total_marks}</td>
                          <td style={{ padding: '12px 16px' }}>
                            {p.moderator_name
                              ? <div>
                                  <p style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1', margin: 0 }}>{p.moderator_name}</p>
                                  <button
                                    onClick={() => setMessageTarget({ id: p.moderator_id, name: p.moderator_name })}
                                    style={{ fontSize: 11.5, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Inter,sans-serif' }}
                                  >Message</button>
                                </div>
                              : <span style={{ fontSize: 12, color: '#475569' }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: 9999, fontSize: 11.5, fontWeight: 600,
                              background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                            }}>
                              {STATUS_LABELS[status] || status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                            {p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => setAssignTarget(p)}
                                style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', cursor: 'pointer' }}
                              >{p.moderator_id ? 'Reassign' : 'Assign'}</button>
                              {status === 'moderated' && (
                                <button
                                  onClick={() => setReviewTarget(p)}
                                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#c4b5fd', cursor: 'pointer' }}
                                >Review</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {assignTarget && (
        <AssignModal
          paper={assignTarget}
          moderators={moderators}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => { setAssignTarget(null); loadAll(); }}
        />
      )}

      {reviewTarget && (
        <ReviewModal
          paper={reviewTarget}
          assignment={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onAction={() => { setReviewTarget(null); loadAll(); }}
        />
      )}

      {messageTarget && (
        <MessageModal
          recipient={messageTarget}
          onClose={() => setMessageTarget(null)}
          onSent={() => setMessageTarget(null)}
        />
      )}
    </div>
  );
}
