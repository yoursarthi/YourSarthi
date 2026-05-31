import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import Modal from '../components/ui/Modal';

// ── Config maps ────────────────────────────────────────────────────────────────
const SUBMISSION_TYPES = {
  feedback:           { icon: 'ri-chat-3-line',         label: 'General Feedback',    color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  complaint:          { icon: 'ri-error-warning-line',   label: 'Complaint',           color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  suggestion:         { icon: 'ri-lightbulb-line',       label: 'Suggestion',          color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  faculty_review:     { icon: 'ri-user-star-line',       label: 'Faculty Review',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  course_feedback:    { icon: 'ri-book-open-line',       label: 'Course Feedback',     color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  hostel_complaint:   { icon: 'ri-home-3-line',          label: 'Hostel Complaint',    color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  academic_issue:     { icon: 'ri-graduation-cap-line',  label: 'Academic Issue',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  examination_issue:  { icon: 'ri-file-edit-line',       label: 'Examination Issue',   color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
};

const TARGET_TYPES = {
  public:         { icon: 'ri-global-line',         label: 'Public Feedback Board',     desc: 'Visible to everyone' },
  faculty:        { icon: 'ri-user-2-line',          label: 'Faculty',                   desc: 'Directed to a specific faculty member' },
  coe:            { icon: 'ri-building-line',        label: 'Controller of Examination', desc: 'Exam-related issues' },
  dsw:            { icon: 'ri-shield-user-line',     label: 'Dean Student Welfare',      desc: 'Student welfare concerns' },
  df:             { icon: 'ri-award-line',            label: 'Dean Faculty',              desc: 'Faculty-related administrative issues' },
  hostel_warden:  { icon: 'ri-home-gear-line',       label: 'Chief Hostel Warden',       desc: 'Hostel-related matters' },
  proctor:        { icon: 'ri-eye-line',             label: 'Chief Proctor',             desc: 'Discipline & conduct matters' },
  course:         { icon: 'ri-book-2-line',          label: 'Course',                    desc: 'Feedback about a specific course' },
};

const STATUS_CONFIG = {
  pending:      { icon: 'ri-time-line',           label: 'Pending',      color: '#d97706', bg: 'rgba(245,158,11,0.1)' },
  under_review: { icon: 'ri-search-eye-line',     label: 'Under Review', color: '#2563eb', bg: 'rgba(59,130,246,0.1)' },
  resolved:     { icon: 'ri-check-double-line',   label: 'Resolved',     color: '#059669', bg: 'rgba(16,185,129,0.1)' },
  rejected:     { icon: 'ri-close-circle-line',   label: 'Rejected',     color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
};

const VISIBILITY_CONFIG = {
  public:           { icon: 'ri-eye-line',        label: 'Public',          desc: 'Visible to all users' },
  anonymous_public: { icon: 'ri-spy-line',        label: 'Anonymous',       desc: 'Public but your identity is hidden' },
  private:          { icon: 'ri-lock-line',       label: 'Private',         desc: 'Only you and admin can see this' },
};

// Types that need faculty selection
const FACULTY_TARGET_TYPES = new Set(['faculty', 'df']);
// Types that need course selection
const COURSE_TARGET_TYPES = new Set(['course']);

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Badge({ icon, label, color, bg }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 9999, fontSize: 11, fontWeight: 600, color, background: bg, border: `1px solid ${color}22` }}>
      <i className={icon} style={{ fontSize: 11 }} />{label}
    </span>
  );
}

// ── Multi-step submission form ────────────────────────────────────────────────
function SubmitForm({ onClose, onCreated, faculties, courses }) {
  const toast = useToast();
  const [step, setStep] = useState(1); // 1=type, 2=target, 3=details, 4=privacy
  const [form, setForm] = useState({
    submissionType: '',
    targetType: 'public',
    targetId: null,
    targetName: '',
    title: '',
    content: '',
    visibility: 'public',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const selectedType = SUBMISSION_TYPES[form.submissionType];
  const selectedTarget = TARGET_TYPES[form.targetType];
  const selectedStatus = STATUS_CONFIG.pending;

  const needsFaculty = FACULTY_TARGET_TYPES.has(form.targetType);
  const needsCourse  = COURSE_TARGET_TYPES.has(form.targetType);

  const canNext = {
    1: !!form.submissionType,
    2: !!form.targetType && (!needsFaculty || !!form.targetId) && (!needsCourse || !!form.targetId),
    3: !!form.title.trim() && !!form.content.trim(),
    4: !!form.visibility,
  };

  const handleSubmit = async () => {
    if (!canNext[3]) return;
    setSubmitting(true);
    try {
      const created = await api.feedback.submit(form);
      onCreated(created);
      toast('Submission sent successfully!', 'success');
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ['Type', 'Target', 'Details', 'Privacy'];

  return (
    <div style={{ minWidth: 500, maxWidth: 640 }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(15,23,42,0.08)' }}>
        {steps.map((s, i) => {
          const idx = i + 1;
          const done = idx < step;
          const active = idx === step;
          return (
            <div key={s} style={{ flex: 1, padding: '9px 12px', textAlign: 'center', fontSize: 12, fontWeight: 600,
              background: done ? 'rgba(99,102,241,0.12)' : active ? '#6366f1' : '#f8fafc',
              color: done ? '#6366f1' : active ? '#fff' : '#94a3b8',
              borderRight: idx < 4 ? '1px solid rgba(15,23,42,0.08)' : 'none',
              cursor: done ? 'pointer' : 'default',
              transition: 'all .2s',
            }} onClick={() => done && setStep(idx)}>
              {done ? <i className="ri-check-line" style={{ marginRight: 4 }} /> : `${idx}. `}{s}
            </div>
          );
        })}
      </div>

      {/* Step 1: Type */}
      {step === 1 && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 14 }}>What type of submission is this?</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {Object.entries(SUBMISSION_TYPES).map(([key, cfg]) => (
              <button key={key} type="button" onClick={() => set('submissionType', key)} style={{
                padding: '12px 14px', borderRadius: 10, textAlign: 'left',
                border: `1.5px solid ${form.submissionType === key ? cfg.color : 'rgba(15,23,42,0.1)'}`,
                background: form.submissionType === key ? cfg.bg : '#f8fafc',
                cursor: 'pointer', transition: 'all .15s', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <i className={cfg.icon} style={{ fontSize: 20, color: form.submissionType === key ? cfg.color : '#94a3b8', flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: form.submissionType === key ? cfg.color : '#475569' }}>{cfg.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Target */}
      {step === 2 && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 14 }}>Who should receive this submission?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(TARGET_TYPES).map(([key, cfg]) => (
              <button key={key} type="button" onClick={() => { set('targetType', key); set('targetId', null); set('targetName', ''); }} style={{
                padding: '11px 14px', borderRadius: 9, textAlign: 'left',
                border: `1.5px solid ${form.targetType === key ? '#6366f1' : 'rgba(15,23,42,0.1)'}`,
                background: form.targetType === key ? 'rgba(99,102,241,0.07)' : '#f8fafc',
                cursor: 'pointer', transition: 'all .15s', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <i className={cfg.icon} style={{ fontSize: 18, color: form.targetType === key ? '#6366f1' : '#94a3b8', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: form.targetType === key ? '#4f46e5' : '#0f172a' }}>{cfg.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{cfg.desc}</div>
                </div>
                {form.targetType === key && <i className="ri-checkbox-circle-fill" style={{ marginLeft: 'auto', color: '#6366f1', fontSize: 16 }} />}
              </button>
            ))}
          </div>

          {/* Dynamic dropdowns */}
          {needsFaculty && (
            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Select Faculty Member *</label>
              <select value={form.targetId || ''} onChange={e => {
                const fac = faculties.find(f => f.id === e.target.value);
                set('targetId', e.target.value || null);
                set('targetName', fac ? fac.name : '');
              }} style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 7, fontSize: 13, background: '#f8fafc', color: '#0f172a' }}>
                <option value="">— Choose faculty member —</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name} ({f.department || f.dept || ''})</option>)}
              </select>
            </div>
          )}
          {needsCourse && (
            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Select Course *</label>
              <select value={form.targetId || ''} onChange={e => {
                const c = courses.find(c => c.id === e.target.value);
                set('targetId', e.target.value || null);
                set('targetName', c ? `${c.code} — ${c.name}` : '');
              }} style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 7, fontSize: 13, background: '#f8fafc', color: '#0f172a' }}>
                <option value="">— Choose course —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Title & Content */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {selectedType && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, background: selectedType.bg, border: `1px solid ${selectedType.color}22` }}>
              <i className={selectedType.icon} style={{ fontSize: 18, color: selectedType.color }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: selectedType.color }}>{selectedType.label}</div>
                {selectedTarget && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>→ {selectedTarget.label}{form.targetName ? `: ${form.targetName}` : ''}</div>}
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Brief summary of your submission"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 7, fontSize: 13, background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Detailed Description *</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)} required rows={6}
              placeholder="Describe the issue, suggestion, or feedback in detail. Include specific examples, affected dates, or any relevant information…"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 7, fontSize: 13, background: '#f8fafc', color: '#0f172a', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        </div>
      )}

      {/* Step 4: Privacy */}
      {step === 4 && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 14 }}>Who can see your submission?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(VISIBILITY_CONFIG).map(([key, cfg]) => (
              <button key={key} type="button" onClick={() => set('visibility', key)} style={{
                padding: '13px 16px', borderRadius: 10, textAlign: 'left',
                border: `1.5px solid ${form.visibility === key ? '#6366f1' : 'rgba(15,23,42,0.1)'}`,
                background: form.visibility === key ? 'rgba(99,102,241,0.07)' : '#f8fafc',
                cursor: 'pointer', transition: 'all .15s', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <i className={cfg.icon} style={{ fontSize: 20, color: form.visibility === key ? '#6366f1' : '#94a3b8', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: form.visibility === key ? '#4f46e5' : '#0f172a' }}>{cfg.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{cfg.desc}</div>
                </div>
                {form.visibility === key && <i className="ri-checkbox-circle-fill" style={{ marginLeft: 'auto', color: '#6366f1', fontSize: 18 }} />}
              </button>
            ))}
          </div>

          {/* Preview summary */}
          <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Summary</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Type', value: SUBMISSION_TYPES[form.submissionType]?.label },
                { label: 'Target', value: TARGET_TYPES[form.targetType]?.label + (form.targetName ? ` — ${form.targetName}` : '') },
                { label: 'Title', value: form.title },
                { label: 'Visibility', value: VISIBILITY_CONFIG[form.visibility]?.label },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#64748b', minWidth: 70 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(15,23,42,0.08)' }}>
        <button type="button" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid rgba(15,23,42,0.12)', background: '#f8fafc', color: '#475569', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className={step > 1 ? 'ri-arrow-left-line' : 'ri-close-line'} />{step > 1 ? 'Back' : 'Cancel'}
        </button>
        {step < 4 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext[step]} style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: canNext[step] ? '#6366f1' : '#e2e8f0', color: canNext[step] ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 600, cursor: canNext[step] ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s' }}>
            Next <i className="ri-arrow-right-line" />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting || !canNext[3]} style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
            {submitting ? <><i className="ri-loader-4-line spin" />Submitting…</> : <><i className="ri-send-plane-line" />Submit</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ fb, user, onClose, onStatusChange, onDelete }) {
  const toast = useToast();
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(true);

  const isAdmin = user?.role === 'admin';
  const isOwner = user?.id === fb.authorId;

  useEffect(() => {
    api.feedback.replies(fb.id)
      .then(setReplies)
      .catch(() => setReplies([]))
      .finally(() => setLoadingReplies(false));
  }, [fb.id]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      const r = await api.feedback.reply(fb.id, { content: replyText });
      setReplies(p => [...p, r]);
      setReplyText('');
    } catch (err) { toast(err.message || 'Failed to post reply', 'error'); }
  };

  const typeC  = SUBMISSION_TYPES[fb.type] || SUBMISSION_TYPES[fb.submissionType] || SUBMISSION_TYPES.feedback;
  const statC  = STATUS_CONFIG[fb.status] || STATUS_CONFIG.pending;
  const targetC = TARGET_TYPES[fb.targetType] || TARGET_TYPES.public;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 700, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              <Badge icon={typeC.icon} label={typeC.label} color={typeC.color} bg={typeC.bg} />
              <Badge icon={statC.icon} label={statC.label} color={statC.color} bg={statC.bg} />
              <Badge icon={targetC.icon} label={targetC.label + (fb.targetName ? ` — ${fb.targetName}` : '')} color="#64748b" bg="rgba(100,116,139,0.08)" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>{fb.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {fb.authorName?.[0]?.toUpperCase() || '?'}
              </div>
              <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 600 }}>{fb.authorName}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>· {fb.authorRole} · {timeAgo(fb.createdAt)}</span>
              {/* Admin sees real identity for anonymous */}
              {isAdmin && fb.anonAuthorName && (
                <span style={{ fontSize: 10.5, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', padding: '1px 7px', borderRadius: 4, border: '1px solid rgba(124,58,237,0.2)' }}>
                  <i className="ri-spy-line" style={{ marginRight: 3 }} />Real: {fb.anonAuthorName}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20, padding: 4, flexShrink: 0 }}>
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Content */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: '1px solid rgba(15,23,42,0.06)' }}>
          <p style={{ fontSize: 13.5, color: '#0f172a', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{fb.content}</p>
        </div>

        {/* Admin controls */}
        {isAdmin && (
          <div style={{ marginBottom: 16, padding: '14px 16px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ri-settings-3-line" />Admin Controls
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {Object.entries(STATUS_CONFIG).map(([s, sc]) => (
                <button key={s} onClick={() => onStatusChange(fb.id, s, statusNote)} style={{
                  padding: '5px 12px', borderRadius: 7, border: `1px solid ${fb.status === s ? sc.color : 'rgba(15,23,42,0.1)'}`,
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', transition: 'all .15s',
                  background: fb.status === s ? sc.color : '#fff', color: fb.status === s ? '#fff' : '#475569',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <i className={sc.icon} />{sc.label}
                </button>
              ))}
              <button onClick={() => onDelete(fb.id)} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', background: 'rgba(239,68,68,0.06)', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ri-delete-bin-line" />Delete
              </button>
            </div>
            <input value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Optional note for status change…"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 6, fontSize: 12, background: '#fff', color: '#0f172a', boxSizing: 'border-box' }} />
          </div>
        )}

        {/* Replies */}
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ri-chat-1-line" style={{ color: '#6366f1' }} />Discussion
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>({replies.length})</span>
          </h3>

          {loadingReplies ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}><i className="ri-loader-4-line spin" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto', marginBottom: 14 }}>
              {replies.length === 0 ? (
                <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '20px 0' }}>No replies yet.</p>
              ) : replies.map(r => (
                <div key={r.id} style={{ padding: '10px 14px', borderRadius: 10, background: r.authorRole === 'admin' ? 'rgba(99,102,241,0.06)' : '#f8fafc', border: r.authorRole === 'admin' ? '1px solid rgba(99,102,241,0.15)' : '1px solid rgba(15,23,42,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: r.authorRole === 'admin' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {r.authorName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{r.authorName}</span>
                    {r.authorRole === 'admin' && <span style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', background: 'rgba(99,102,241,0.1)', padding: '1px 6px', borderRadius: 4 }}>ADMIN</span>}
                    <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>{timeAgo(r.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{r.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reply input — owner and admin can reply */}
          {(isAdmin || isOwner) && (
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea className="form-input" rows={2} style={{ resize: 'none', flex: 1 }}
                placeholder={isAdmin ? 'Write an official response…' : 'Add to the discussion…'}
                value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleReply(); }} />
              <button onClick={handleReply} disabled={!replyText.trim()} className="btn btn-primary" style={{ alignSelf: 'flex-end', flexShrink: 0 }}>
                <i className="ri-send-plane-line" />
              </button>
            </div>
          )}
          {(isAdmin || isOwner) && <p style={{ fontSize: 10.5, color: '#64748b', marginTop: 5 }}>Ctrl + Enter to send</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Feedback({ user }) {
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [feedbacks, setFeedbacks] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses]     = useState([]);
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // 'submit' | 'detail'
  const [selected, setSelected]     = useState(null);

  const [filterType, setFilterType]         = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterTarget, setFilterTarget]     = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [search, setSearch]                 = useState('');
  const [activeTab, setActiveTab]           = useState('all'); // 'all' | 'mine' | 'dashboard'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.feedback.list();
      setFeedbacks(data);
    } catch { toast('Failed to load feedback', 'error'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    api.faculty.list().then(setFaculties).catch(() => {});
    api.courses.list().then(setCourses).catch(() => {});
    if (isAdmin) api.feedback.dashboard().then(setDashboard).catch(() => {});
  }, []);

  const handleStatusChange = async (id, status, note = '') => {
    try {
      await api.feedback.updateStatus(id, status, note);
      setFeedbacks(p => p.map(f => f.id === id ? { ...f, status } : f));
      if (selected?.id === id) setSelected(s => ({ ...s, status }));
      toast(`Status → ${STATUS_CONFIG[status]?.label}`, 'success');
      if (isAdmin) api.feedback.dashboard().then(setDashboard).catch(() => {});
    } catch (err) { toast(err.message || 'Failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this submission?')) return;
    try {
      await api.feedback.remove(id);
      setFeedbacks(p => p.filter(f => f.id !== id));
      setModal(null);
      toast('Deleted', 'info');
      if (isAdmin) api.feedback.dashboard().then(setDashboard).catch(() => {});
    } catch (err) { toast(err.message || 'Failed', 'error'); }
  };

  // Filtered list
  let filtered = feedbacks;
  if (activeTab === 'mine') filtered = filtered.filter(f => f.authorId === user?.id);
  if (filterType)       filtered = filtered.filter(f => (f.submissionType || f.type) === filterType);
  if (filterStatus)     filtered = filtered.filter(f => f.status === filterStatus);
  if (filterTarget)     filtered = filtered.filter(f => f.targetType === filterTarget);
  if (filterVisibility) filtered = filtered.filter(f => f.visibility === filterVisibility);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(f =>
      f.title?.toLowerCase().includes(q) ||
      f.content?.toLowerCase().includes(q) ||
      f.authorName?.toLowerCase().includes(q) ||
      f.targetName?.toLowerCase().includes(q)
    );
  }

  const statRows = dashboard ? [
    { label: 'Total', value: dashboard.total, icon: 'ri-inbox-line', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Pending', value: dashboard.pending, icon: 'ri-time-line', color: '#d97706', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Under Review', value: dashboard.under_review, icon: 'ri-search-eye-line', color: '#2563eb', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Resolved', value: dashboard.resolved, icon: 'ri-check-double-line', color: '#059669', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Rejected', value: dashboard.rejected, icon: 'ri-close-circle-line', color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
  ] : [];

  return (
    <div className="space-y-5 page-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ri-feedback-line" style={{ color: '#6366f1' }} />Feedback & Complaints
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Submit feedback, complaints & improvement requests to university authorities</p>
        </div>
        <button onClick={() => setModal('submit')} className="btn btn-primary" style={{ gap: 6, fontSize: 13 }}>
          <i className="ri-add-line" />New Submission
        </button>
      </div>

      {/* Admin stats */}
      {isAdmin && dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
          {statRows.map(s => (
            <div key={s.label} className="dark-card" style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={s.icon} style={{ fontSize: 17, color: s.color }} />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value ?? '—'}</p>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar" style={{ width: 'fit-content' }}>
        <button className={`tab-btn${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>
          <i className="ri-global-line" style={{ marginRight: 5 }} />All Submissions
        </button>
        <button className={`tab-btn${activeTab === 'mine' ? ' active' : ''}`} onClick={() => setActiveTab('mine')}>
          <i className="ri-user-line" style={{ marginRight: 5 }} />My Submissions
        </button>
      </div>

      {/* Filters */}
      <div className="dark-card" style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <i className="ri-search-line" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 13 }} />
          <input className="form-input" style={{ paddingLeft: 30, fontSize: 12.5 }} placeholder="Search submissions…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 'auto', minWidth: 150, fontSize: 12.5 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {Object.entries(SUBMISSION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto', minWidth: 140, fontSize: 12.5 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto', minWidth: 150, fontSize: 12.5 }} value={filterTarget} onChange={e => setFilterTarget(e.target.value)}>
          <option value="">All Targets</option>
          {Object.entries(TARGET_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {isAdmin && (
          <select className="form-input" style={{ width: 'auto', minWidth: 140, fontSize: 12.5 }} value={filterVisibility} onChange={e => setFilterVisibility(e.target.value)}>
            <option value="">All Visibility</option>
            {Object.entries(VISIBILITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        )}
        <span style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        {(filterType || filterStatus || filterTarget || filterVisibility || search) && (
          <button onClick={() => { setFilterType(''); setFilterStatus(''); setFilterTarget(''); setFilterVisibility(''); setSearch(''); }} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ri-close-circle-line" />Clear
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
          <i className="ri-loader-4-line spin" style={{ fontSize: 28, marginBottom: 10, display: 'block' }} />
          <p style={{ fontSize: 13 }}>Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.18, color: '#6366f1' }}><i className="ri-inbox-2-line" /></div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>No Submissions Found</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
            {activeTab === 'mine' ? "You haven't submitted anything yet." : "No submissions match your filters."}
          </p>
          {activeTab === 'mine' && (
            <button onClick={() => setModal('submit')} className="btn btn-primary" style={{ marginTop: 16, gap: 6 }}>
              <i className="ri-add-line" />New Submission
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(fb => {
            const typeC   = SUBMISSION_TYPES[fb.submissionType || fb.type] || SUBMISSION_TYPES.feedback;
            const statC   = STATUS_CONFIG[fb.status] || STATUS_CONFIG.pending;
            const targetC = TARGET_TYPES[fb.targetType] || TARGET_TYPES.public;
            const visC    = VISIBILITY_CONFIG[fb.visibility] || VISIBILITY_CONFIG.public;
            const isOwner = fb.authorId === user?.id;

            return (
              <div key={fb.id} className="dark-card fade-in-up" style={{ padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                onClick={() => { setSelected(fb); setModal('detail'); }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Left: icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: typeC.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <i className={typeC.icon} style={{ fontSize: 18, color: typeC.color }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
                      <Badge icon={typeC.icon} label={typeC.label} color={typeC.color} bg={typeC.bg} />
                      <Badge icon={statC.icon} label={statC.label} color={statC.color} bg={statC.bg} />
                      {fb.targetType !== 'public' && (
                        <Badge icon={targetC.icon} label={targetC.label + (fb.targetName ? ` — ${fb.targetName}` : '')} color="#64748b" bg="rgba(100,116,139,0.08)" />
                      )}
                      <Badge icon={visC.icon} label={visC.label} color="#94a3b8" bg="rgba(148,163,184,0.08)" />
                    </div>

                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 5, lineHeight: 1.4 }}>{fb.title}</h3>
                    <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {fb.content}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{timeAgo(fb.createdAt)}</span>
                    {fb.replyCount > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#6366f1', fontWeight: 600, background: 'rgba(99,102,241,0.08)', padding: '2px 8px', borderRadius: 9999 }}>
                        <i className="ri-chat-1-line" style={{ fontSize: 12 }} />{fb.replyCount}
                      </span>
                    )}
                    {isOwner && <span style={{ fontSize: 10.5, color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '1px 7px', borderRadius: 4 }}>Mine</span>}
                  </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff' }}>
                    {fb.authorName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span style={{ fontSize: 11.5, color: '#475569', fontWeight: 500 }}>{fb.authorName}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>· {fb.authorRole}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Modal */}
      {modal === 'submit' && (
        <Modal title="New Submission" onClose={() => setModal(null)}>
          <SubmitForm
            onClose={() => setModal(null)}
            onCreated={created => { setFeedbacks(p => [created, ...p]); if (isAdmin) api.feedback.dashboard().then(setDashboard).catch(() => {}); }}
            faculties={faculties}
            courses={courses}
          />
        </Modal>
      )}

      {/* Detail Modal */}
      {modal === 'detail' && selected && (
        <DetailModal
          fb={selected}
          user={user}
          onClose={() => { setModal(null); setSelected(null); }}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
