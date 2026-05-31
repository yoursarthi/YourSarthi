import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import Btn from '../components/ui/Btn';
import Spin from '../components/ui/Spin';

// ── Style tokens ──────────────────────────────────────────────────────────────
const card  = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' };
const label = { fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 4 };
const inp   = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
  borderRadius: 7, fontSize: 13, color: '#0f172a', boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
};
const sel = { ...inp, background: '#fff' };

const GRADE_COLORS = { O: '#166534', 'A+': '#15803d', A: '#166534', 'B+': '#1d4ed8', B: '#1e40af', C: '#92400e', F: '#991b1b' };

// ── Template Builder / Editor ─────────────────────────────────────────────────
function TemplateForm({ components, programs, initial, onSave, onCancel }) {
  const toast = useToast();
  const [name, setName]         = useState(initial?.template_name || '');
  const [desc, setDesc]         = useState(initial?.description || '');
  const [semester, setSemester] = useState(initial?.semester || '');
  const [programId, setProgramId] = useState(initial?.program_id || '');
  const [comps, setComps]       = useState(
    initial?.components?.length ? initial.components.map(c => ({ component_id: c.component_id, weightage_percentage: c.weightage_percentage })) : [{ component_id: '', weightage_percentage: '' }]
  );
  const [saving, setSaving] = useState(false);

  const totalW = comps.reduce((s, c) => s + (parseFloat(c.weightage_percentage) || 0), 0);

  const addComp = () => setComps(p => [...p, { component_id: '', weightage_percentage: '' }]);
  const removeComp = (i) => setComps(p => p.filter((_, idx) => idx !== i));
  const updateComp = (i, k, v) => setComps(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

  const autoFill = () => {
    const usedComps = comps.filter(c => c.component_id);
    if (!usedComps.length) return;
    const each = Math.floor(100 / usedComps.length);
    const remainder = 100 - each * usedComps.length;
    setComps(p => p.map((c, i) => c.component_id
      ? { ...c, weightage_percentage: each + (i === 0 ? remainder : 0) }
      : c
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validComps = comps.filter(c => c.component_id && c.weightage_percentage);
    if (!validComps.length) return toast('Add at least one component', 'error');
    if (Math.abs(totalW - 100) > 0.01) return toast(`Weightages must total 100% (currently ${totalW.toFixed(1)}%)`, 'error');

    setSaving(true);
    try {
      const payload = { template_name: name, description: desc, semester, program_id: programId || null, components: validComps };
      if (initial?.id) {
        await api.marksheets.updateTemplate(initial.id, payload);
        toast('Template updated', 'success');
      } else {
        await api.marksheets.createTemplate(payload);
        toast('Template created', 'success');
      }
      onSave();
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, maxWidth: 680 }}>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Template Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1/3' }}>
            <div style={label}>Template Name *</div>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. 4th Sem B.Tech CSE — End Sem 2024-25" />
          </div>
          <div>
            <div style={label}>Semester</div>
            <select style={sel} value={semester} onChange={e => setSemester(e.target.value)}>
              <option value="">— Any —</option>
              {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => (
                <option key={s} value={`${s} Semester`}>{s} Semester</option>
              ))}
            </select>
          </div>
          <div>
            <div style={label}>Program</div>
            <select style={sel} value={programId} onChange={e => setProgramId(e.target.value)}>
              <option value="">— All Programs —</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/3' }}>
            <div style={label}>Description</div>
            <input style={inp} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional notes about this template" />
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Components &amp; Weightages</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 5,
              background: Math.abs(totalW - 100) < 0.01 ? '#dcfce7' : '#fef9c3',
              color: Math.abs(totalW - 100) < 0.01 ? '#166534' : '#92400e',
            }}>Total: {totalW.toFixed(1)}%</span>
            <Btn type="button" size="sm" variant="ghost" onClick={autoFill}>Auto-split</Btn>
            <Btn type="button" size="sm" variant="ghost" onClick={addComp}>+ Add</Btn>
          </div>
        </div>
        {comps.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              {i === 0 && <div style={label}>Component</div>}
              <select style={sel} value={c.component_id} onChange={e => updateComp(i, 'component_id', e.target.value)}>
                <option value="">— Select —</option>
                {components.map(comp => <option key={comp.id} value={comp.id}>{comp.component_name}</option>)}
              </select>
            </div>
            <div style={{ width: 120 }}>
              {i === 0 && <div style={label}>Weightage %</div>}
              <input style={inp} type="number" min="0" max="100" step="0.5"
                value={c.weightage_percentage} placeholder="e.g. 70"
                onChange={e => updateComp(i, 'weightage_percentage', e.target.value)} />
            </div>
            <Btn type="button" size="sm" variant="ghost" onClick={() => removeComp(i)}
              style={{ color: '#ef4444', marginBottom: 1 }}>
              <i className="ri-delete-bin-line" />
            </Btn>
          </div>
        ))}
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
          Weightages must total exactly 100%.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Btn type="submit" variant="primary" disabled={saving}>
          {saving ? <Spin size={13} /> : <i className="ri-save-line" />}
          {initial?.id ? ' Update Template' : ' Create Template'}
        </Btn>
        <Btn type="button" variant="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </form>
  );
}

