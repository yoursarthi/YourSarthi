import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import Btn from '../components/ui/Btn';
import Spin from '../components/ui/Spin';

// ── Shared style tokens ───────────────────────────────────────────────────────
const card  = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' };
const label = { fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 4 };
const inp   = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
  borderRadius: 7, fontSize: 13, color: '#0f172a', boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
};
const sel   = { ...inp, background: '#fff' };

const GRADE_COLOR = { O: '#166534', 'A+': '#15803d', A: '#166534', 'B+': '#1d4ed8', B: '#1e40af', C: '#92400e', F: '#991b1b' };

function Badge({ grade }) {
  const color = GRADE_COLOR[grade] || '#6b7280';
  return (
    <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700, color, background: color + '18' }}>
      {grade}
    </span>
  );
}

// ── Tab: Mark Entry ───────────────────────────────────────────────────────────
function MarkEntryTab({ components, students, courses }) {
  const toast = useToast();
  const [form, setForm] = useState({
    student_id: '', course_id: '', component_id: '',
    marks_obtained: '', max_marks: '',
    semester: '', academic_year: '', exam_session: '', remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const filteredStudents = students.filter(s => {
    const q = studentSearch.toLowerCase();
    return !q || `${s.first_name} ${s.last_name} ${s.id} ${s.enrollment_no}`.toLowerCase().includes(q);
  });

  const handleChange = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Auto-fill max_marks from component defaults
  const onComponentChange = (id) => {
    const comp = components.find(c => c.id === id);
    setForm(p => ({ ...p, component_id: id, max_marks: comp ? String(comp.max_marks) : '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.course_id || !form.component_id || !form.semester || !form.academic_year) {
      return toast('Fill all required fields', 'error');
    }
    const obt = parseFloat(form.marks_obtained);
    const max = parseFloat(form.max_marks);
    if (isNaN(obt) || obt < 0 || obt > max) {
      return toast(`Marks must be between 0 and ${max}`, 'error');
    }
    setSaving(true);
    try {
      await api.results.addMark({
        student_id: form.student_id, course_id: form.course_id,
        component_id: form.component_id, semester: form.semester,
        academic_year: form.academic_year, marks_obtained: obt, max_marks: max,
        exam_session: form.exam_session, remarks: form.remarks,
      });
      toast('Marks saved', 'success');
      setForm(p => ({ ...p, marks_obtained: '', remarks: '', exam_session: '' }));
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
        {/* Student */}
        <div style={{ ...card }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Student & Course</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={label}>Search Student</div>
              <input style={inp} placeholder="Name / ID / Enrollment…" value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)} />
            </div>
            <div>
              <div style={label}>Student *</div>
              <select style={sel} value={form.student_id} onChange={e => handleChange('student_id', e.target.value)} required>
                <option value="">— Select —</option>
                {filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} ({s.enrollment_no || s.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={label}>Course *</div>
              <select style={sel} value={form.course_id} onChange={e => handleChange('course_id', e.target.value)} required>
                <option value="">— Select —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <div style={label}>Component *</div>
              <select style={sel} value={form.component_id} onChange={e => onComponentChange(e.target.value)} required>
                <option value="">— Select —</option>
                {components.map(c => <option key={c.id} value={c.id}>{c.component_name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Marks */}
        <div style={{ ...card }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Marks & Session</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={label}>Marks Obtained *</div>
              <input style={inp} type="number" step="0.5" min="0" max={form.max_marks || undefined}
                value={form.marks_obtained} onChange={e => handleChange('marks_obtained', e.target.value)} required />
            </div>
            <div>
              <div style={label}>Max Marks *</div>
              <input style={inp} type="number" min="1"
                value={form.max_marks} onChange={e => handleChange('max_marks', e.target.value)} required />
            </div>
            <div>
              <div style={label}>Semester *</div>
              <select style={sel} value={form.semester} onChange={e => handleChange('semester', e.target.value)} required>
                <option value="">— Select —</option>
                {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => (
                  <option key={s} value={`${s} Semester`}>{s} Semester</option>
                ))}
              </select>
            </div>
            <div>
              <div style={label}>Academic Year *</div>
              <input style={inp} placeholder="2024-25" value={form.academic_year}
                onChange={e => handleChange('academic_year', e.target.value)} required />
            </div>
            <div style={{ gridColumn: '1/3' }}>
              <div style={label}>Exam Session</div>
              <input style={inp} placeholder="e.g. Nov-Dec 2024" value={form.exam_session}
                onChange={e => handleChange('exam_session', e.target.value)} />
            </div>
            <div style={{ gridColumn: '3/5' }}>
              <div style={label}>Remarks</div>
              <input style={inp} placeholder="Optional" value={form.remarks}
                onChange={e => handleChange('remarks', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn type="submit" variant="primary" disabled={saving}>
            {saving ? <Spin size={14} /> : <i className="ri-save-line" />} Save Marks
          </Btn>
          <Btn type="button" variant="ghost" onClick={() => setForm({
            student_id: '', course_id: '', component_id: '',
            marks_obtained: '', max_marks: '',
            semester: '', academic_year: '', exam_session: '', remarks: '',
          })}>Clear</Btn>
        </div>
      </form>
    </div>
  );
}

// ── Tab: View / Manage Results ────────────────────────────────────────────────
function ViewResultsTab({ components, students, courses, user }) {
  const toast = useToast();
  const [marks, setMarks]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [filters, setFilters]   = useState({ semester: '', academic_year: '', course_id: '', student_id: '' });
  const [editRow, setEditRow]   = useState(null);
  const [editVal, setEditVal]   = useState('');

  const loadMarks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.semester)     params.semester     = filters.semester;
      if (filters.academic_year)params.academicYear = filters.academic_year;
      if (filters.course_id)    params.courseId     = filters.course_id;
      if (filters.student_id)   params.studentId    = filters.student_id;
      setMarks(await api.results.marks(params));
    } catch (e) { toast(e.message, 'error'); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { loadMarks(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this mark entry?')) return;
    try { await api.results.deleteMark(id); toast('Deleted', 'success'); loadMarks(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const handleLock = async (id, locked) => {
    try { await api.results.lockMark(id, locked); toast(locked ? 'Locked' : 'Unlocked', 'success'); loadMarks(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    try {
      await api.results.updateMark(editRow.id, {
        marks_obtained: parseFloat(editVal), max_marks: editRow.max_marks,
      });
      toast('Updated', 'success');
      setEditRow(null);
      loadMarks();
    } catch (e) { toast(e.message, 'error'); }
  };

  const fSet = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <select style={{ ...sel, width: 180 }} value={filters.semester} onChange={e => fSet('semester', e.target.value)}>
          <option value="">All Semesters</option>
          {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => (
            <option key={s} value={`${s} Semester`}>{s} Semester</option>
          ))}
        </select>
        <input style={{ ...inp, width: 120 }} placeholder="Academic Year" value={filters.academic_year}
          onChange={e => fSet('academic_year', e.target.value)} />
        <select style={{ ...sel, width: 220 }} value={filters.course_id} onChange={e => fSet('course_id', e.target.value)}>
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
        </select>
        {user.role !== 'student' && (
          <select style={{ ...sel, width: 220 }} value={filters.student_id} onChange={e => fSet('student_id', e.target.value)}>
            <option value="">All Students</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
        )}
        <Btn variant="primary" onClick={loadMarks} disabled={loading}>
          {loading ? <Spin size={13} /> : <i className="ri-search-line" />} Search
        </Btn>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}
      {!loading && marks.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No results found. Apply filters and search.</div>
      )}
      {!loading && marks.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Student', 'Roll', 'Course', 'Component', 'Marks', 'Max', '%', 'Grade', 'Semester', 'Locked', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {marks.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '7px 10px' }}>{m.student_full_name}</td>
                  <td style={{ padding: '7px 10px', color: '#6b7280' }}>{m.student_roll || m.enrollment_no || '—'}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{ fontWeight: 600 }}>{m.course_code}</span>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{m.course_name}</div>
                  </td>
                  <td style={{ padding: '7px 10px' }}>{m.component_name}</td>
                  <td style={{ padding: '7px 10px' }}>
                    {editRow?.id === m.id ? (
                      <input style={{ ...inp, width: 60, padding: '3px 6px' }} type="number"
                        value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus />
                    ) : (
                      <span style={{ fontWeight: 600 }}>{parseFloat(m.marks_obtained)}</span>
                    )}
                  </td>
                  <td style={{ padding: '7px 10px', color: '#6b7280' }}>{m.max_marks}</td>
                  <td style={{ padding: '7px 10px' }}>{m.percentage?.toFixed(1)}%</td>
                  <td style={{ padding: '7px 10px' }}><Badge grade={m.grade} /></td>
                  <td style={{ padding: '7px 10px', color: '#6b7280', fontSize: 11 }}>{m.semester}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{ fontSize: 11, color: m.is_locked ? '#dc2626' : '#16a34a' }}>
                      {m.is_locked ? '🔒' : '🔓'}
                    </span>
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {editRow?.id === m.id ? (
                        <>
                          <Btn size="sm" variant="primary" onClick={saveEdit}>Save</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => setEditRow(null)}>Cancel</Btn>
                        </>
                      ) : !m.is_locked && user.role !== 'student' && (
                        <>
                          <Btn size="sm" variant="ghost" onClick={() => { setEditRow(m); setEditVal(String(m.marks_obtained)); }}>
                            <i className="ri-edit-line" />
                          </Btn>
                          {user.role === 'admin' && (
                            <>
                              <Btn size="sm" variant="ghost" onClick={() => handleLock(m.id, true)}>
                                <i className="ri-lock-line" style={{ color: '#f59e0b' }} />
                              </Btn>
                              <Btn size="sm" variant="ghost" onClick={() => handleDelete(m.id)}>
                                <i className="ri-delete-bin-line" style={{ color: '#ef4444' }} />
                              </Btn>
                            </>
                          )}
                        </>
                      )}
                      {m.is_locked && user.role === 'admin' && (
                        <Btn size="sm" variant="ghost" onClick={() => handleLock(m.id, false)}>
                          <i className="ri-lock-unlock-line" style={{ color: '#3b82f6' }} />
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>{marks.length} record(s) shown</div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Bulk Upload ──────────────────────────────────────────────────────────
function BulkUploadTab({ components, courses }) {
  const toast = useToast();
  const [csvText, setCsvText]     = useState('');
  const [preview, setPreview]     = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState(null);

  const HEADERS = ['student_id', 'course_code', 'component_name', 'marks_obtained', 'max_marks', 'semester', 'academic_year', 'remarks'];

  const downloadTemplate = () => {
    const rows = [
      HEADERS.join(','),
      'STU2024001,CSE301,Endterm,63,70,4th Semester,2024-25,',
      'STU2024001,CSE301,Midterm,18,30,4th Semester,2024-25,',
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a    = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'marks_import_template.csv'; a.click();
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map((line, i) => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj  = {};
      headers.forEach((h, idx) => { obj[h] = vals[idx] ?? ''; });
      return { _row: i + 2, ...obj };
    });
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      setCsvText(text);
      setPreview(parseCSV(text).slice(0, 20));
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const rows = parseCSV(csvText);
    if (!rows.length) return toast('No data to import', 'error');
    setImporting(true);
    try {
      const res = await api.results.bulkImport(rows);
      setResult(res);
      toast(`Inserted ${res.inserted}, Updated ${res.updated}${res.errors.length ? `, ${res.errors.length} errors` : ''}`, res.errors.length ? 'error' : 'success');
    } catch (e) { toast(e.message, 'error'); }
    setImporting(false);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Btn variant="ghost" onClick={downloadTemplate}>
          <i className="ri-download-2-line" /> Download CSV Template
        </Btn>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '6px 14px', background: '#6366f1', color: '#fff', borderRadius: 7, fontSize: 13, fontWeight: 500 }}>
          <i className="ri-upload-2-line" /> Upload CSV
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
        </label>
      </div>

      {preview.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Preview (first {preview.length} rows)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {HEADERS.map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {HEADERS.map(h => (
                      <td key={h} style={{ padding: '5px 8px', color: row[h] ? '#0f172a' : '#d1d5db' }}>
                        {row[h] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Btn variant="primary" onClick={handleImport} disabled={importing} style={{ marginTop: 12 }}>
            {importing ? <Spin size={13} /> : <i className="ri-check-double-line" />} Import All Rows
          </Btn>
        </div>
      )}

      {result && (
        <div style={{ ...card, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#166534' }}>Import Complete</div>
          <div style={{ fontSize: 13, display: 'grid', gridTemplateColumns: 'repeat(3,auto)', gap: '4px 24px' }}>
            <span>Inserted: <b>{result.inserted}</b></span>
            <span>Updated: <b>{result.updated}</b></span>
            <span>Errors: <b style={{ color: result.errors.length ? '#dc2626' : '#16a34a' }}>{result.errors.length}</b></span>
          </div>
          {result.errors.length > 0 && (
            <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto' }}>
              {result.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: '#dc2626', padding: '2px 0' }}>Row {e.row}: {e.error}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16, ...card, background: '#fffbeb', border: '1px solid #fde68a' }}>
        <div style={{ fontSize: 12, color: '#92400e', fontWeight: 500, marginBottom: 4 }}>CSV Format Guide</div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#78350f' }}>
          {HEADERS.join(', ')}
          <br />
          <span style={{ color: '#9ca3af' }}>
            component_name must match exactly: {components.map(c => c.component_name).join(', ')}
            <br />course_code must match an existing course (e.g. CSE301)
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ResultManagement({ user }) {
  const toast                     = useToast();
  const [tab, setTab]             = useState('entry');
  const [components, setComponents] = useState([]);
  const [students, setStudents]   = useState([]);
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.results.components(),
      api.students.list().catch(() => []),
      api.courses.list().catch(() => []),
    ]).then(([comps, studs, crses]) => {
      setComponents(comps);
      setStudents(studs);
      setCourses(crses);
    }).catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { key: 'entry',  label: 'Enter Marks',   icon: 'ri-edit-line' },
    { key: 'view',   label: 'View Results',  icon: 'ri-table-line' },
    { key: 'bulk',   label: 'Bulk Upload',   icon: 'ri-file-upload-line' },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Result Management</h2>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
          Enter component-wise marks, view results and bulk import data.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 9, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {tabs.map(t => (
          (t.key !== 'entry' && t.key !== 'bulk') || user.role !== 'student' ? (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif',
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? '#1a237e' : '#6b7280',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className={t.icon} /> {t.label}
            </button>
          ) : null
        ))}
      </div>

      {tab === 'entry' && user.role !== 'student' && (
        <MarkEntryTab components={components} students={students} courses={courses} />
      )}
      {tab === 'view' && (
        <ViewResultsTab components={components} students={students} courses={courses} user={user} />
      )}
      {tab === 'bulk' && user.role !== 'student' && (
        <BulkUploadTab components={components} courses={courses} />
      )}
      {tab === 'view' && user.role === 'student' && (
        <ViewResultsTab components={components} students={students} courses={courses} user={user} />
      )}
    </div>
  );
}
