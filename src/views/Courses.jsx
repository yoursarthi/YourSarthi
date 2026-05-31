import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import Modal from '../components/ui/Modal';
import { formatDate } from '../utils/helpers';

const TYPE_CONFIG = {
  Core:    { grad: 'linear-gradient(135deg,#4f46e5,#6366f1)', icon: 'ri-book-2-line',    badge: { bg: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: 'rgba(99,102,241,0.2)' } },
  Elective:{ grad: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', icon: 'ri-graduation-cap-line', badge: { bg: 'rgba(139,92,246,0.1)', color: '#7c3aed', border: 'rgba(139,92,246,0.2)' } },
  Lab:     { grad: 'linear-gradient(135deg,#0d9488,#14b8a6)', icon: 'ri-flask-line',     badge: { bg: 'rgba(20,184,166,0.1)', color: '#0d9488', border: 'rgba(20,184,166,0.2)' } },
};

const DIFF_STYLES = {
  easy:   { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  medium: { bg: '#fef9c3', color: '#a16207', border: '#fef08a' },
  hard:   { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
};

const TYPE_STYLES = {
  mcq:       { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
  short:     { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  long:      { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  numerical: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
};

export default function Courses({ user, onNavigate }) {
  const toast = useToast();
  const [courses, setCourses]       = useState([]);
  const [depts, setDepts]           = useState([]);
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('All');
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm] = useState({ code: '', name: '', department: '', credits: 3, type: 'Core', maxStudents: 60, semester: '1st', description: '' });
  const [detailCourse, setDetailCourse]   = useState(null);
  const [detailTab, setDetailTab]         = useState('resources');
  const [resources, setResources]         = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [practiceQs, setPracticeQs]       = useState([]);
  const [resForm, setResForm] = useState({ title: '', type: 'pdf', url: '', uploadedBy: '', dueDate: '' });
  const [annForm, setAnnForm] = useState({ title: '', content: '', audience: 'all' });
  const [pqForm, setPqForm]   = useState({ text: '', type: 'short', difficulty: 'medium', co: '', blooms: '', answer: '' });
  const [showPqForm, setShowPqForm] = useState(false);

  useEffect(() => {
    api.courses.list().then(setCourses).catch(() => toast('Failed to load courses', 'error'));
    api.departments.list().then(setDepts).catch(() => {});
  }, []);

  const filtered = courses.filter(c =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase()))
    && (filterType === 'All' || c.type === filterType)
  );
  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openAdd  = () => { setForm({ code: '', name: '', department: '', credits: 3, type: 'Core', maxStudents: 60, semester: '1st', description: '' }); setEditing(null); setModal('course'); };
  const openEdit = c  => { setForm({ code: c.code, name: c.name, department: c.department, credits: c.credits, type: c.type, maxStudents: c.maxStudents, semester: c.semester || '1st', description: c.description || '' }); setEditing(c.id); setModal('course'); };

  const openDetail = async (c) => {
    setDetailCourse(c);
    setDetailTab('resources');
    const [res, ann] = await Promise.all([api.courses.resources(c.id), api.courses.announcements(c.id)]);
    setResources(res); setAnnouncements(ann);
    setPracticeQs([]);
    setModal('detail');
  };

  const loadPracticeQs = async (courseId) => {
    try {
      const qs = await api.questions.list({ courseId });
      setPracticeQs(qs);
    } catch { toast('Failed to load practice questions', 'error'); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const u = await api.courses.update(editing, form);
        setCourses(p => p.map(x => x.id === editing ? u : x));
        toast('Course updated', 'success');
      } else {
        const c = await api.courses.add(form);
        setCourses(p => [c, ...p]);
        toast('Course added!', 'success');
      }
      setModal(false);
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this course?')) return;
    await api.courses.remove(id);
    setCourses(p => p.filter(x => x.id !== id));
    toast('Course deleted', 'info');
  };

  const addResource = async () => {
    if (!resForm.title.trim()) return;
    try {
      const r = await api.courses.addResource(detailCourse.id, { ...resForm, uploadedBy: resForm.uploadedBy || user?.name });
      setResources(p => [r, ...p]);
      setResForm({ title: '', type: 'pdf', url: '', uploadedBy: '', dueDate: '' });
      toast('Resource added', 'success');
    } catch (err) { toast(`Failed: ${err.message}`, 'error'); }
  };

  const addAnnouncement = async () => {
    if (!annForm.title.trim()) return;
    try {
      const a = await api.courses.addAnnouncement(detailCourse.id, { ...annForm, author: user?.name });
      setAnnouncements(p => [a, ...p]);
      setAnnForm({ title: '', content: '', audience: 'all' });
      toast('Announcement posted', 'success');
    } catch (err) { toast(`Failed: ${err.message}`, 'error'); }
  };

  const addPracticeQ = async () => {
    if (!pqForm.text.trim()) return;
    try {
      const q = await api.questions.add({
        ...pqForm,
        courseId: detailCourse.id,
        courseCode: detailCourse.code,
        marks: 1,
      });
      setPracticeQs(p => [q, ...p]);
      setPqForm({ text: '', type: 'short', difficulty: 'medium', co: '', blooms: '', answer: '' });
      setShowPqForm(false);
      toast('Practice question added', 'success');
    } catch (err) { toast(`Failed: ${err.message}`, 'error'); }
  };

  const deletePracticeQ = async (id) => {
    if (!confirm('Remove this practice question?')) return;
    try {
      await api.questions.remove(id);
      setPracticeQs(p => p.filter(q => q.id !== id));
      toast('Question removed', 'info');
    } catch (err) { toast(err.message, 'error'); }
  };

  const label = { fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' };
  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'faculty';
  const canEdit = isAdmin || isFaculty;

  return (
    <div className="space-y-5 page-fade">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Sarthi Courses</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{filtered.length} courses in catalog</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="btn btn-primary" style={{ gap: 6, fontSize: 13 }}>
            <i className="ri-add-line" />Add Course
          </button>
        )}
      </div>

      {/* Sticky filter bar */}
      <div className="dark-card" style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <i className="ri-search-line" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Type filter tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Core', 'Elective', 'Lab'].map(t => {
            const tc = TYPE_CONFIG[t];
            const active = filterType === t;
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  padding: '5px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
                  background: active ? (tc ? tc.badge.bg : 'rgba(99,102,241,0.1)') : '#f1f5f9',
                  color: active ? (tc ? tc.badge.color : '#4f46e5') : '#64748b',
                  border: `1px solid ${active ? (tc ? tc.badge.border : 'rgba(99,102,241,0.2)') : 'rgba(15,23,42,0.08)'}`,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Course cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}><i className="ri-book-open-line" /></div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#64748b' }}>No Courses Found</h3>
        </div>
      ) : (
        <div className="data-grid">
          {filtered.map(c => {
            const tc = TYPE_CONFIG[c.type] || TYPE_CONFIG.Core;
            const enrolled = c.enrolled || 0;
            const enrollPct = c.maxStudents > 0 ? Math.min(100, Math.round(enrolled / c.maxStudents * 100)) : 0;
            return (
              <div key={c.id} className="data-card fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Gradient header block */}
                <div style={{ background: tc.grad, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                      {c.type}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>{c.code}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={tc.icon} style={{ fontSize: 16, color: '#fff' }} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{c.name}</p>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#475569' }}>
                      <i className="ri-building-line" style={{ fontSize: 12, color: '#94a3b8' }} />
                      <span>{c.department}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#475569' }}>
                      <i className="ri-star-line" style={{ fontSize: 12, color: '#94a3b8' }} />
                      <span>{c.credits} Credits · Sem {c.semester}</span>
                    </div>
                  </div>

                  {/* Enrollment progress */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Enrollment</span>
                      <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{enrolled}/{c.maxStudents}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${enrollPct}%`, background: tc.grad }} />
                    </div>
                  </div>

                  {c.description && (
                    <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 10, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {c.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(15,23,42,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button onClick={() => openDetail(c)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500, background: 'rgba(99,102,241,0.08)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.18)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      <i className="ri-book-open-line" style={{ marginRight: 4 }} />Open
                    </button>
                    <button
                      onClick={() => onNavigate?.('ai_tutor', { courseId: c.id, courseName: c.name })}
                      style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500, background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <i className="ri-robot-2-line" />AI Tutor
                    </button>
                    {canEdit && (
                      <>
                        <button onClick={() => openEdit(c)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500, background: '#f1f5f9', color: '#475569', border: '1px solid rgba(15,23,42,0.1)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          <i className="ri-edit-line" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(c.id)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500, background: 'rgba(239,68,68,0.07)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            <i className="ri-delete-bin-line" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {modal === 'course' && (
        <Modal title={editing ? 'Edit Course' : 'Add Course'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={label}>Course Code</label><input className="form-input" value={form.code} onChange={F('code')} placeholder="CSE301" /></div>
              <div><label style={label}>Credits</label><input className="form-input" type="number" value={form.credits} onChange={F('credits')} min={1} max={6} /></div>
            </div>
            <div><label style={label}>Course Name *</label><input className="form-input" value={form.name} onChange={F('name')} required /></div>
            <div>
              <label style={label}>Department</label>
              <select className="form-input" value={form.department} onChange={F('department')}>
                <option value="">Select Department</option>
                {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Type</label>
                <select className="form-input" value={form.type} onChange={F('type')}>
                  <option value="Core">Core</option><option value="Elective">Elective</option><option value="Lab">Lab</option>
                </select>
              </div>
              <div>
                <label style={label}>Semester</label>
                <select className="form-input" value={form.semester} onChange={F('semester')}>
                  {['1st','2nd','3rd','4th','5th','6th','7th','8th'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div><label style={label}>Max Students</label><input className="form-input" type="number" value={form.maxStudents} onChange={F('maxStudents')} /></div>
            <div><label style={label}>Description</label><textarea className="form-input" rows={3} value={form.description} onChange={F('description')} style={{ resize: 'vertical' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={() => setModal(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Course'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Course Detail modal */}
      {modal === 'detail' && detailCourse && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 800, width: '95vw' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }}>{detailCourse.code}</p>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>{detailCourse.name}</h3>
                <p style={{ fontSize: 12.5, color: '#64748b' }}>{detailCourse.department} · Sem {detailCourse.semester} · {detailCourse.credits} Credits</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setModal(false); onNavigate?.('ai_tutor', { courseId: detailCourse.id, courseName: detailCourse.name }); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
                >
                  <i className="ri-robot-2-line" />AI Tutor
                </button>
                <button onClick={() => setModal(false)} style={{ background: '#f1f5f9', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, padding: '6px 8px', color: '#475569', cursor: 'pointer', fontSize: 16 }}>
                  <i className="ri-close-line" />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(15,23,42,0.08)', paddingBottom: 0 }}>
              {[
                { id: 'resources',   label: 'Resources',         icon: 'ri-folder-open-line' },
                { id: 'announce',    label: 'Announcements',     icon: 'ri-megaphone-line' },
                { id: 'practice',    label: 'Practice Questions', icon: 'ri-file-text-line' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setDetailTab(tab.id);
                    if (tab.id === 'practice' && practiceQs.length === 0) loadPracticeQs(detailCourse.id);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px',
                    fontSize: 12.5, fontWeight: 600,
                    background: 'none', border: 'none',
                    borderBottom: detailTab === tab.id ? '2px solid #4f46e5' : '2px solid transparent',
                    color: detailTab === tab.id ? '#4f46e5' : '#64748b',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    marginBottom: -1,
                    transition: 'color 0.15s',
                  }}
                >
                  <i className={tab.icon} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Resources tab */}
            {detailTab === 'resources' && (
              <div>
                {canEdit && (
                  <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="form-input" style={{ fontSize: 12, padding: '6px 10px', flex: 1 }} placeholder="Resource title…" value={resForm.title} onChange={e => setResForm(p => ({ ...p, title: e.target.value }))} />
                      <select className="form-input" style={{ fontSize: 12, padding: '6px 10px', width: 110 }} value={resForm.type} onChange={e => setResForm(p => ({ ...p, type: e.target.value }))}>
                        <option value="pdf">PDF</option><option value="video">Video</option><option value="assignment">Assignment</option><option value="link">Link</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="form-input" style={{ fontSize: 12, padding: '6px 10px', flex: 1 }} placeholder="URL / Link…" value={resForm.url} onChange={e => setResForm(p => ({ ...p, url: e.target.value }))} />
                      <button onClick={addResource} disabled={!resForm.title.trim()} className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>Add</button>
                    </div>
                  </div>
                )}
                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {resources.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: 24 }}>No resources yet.</p>
                  ) : resources.map(r => (
                    <div key={r.id} style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.07)', borderRadius: 8 }}>
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 500, color: '#4f46e5', textDecoration: 'none' }}>
                          <i className="ri-external-link-line" style={{ marginRight: 4 }} />{r.title}
                        </a>
                      ) : (
                        <p style={{ fontSize: 12.5, fontWeight: 500, color: '#0f172a' }}>{r.title}</p>
                      )}
                      <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{formatDate(r.createdAt)} · {r.uploadedBy || 'Faculty'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Announcements tab */}
            {detailTab === 'announce' && (
              <div>
                {canEdit && (
                  <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input className="form-input" style={{ fontSize: 12, padding: '6px 10px' }} placeholder="Title…" value={annForm.title} onChange={e => setAnnForm(p => ({ ...p, title: e.target.value }))} />
                    <textarea className="form-input" style={{ fontSize: 12, padding: '6px 10px', resize: 'none' }} rows={2} placeholder="Content…" value={annForm.content} onChange={e => setAnnForm(p => ({ ...p, content: e.target.value }))} />
                    {isAdmin && (
                      <select className="form-input" style={{ fontSize: 12, padding: '6px 10px' }} value={annForm.audience} onChange={e => setAnnForm(p => ({ ...p, audience: e.target.value }))}>
                        <option value="all">Broadcast to All</option>
                        <option value="faculty">Faculty Only</option>
                        <option value="students">Students Only</option>
                      </select>
                    )}
                    <button onClick={addAnnouncement} disabled={!annForm.title.trim()} className="btn btn-primary" style={{ fontSize: 12 }}>Post</button>
                  </div>
                )}
                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {announcements.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: 24 }}>No announcements.</p>
                  ) : announcements.map(a => (
                    <div key={a.id} style={{ padding: '10px 12px', borderLeft: '3px solid #f59e0b', background: 'rgba(245,158,11,0.05)', borderRadius: '0 8px 8px 0' }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{a.title}</p>
                      <p style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>{a.content}</p>
                      <p style={{ fontSize: 10.5, color: '#64748b', marginTop: 3 }}>{formatDate(a.createdAt)} · {a.author}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Practice Questions tab */}
            {detailTab === 'practice' && (
              <div>
                {/* Info banner */}
                <div className="info-banner" style={{ marginBottom: 14 }}>
                  <i className="ri-information-line" />
                  Practice questions for <strong>{detailCourse.name}</strong> — for student self-study only, not used in exam paper generation.
                </div>

                {canEdit && (
                  <div style={{ marginBottom: 12 }}>
                    {!showPqForm ? (
                      <button onClick={() => setShowPqForm(true)} className="btn btn-primary" style={{ fontSize: 12, gap: 6 }}>
                        <i className="ri-add-line" />Add Practice Question
                      </button>
                    ) : (
                      <div style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea className="form-input" rows={3} placeholder="Question text…" value={pqForm.text} onChange={e => setPqForm(p => ({ ...p, text: e.target.value }))} style={{ resize: 'vertical' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>Type</label>
                            <select className="form-input" style={{ fontSize: 12 }} value={pqForm.type} onChange={e => setPqForm(p => ({ ...p, type: e.target.value }))}>
                              <option value="mcq">MCQ</option>
                              <option value="short">Short Answer</option>
                              <option value="long">Long Answer</option>
                              <option value="numerical">Numerical</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>Difficulty</label>
                            <select className="form-input" style={{ fontSize: 12 }} value={pqForm.difficulty} onChange={e => setPqForm(p => ({ ...p, difficulty: e.target.value }))}>
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>CO</label>
                            <input className="form-input" style={{ fontSize: 12 }} placeholder="CO1" value={pqForm.co} onChange={e => setPqForm(p => ({ ...p, co: e.target.value }))} />
                          </div>
                        </div>
                        <textarea className="form-input" rows={2} placeholder="Model answer / hint (optional)…" value={pqForm.answer} onChange={e => setPqForm(p => ({ ...p, answer: e.target.value }))} style={{ resize: 'vertical' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={addPracticeQ} disabled={!pqForm.text.trim()} className="btn btn-primary" style={{ fontSize: 12 }}>Save Question</button>
                          <button onClick={() => setShowPqForm(false)} className="btn btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {practiceQs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <i className="ri-file-text-line" style={{ fontSize: 32, color: '#cbd5e1', display: 'block', marginBottom: 8 }} />
                      <p style={{ fontSize: 12, color: '#64748b' }}>No practice questions yet.</p>
                    </div>
                  ) : practiceQs.map((q, i) => {
                    const ds = DIFF_STYLES[q.difficulty] || DIFF_STYLES.medium;
                    const ts = TYPE_STYLES[q.type] || TYPE_STYLES.short;
                    return (
                      <div key={q.id} style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', minWidth: 22, paddingTop: 2 }}>Q{i + 1}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.5, marginBottom: 8 }}>{q.text}</p>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>{q.type?.toUpperCase()}</span>
                              <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: ds.bg, color: ds.color, border: `1px solid ${ds.border}` }}>{q.difficulty}</span>
                              {q.co && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>{q.co}</span>}
                            </div>
                            {q.answer && (
                              <details style={{ marginTop: 8 }}>
                                <summary style={{ fontSize: 11.5, color: '#4f46e5', cursor: 'pointer', fontWeight: 500 }}>View Answer / Hint</summary>
                                <p style={{ fontSize: 11.5, color: '#475569', marginTop: 6, lineHeight: 1.5, padding: '8px', background: '#f8fafc', borderRadius: 6 }}>{q.answer}</p>
                              </details>
                            )}
                          </div>
                          {canEdit && (
                            <button onClick={() => deletePracticeQ(q.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, padding: '2px 4px', opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
                              <i className="ri-delete-bin-line" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