// ── Tab: Templates ────────────────────────────────────────────────────────────
function TemplatesTab({ components, programs }) {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]    = useState(true);
  const [editing, setEditing]    = useState(null); // null | 'new' | templateObj

  const load = useCallback(async () => {
    setLoading(true);
    try { setTemplates(await api.marksheets.templates()); }
    catch (e) { toast(e.message, 'error'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try { await api.marksheets.deleteTemplate(id); toast('Deleted', 'success'); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  if (editing !== null) {
    return (
      <TemplateForm
        components={components}
        programs={programs}
        initial={editing === 'new' ? null : editing}
        onSave={() => { setEditing(null); load(); }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <Btn variant="primary" onClick={() => setEditing('new')}>
          <i className="ri-add-line" /> New Template
        </Btn>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}
      {!loading && templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          No templates yet. Create one to configure component weightages.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
        {templates.map(t => (
          <div key={t.id} style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.template_name}</div>
                {t.semester && <div style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>{t.semester}</div>}
                {t.description && <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 3 }}>{t.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn size="sm" variant="ghost" onClick={() => setEditing(t)}>
                  <i className="ri-edit-line" />
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => handleDelete(t.id)}>
                  <i className="ri-delete-bin-line" style={{ color: '#ef4444' }} />
                </Btn>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(t.components || []).map(c => (
                <span key={c.id} style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 4,
                  background: '#eff6ff', color: '#1d4ed8', fontWeight: 500,
                }}>
                  {c.component_name}: {parseFloat(c.weightage_percentage)}%
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
              {t.program_name || 'All programs'} · Created {new Date(t.created_at).toLocaleDateString('en-IN')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Marksheet Preview Card ────────────────────────────────────────────────────
function MarksheetPreview({ ms }) {
  const passColor = ms.overall_result === 'PASS' ? '#166534' : '#991b1b';
  return (
    <div style={{ ...card, maxWidth: 700, margin: '0 auto 20px' }}>
      {/* Header */}
      <div style={{ background: '#1a237e', color: '#fff', padding: '14px 20px', margin: '-16px -18px 14px', borderRadius: '10px 10px 0 0' }}>
        <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'center', letterSpacing: 1 }}>YOUR SARTHI PLATFORM</div>
        <div style={{ fontSize: 11, opacity: 0.8, textAlign: 'center', marginTop: 2 }}>Grade Card · {ms.semester} · {ms.academic_year}</div>
      </div>

      {/* Student */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12.5, marginBottom: 14 }}>
        {[
          ['Student', ms.student.name],
          ['Roll No.', ms.student.roll_no],
          ['Enrollment', ms.student.enrollment_no],
          ['Program', ms.student.program],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 6, borderBottom: '1px solid #f3f4f6', padding: '3px 0' }}>
            <span style={{ color: '#6b7280', minWidth: 80 }}>{k}:</span>
            <span style={{ fontWeight: 600 }}>{v || '—'}</span>
          </div>
        ))}
      </div>

      {/* Marks Table */}
      <div style={{ overflowX: 'auto', marginBottom: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#1a237e', color: '#fff' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Course</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Cr</th>
              {(ms.courses[0]?.breakdown || []).map(b => (
                <th key={b.component_id} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10 }}>
                  {b.component_name}<br /><span style={{ opacity: 0.8 }}>({b.weightage}%)</span>
                </th>
              ))}
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>%</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Grade</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>GP</th>
            </tr>
          </thead>
          <tbody>
            {ms.courses.map((course, i) => (
              <tr key={course.course_id} style={{ background: i % 2 ? '#f8f9ff' : '#fff', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '6px 8px' }}>
                  <div style={{ fontWeight: 600, fontSize: 11 }}>{course.course_code}</div>
                  <div style={{ fontSize: 10.5, color: '#6b7280' }}>{course.course_name}</div>
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>{course.credits}</td>
                {course.breakdown.map(b => (
                  <td key={b.component_id} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11 }}>
                    {b.marks_obtained}/{b.max_marks}
                  </td>
                ))}
                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, color: course.passed ? '#166534' : '#991b1b' }}>
                  {course.finalPercentage.toFixed(1)}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                  <span style={{ fontWeight: 700, color: GRADE_COLORS[course.grade] || '#6b7280' }}>{course.grade}</span>
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280' }}>{course.grade_point}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, background: '#f8f9ff', borderRadius: 8, padding: 12 }}>
        {[
          ['SGPA', ms.sgpa?.toFixed(2)],
          ['Total Credits', ms.total_credits],
          ['Earned Credits', ms.earned_credits],
          ['Result', ms.overall_result],
        ].map(([k, v]) => (
          <div key={k} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, color: '#6b7280' }}>{k}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: k === 'Result' ? passColor : '#1a237e', marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Generate Marksheet ───────────────────────────────────────────────────
function GenerateTab({ components, students, courses }) {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    templateId: '', semester: '', academicYear: '',
    selectedStudents: [], selectedCourses: [],
  });
  const [studentSearch, setStudentSearch] = useState('');
  const [preview, setPreview]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfResult, setPdfResult]   = useState(null);

  useEffect(() => {
    api.marksheets.templates().then(setTemplates).catch(e => toast(e.message, 'error'));
  }, []);

  const toggleItem = (key, id) => {
    setForm(p => ({
      ...p,
      [key]: p[key].includes(id) ? p[key].filter(x => x !== id) : [...p[key], id],
    }));
  };

  const handlePreview = async () => {
    if (!form.templateId || !form.semester || !form.academicYear || !form.selectedStudents.length || !form.selectedCourses.length) {
      return toast('Fill all fields and select at least one student and one course', 'error');
    }
    setLoading(true);
    setPdfResult(null);
    try {
      const res = await api.marksheets.generate({
        templateId:   form.templateId,
        studentIds:   form.selectedStudents,
        courseIds:    form.selectedCourses,
        semester:     form.semester,
        academicYear: form.academicYear,
      });
      setPreview(res.marksheets);
    } catch (e) { toast(e.message, 'error'); }
    setLoading(false);
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const res = await api.marksheets.generatePdf({
        templateId:   form.templateId,
        studentIds:   form.selectedStudents,
        courseIds:    form.selectedCourses,
        semester:     form.semester,
        academicYear: form.academicYear,
      });
      setPdfResult(res);
      toast(`Generated ${res.generated} marksheet(s)`, 'success');
    } catch (e) { toast(e.message, 'error'); }
    setGenerating(false);
  };

  const filteredStudents = students.filter(s => {
    const q = studentSearch.toLowerCase();
    return !q || `${s.first_name} ${s.last_name} ${s.id} ${s.enrollment_no}`.toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Left col: settings */}
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Marksheet Settings</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={label}>Template *</div>
                <select style={sel} value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}>
                  <option value="">— Select Template —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.template_name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={label}>Semester *</div>
                  <select style={sel} value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}>
                    <option value="">— Select —</option>
                    {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => (
                      <option key={s} value={`${s} Semester`}>{s} Semester</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={label}>Academic Year *</div>
                  <input style={inp} placeholder="2024-25" value={form.academicYear}
                    onChange={e => setForm(p => ({ ...p, academicYear: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* Course selection */}
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
              Courses ({form.selectedCourses.length} selected)
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {courses.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 12.5 }}>
                  <input type="checkbox" checked={form.selectedCourses.includes(c.id)}
                    onChange={() => toggleItem('selectedCourses', c.id)} />
                  <span style={{ fontWeight: 500 }}>{c.code}</span>
                  <span style={{ color: '#6b7280' }}>{c.name}</span>
                  <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 11 }}>{c.credits} cr</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Btn size="sm" variant="ghost" onClick={() => setForm(p => ({ ...p, selectedCourses: courses.map(c => c.id) }))}>All</Btn>
              <Btn size="sm" variant="ghost" onClick={() => setForm(p => ({ ...p, selectedCourses: [] }))}>None</Btn>
            </div>
          </div>
        </div>

        {/* Right col: student selection */}
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
            Students ({form.selectedStudents.length} selected)
          </div>
          <input style={{ ...inp, marginBottom: 8 }} placeholder="Search student…" value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)} />
          <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredStudents.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer', borderRadius: 5, background: form.selectedStudents.includes(s.id) ? '#eff6ff' : 'transparent', fontSize: 12.5 }}>
                <input type="checkbox" checked={form.selectedStudents.includes(s.id)}
                  onChange={() => toggleItem('selectedStudents', s.id)} />
                <span>{s.first_name} {s.last_name}</span>
                <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 'auto' }}>{s.enrollment_no || s.id}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn size="sm" variant="ghost" onClick={() => setForm(p => ({ ...p, selectedStudents: filteredStudents.map(s => s.id) }))}>All</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setForm(p => ({ ...p, selectedStudents: [] }))}>None</Btn>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <Btn variant="primary" onClick={handlePreview} disabled={loading}>
          {loading ? <Spin size={13} /> : <i className="ri-eye-line" />} Preview Marksheets
        </Btn>
        {preview?.length > 0 && (
          <Btn variant="primary" onClick={handleGeneratePdf} disabled={generating}
            style={{ background: '#1a237e' }}>
            {generating ? <Spin size={13} /> : <i className="ri-file-pdf-line" />} Generate &amp; Save PDFs
          </Btn>
        )}
      </div>

      {/* PDF result */}
      {pdfResult && (
        <div style={{ ...card, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: '#166534', marginBottom: 8 }}>
            {pdfResult.generated} PDF(s) generated and saved
          </div>
          {pdfResult.marksheets.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
              <span>{m.student?.name}</span>
              <a href={api.marksheets.downloadUrl(m.id)} target="_blank" rel="noreferrer">
                <Btn size="sm" variant="ghost"><i className="ri-download-2-line" /> Download</Btn>
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {preview?.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
            Preview — {preview.length} marksheet(s)
          </div>
          {preview.map((ms, i) => <MarksheetPreview key={i} ms={ms} />)}
        </div>
      )}
    </div>
  );
}

