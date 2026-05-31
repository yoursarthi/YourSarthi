import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import Modal from '../components/ui/Modal';

const TYPES  = ['mcq', 'short', 'long', 'numerical'];
const DIFFS  = ['easy', 'medium', 'hard'];
const BLOOMS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
const COS    = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'];

const TYPE_CONFIG = {
  long:      { borderColor: '#6366f1', bg: 'rgba(99,102,241,0.08)',  color: '#4f46e5', label: 'LONG' },
  mcq:       { borderColor: '#10b981', bg: 'rgba(16,185,129,0.08)',  color: '#047857', label: 'MCQ' },
  short:     { borderColor: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  color: '#1d4ed8', label: 'SHORT' },
  numerical: { borderColor: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  color: '#b45309', label: 'NUMERICAL' },
};
const DIFF_CONFIG = {
  easy:   { bg: 'rgba(16,185,129,0.08)',  color: '#047857' },
  medium: { bg: 'rgba(245,158,11,0.08)',  color: '#b45309' },
  hard:   { bg: 'rgba(239,68,68,0.08)',   color: '#b91c1c' },
};

export default function QuestionBank({ user }) {
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses]     = useState([]);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterType, setFilterType]     = useState('');
  const [filterDiff, setFilterDiff]     = useState('');
  const [search, setSearch]             = useState('');
  const [modal, setModal]               = useState(false);
  const [form, setForm] = useState({
    course: '', courseName: '', type: 'mcq', topic: '', difficulty: 'easy',
    co: 'CO1', blooms: 'remember', text: '', marks: 1,
    options: { A: '', B: '', C: '', D: '' }, correct: 'A',
  });

  useEffect(() => {
    api.questions.list().then(setQuestions).catch(() => toast('Failed to load questions', 'error'));
    api.courses.list().then(setCourses).catch(() => {});
  }, []);

  const filtered = questions.filter(q =>
    (!filterCourse || q.course === filterCourse)
    && (!filterType || q.type === filterType)
    && (!filterDiff || q.difficulty === filterDiff)
    && (!search || q.text?.toLowerCase().includes(search.toLowerCase()) || q.topic?.toLowerCase().includes(search.toLowerCase()))
  );

  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (form.type !== 'mcq') { delete data.options; delete data.correct; }
      const q = await api.questions.add(data);
      setQuestions(p => [q, ...p]);
      toast('Question added!', 'success');
      setModal(false);
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this question?')) return;
    await api.questions.remove(id);
    setQuestions(p => p.filter(q => q.id !== id));
    toast('Question deleted', 'info');
  };

  const lbl = { fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 5, display: 'block' };

  const grouped = filterCourse
    ? { [filterCourse]: filtered }
    : filtered.reduce((acc, q) => {
        const key = q.course || 'Uncategorized';
        if (!acc[key]) acc[key] = [];
        acc[key].push(q);
        return acc;
      }, {});

  return (
    <div className="space-y-5 page-fade">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Practice Question Bank</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Course-wise practice question repository · {questions.length} total questions</p>
        </div>
        {user?.role !== 'student' && (
          <button onClick={() => setModal(true)} className="btn btn-primary" style={{ gap: 5, fontSize: 13 }}>
            <i className="ri-add-line" />Add Question
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="info-banner">
        <i className="ri-information-line" style={{ fontSize: 14, flexShrink: 0 }} />
        <span>Questions are organized by course. Use the course filter to view practice questions for a specific subject. Each course's questions are tagged with Course Outcomes (CO) and Bloom's taxonomy levels.</span>
      </div>

      {/* Filter row */}
      <div className="dark-card" style={{ padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <i className="ri-search-line" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 13 }} />
          <input className="form-input" style={{ paddingLeft: 30, fontSize: 12.5 }} placeholder="Search questions by text or topic…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 'auto', minWidth: 200, fontSize: 12.5 }} value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.code}>{c.code} – {c.name}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto', minWidth: 120, fontSize: 12.5 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto', minWidth: 120, fontSize: 12.5 }} value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
          <option value="">All Difficulty</option>
          {DIFFS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>{filtered.length} questions</span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {TYPES.map(type => {
          const tc = TYPE_CONFIG[type];
          const count = questions.filter(q => q.type === type).length;
          return (
            <div key={type} onClick={() => setFilterType(filterType === type ? '' : type)} className="dark-card stat-card" style={{ padding: '12px 16px', textAlign: 'center', cursor: 'pointer', borderLeft: `3px solid ${tc.borderColor}`, opacity: filterType && filterType !== type ? 0.6 : 1 }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: tc.color }}>{count}</p>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{tc.label}</p>
            </div>
          );
        })}
      </div>

      {/* Questions grouped by course */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 36, opacity: 0.2, color: '#6366f1', marginBottom: 12 }}><i className="ri-file-text-line" /></div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>No Questions Found</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Try different filters or add questions</p>
        </div>
      ) : (
        Object.entries(grouped).map(([courseCode, qs]) => (
          <div key={courseCode}>
            {!filterCourse && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.08)', padding: '3px 10px', borderRadius: 6 }}>{courseCode}</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{qs.length} question{qs.length !== 1 ? 's' : ''}</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(15,23,42,0.08)' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {qs.map(q => {
                const tc = TYPE_CONFIG[q.type] || TYPE_CONFIG.short;
                const dc = DIFF_CONFIG[q.difficulty] || DIFF_CONFIG.easy;
                return (
                  <div key={q.id} className={`dark-card fade-in-up q-${q.type}`} style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Tags row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 700, background: tc.bg, color: tc.color, border: `1px solid ${tc.borderColor}30` }}>
                            {tc.label}
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: dc.bg, color: dc.color }}>
                            {q.difficulty}
                          </span>
                          {q.co && (
                            <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: 'rgba(139,92,246,0.08)', color: '#7c3aed' }}>
                              {q.co}
                            </span>
                          )}
                          {q.blooms && (
                            <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: 'rgba(15,23,42,0.05)', color: '#475569', border: '1px solid rgba(15,23,42,0.1)' }}>
                              {q.blooms}
                            </span>
                          )}
                          {q.topic && (
                            <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: 'rgba(99,102,241,0.06)', color: '#4f46e5' }}>
                              {q.topic}
                            </span>
                          )}
                          {q.course && (
                            <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: 'rgba(16,185,129,0.07)', color: '#047857', fontFamily: 'monospace' }}>
                              {q.course}
                            </span>
                          )}
                        </div>

                        {/* Question text */}
                        <p style={{ fontSize: 13.5, color: '#0f172a', lineHeight: 1.6, margin: 0 }}>{q.text}</p>

                        {/* MCQ options */}
                        {q.options && (
                          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {Object.entries(q.options).map(([k, v]) => (
                              <p key={k} style={{
                                fontSize: 11.5, padding: '4px 8px', borderRadius: 6,
                                background: q.correct === k ? 'rgba(16,185,129,0.08)' : 'rgba(15,23,42,0.04)',
                                color: q.correct === k ? '#047857' : '#475569',
                                border: `1px solid ${q.correct === k ? 'rgba(16,185,129,0.2)' : 'rgba(15,23,42,0.08)'}`,
                                margin: 0,
                              }}>
                                {k}. {v}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right side */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: tc.bg, border: `1.5px solid ${tc.borderColor}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: tc.color,
                        }}>
                          {q.marks}M
                        </div>
                        {user?.role !== 'student' && (
                          <button onClick={() => handleDelete(q.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, padding: '4px 8px', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}>
                            <i className="ri-delete-bin-line" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Add Question Modal */}
      {modal && (
        <Modal title="Add Practice Question" onClose={() => setModal(false)}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Course *</label>
                <select className="form-input" value={form.course} onChange={e => {
                  const c = courses.find(c => c.code === e.target.value);
                  setForm(p => ({ ...p, course: e.target.value, courseName: c?.name || '' }));
                }} required>
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c.id} value={c.code}>{c.code} – {c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Type</label>
                <select className="form-input" value={form.type} onChange={F('type')}>
                  {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={lbl}>Question Text *</label>
              <textarea className="form-input" style={{ resize: 'none' }} rows={3} value={form.text} onChange={F('text')} required placeholder="Enter the full question text…" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Difficulty</label><select className="form-input" value={form.difficulty} onChange={F('difficulty')}>{DIFFS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              <div><label style={lbl}>CO</label><select className="form-input" value={form.co} onChange={F('co')}>{COS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label style={lbl}>Marks</label><input className="form-input" type="number" min={1} value={form.marks} onChange={F('marks')} /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Bloom's Level</label><select className="form-input" value={form.blooms} onChange={F('blooms')}>{BLOOMS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
              <div><label style={lbl}>Topic</label><input className="form-input" value={form.topic} onChange={F('topic')} placeholder="e.g. Module 1 - Arrays" /></div>
            </div>

            {form.type === 'mcq' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['A','B','C','D'].map(opt => (
                    <div key={opt}><label style={lbl}>Option {opt}</label><input className="form-input" style={{ fontSize: 12.5 }} value={form.options[opt]} onChange={e => setForm(p => ({ ...p, options: { ...p.options, [opt]: e.target.value } }))} /></div>
                  ))}
                </div>
                <div><label style={lbl}>Correct Answer</label><select className="form-input" value={form.correct} onChange={F('correct')}>{['A','B','C','D'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={() => setModal(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-primary">Add Question</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