// ── Tab: Generated Marksheets ─────────────────────────────────────────────────
function GeneratedTab() {
  const toast = useToast();
  const [list, setList]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [semFilter, setSemFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (semFilter) params.semester = semFilter;
      setList(await api.marksheets.generated(params));
    } catch (e) { toast(e.message, 'error'); }
    setLoading(false);
  }, [semFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <select style={{ ...sel, width: 200 }} value={semFilter} onChange={e => setSemFilter(e.target.value)}>
          <option value="">All Semesters</option>
          {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => (
            <option key={s} value={`${s} Semester`}>{s} Semester</option>
          ))}
        </select>
        <Btn variant="ghost" onClick={load}><i className="ri-refresh-line" /></Btn>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}
      {!loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No generated marksheets yet.</div>
      )}
      {!loading && list.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Student', 'Roll / Enrollment', 'Template', 'Semester', 'Year', 'Generated', 'Download'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 500 }}>{m.student_name || '—'}</td>
                  <td style={{ padding: '7px 10px', color: '#6b7280', fontSize: 11 }}>{m.roll_no || '—'} / {m.enrollment_no || '—'}</td>
                  <td style={{ padding: '7px 10px' }}>{m.template_name || '—'}</td>
                  <td style={{ padding: '7px 10px' }}>{m.semester}</td>
                  <td style={{ padding: '7px 10px', color: '#6b7280' }}>{m.academic_year}</td>
                  <td style={{ padding: '7px 10px', color: '#6b7280', fontSize: 11 }}>
                    {new Date(m.generated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    {m.generated_pdf_path ? (
                      <a href={api.marksheets.downloadUrl(m.id)} target="_blank" rel="noreferrer">
                        <Btn size="sm" variant="ghost"><i className="ri-file-pdf-line" style={{ color: '#dc2626' }} /> PDF</Btn>
                      </a>
                    ) : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MarksheetBuilder({ user }) {
  const toast                       = useToast();
  const [tab, setTab]               = useState('templates');
  const [components, setComponents] = useState([]);
  const [students, setStudents]     = useState([]);
  const [courses, setCourses]       = useState([]);
  const [programs, setPrograms]     = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.results.components(),
      api.students.list().catch(() => []),
      api.courses.list().catch(() => []),
      fetch('/api/programs').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([comps, studs, crses, progs]) => {
      setComponents(comps);
      setStudents(studs);
      setCourses(crses);
      setPrograms(progs);
    }).catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { key: 'templates', label: 'Templates',          icon: 'ri-layout-3-line' },
    { key: 'generate',  label: 'Generate Marksheet', icon: 'ri-file-chart-line' },
    { key: 'generated', label: 'Generated',          icon: 'ri-folder-open-line' },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Marksheet Builder</h2>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
          Configure templates with component weightages and generate dynamic marksheets.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 9, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {tabs.map(t => (
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
        ))}
      </div>

      {tab === 'templates' && <TemplatesTab components={components} programs={programs} />}
      {tab === 'generate'  && <GenerateTab  components={components} students={students} courses={courses} />}
      {tab === 'generated' && <GeneratedTab />}
    </div>
  );
}
