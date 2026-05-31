import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../api/client';
import PaperPrintView from './PaperPrintView';

function fileToB64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result.split(',')[1];
      resolve({ b64, mime: file.type || 'application/pdf', name: file.name });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const BLOOMS_COLORS = {
  L1: '#6b7280', L2: '#3b82f6', L3: '#10b981',
  L4: '#f59e0b', L5: '#ef4444', L6: '#8b5cf6',
  remember: '#6b7280', understand: '#3b82f6', apply: '#10b981',
  analyze: '#f59e0b', evaluate: '#ef4444', create: '#8b5cf6',
};
const BLOOMS_LABELS = {
  L1: 'Remember', L2: 'Understand', L3: 'Apply',
  L4: 'Analyze', L5: 'Evaluate', L6: 'Create',
};
const DIFF_COLORS = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };
const TYPE_ICONS = { mcq: 'ri-list-check', short: 'ri-file-text-line', long: 'ri-article-line', numerical: 'ri-calculator-line', 'case-study': 'ri-briefcase-line' };

// Light-mode style helpers
const S = {
  card: {
    background: '#ffffff',
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 10,
    padding: '16px 20px',
    marginBottom: 16,
  },
  inp: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid rgba(15,23,42,0.12)',
    borderRadius: 6,
    fontSize: 13,
    background: '#f8fafc',
    color: '#0f172a',
    outline: 'none',
  },
  btn: (c = '#6366f1') => ({
    background: c,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  }),
  badge: (bg = '#f1f5f9', color = '#64748b') => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 20,
    background: bg,
    color,
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid rgba(15,23,42,0.08)',
  }),
  tag: (blooms) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 20,
    background: (BLOOMS_COLORS[blooms] || '#6b7280') + '22',
    color: BLOOMS_COLORS[blooms] || '#94a3b8',
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid rgba(15,23,42,0.08)',
  }),
};

const B = {
  blue:   (t) => S.badge('rgba(59,130,246,0.1)',   t || '#1d4ed8'),
  green:  (t) => S.badge('rgba(16,185,129,0.1)',   t || '#059669'),
  amber:  (t) => S.badge('rgba(245,158,11,0.1)',   t || '#d97706'),
  indigo: (t) => S.badge('rgba(99,102,241,0.1)',   t || '#4f46e5'),
  gray:   (t) => S.badge('rgba(100,116,139,0.08)', t || '#64748b'),
  white:  (t) => S.badge('#f1f5f9',                t || '#334155'),
};

function DropZone({ label, icon, accept, files, onFiles, multiple = true }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const handleDrop = useCallback(e => {
    e.preventDefault(); setDrag(false);
    const dropped = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf');
    if (dropped.length) onFiles(multiple ? dropped : [dropped[0]]);
  }, [onFiles, multiple]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => ref.current.click()}
      style={{
        border: `2px dashed ${drag ? '#6366f1' : 'rgba(99,102,241,0.25)'}`,
        borderRadius: 10,
        padding: '20px 16px',
        cursor: 'pointer',
        background: drag ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)',
        textAlign: 'center',
        transition: 'all .2s',
      }}
    >
      <input ref={ref} type="file" accept={accept} multiple={multiple} style={{ display: 'none' }}
        onChange={e => { const fs = [...e.target.files]; if (fs.length) onFiles(multiple ? fs : [fs[0]]); e.target.value = ''; }} />
      <i className={icon} style={{ fontSize: 28, color: drag ? '#6366f1' : '#4f5b73', display: 'block', marginBottom: 8 }} />
      <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{label}</p>
      <p style={{ fontSize: 11, color: '#64748b' }}>Drag & drop PDF(s) or click to browse · Max 100MB per file</p>
      {files.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
          {files.map((f, i) => (
            <span key={i} style={{ ...B.blue(), padding: '3px 9px' }}>
              <i className="ri-file-pdf-line" style={{ marginRight: 3 }} />{f.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BloomsBar({ distribution, onChange }) {
  const levels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
  const total = levels.reduce((s, l) => s + (distribution[l] || 0), 0);
  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
        {levels.map(l => {
          const pct = distribution[l] || 0;
          return pct > 0 ? (
            <div key={l} style={{ width: `${pct}%`, background: BLOOMS_COLORS[l], transition: 'width .3s' }} title={`${BLOOMS_LABELS[l]}: ${pct}%`} />
          ) : null;
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px 12px' }}>
        {levels.map(l => (
          <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: BLOOMS_COLORS[l], flexShrink: 0 }} />
            <span style={{ color: '#64748b', minWidth: 70 }}>{BLOOMS_LABELS[l]}</span>
            <input type="number" min={0} max={100} value={distribution[l] || 0}
              onChange={e => onChange({ ...distribution, [l]: parseInt(e.target.value) || 0 })}
              style={{ ...S.inp, padding: '2px 6px', width: 52, fontSize: 12 }} />
            <span style={{ color: '#64748b' }}>%</span>
          </label>
        ))}
      </div>
      {total !== 100 && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>Total: {total}% (must equal 100%)</p>}
    </div>
  );
}

export default function SyllabusEngine({ user }) {
  const [tab, setTab] = useState(0);

  const [syllabusFiles, setSyllabusFiles] = useState([]);
  const [materialFiles, setMaterialFiles] = useState([]);
  const [courseCode, setCourseCode] = useState('');
  const [manualCos, setManualCos] = useState([{ code: '', description: '' }]);
  const [manualPos, setManualPos] = useState([{ code: '', description: '' }]);
  const [useManualCOs, setUseManualCOs] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  const [syllabi, setSyllabi] = useState([]);
  const [activeSyllabus, setActiveSyllabus] = useState(null);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState({});

  const [genUnits, setGenUnits] = useState([]);
  const [genConfig, setGenConfig] = useState({
    typeDistribution: { mcq: 3, short: 3, numerical: 2, long: 2, 'case-study': 0 },
    difficultyRatio: { easy: 20, medium: 50, hard: 30 },
    bloomsRatio: { L1: 5, L2: 15, L3: 30, L4: 30, L5: 15, L6: 5 },
  });
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [generatedQs, setGeneratedQs] = useState([]);
  const [genErrors, setGenErrors] = useState([]);

  const [paperConfig, setPaperConfig] = useState({
    title: '', subject: '', duration: 180, examDate: '', instructions: '',
    sections: [
      { label: 'A', type: 'mcq', difficulty: 'easy', count: 10, marksPerQ: 1 },
      { label: 'B', type: 'short', difficulty: 'medium', count: 5, marksPerQ: 5 },
      { label: 'C', type: 'long', difficulty: 'hard', count: 3, marksPerQ: 10 },
    ],
  });
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState(null);
  const [buildError, setBuildError] = useState('');

  const [examType, setExamType] = useState('endterm');
  const [selectedUnitsForPaper, setSelectedUnitsForPaper] = useState([]);
  const [templateConfig, setTemplateConfig] = useState({
    institution: 'Your Sarthi Platform',
    department: '', program: '', semester: '', academicYear: '2025-26', examRoom: '',
  });
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  const [papers, setPapers] = useState([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(null);
  const [notifyForm, setNotifyForm] = useState({ teacherName: '', teacherEmail: '', message: '' });
  const [notifying, setNotifying] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.syllabus.list().then(setSyllabi).catch(() => {});
    api.syllabus.notifications().then(r => setNotifications(r.notifications || [])).catch(() => {});
  }, []);

  const loadSyllabus = async (id) => {
    setLoadingSyllabus(true);
    try {
      const s = await api.syllabus.get(id);
      setActiveSyllabus(s);
      setGenUnits((s.units || []).map(u => u.number));
      setSelectedUnitsForPaper((s.units || []).map(u => u.number));
      setPaperConfig(p => ({ ...p, title: `${s.courseCode} End-Sem Paper`, subject: s.title }));
      setTemplateConfig(t => ({
        ...t,
        department: s.department || t.department,
        program: s.program || t.program,
        semester: s.semester || t.semester,
      }));
      setTab(1);
    } catch (e) { alert(e.message); }
    setLoadingSyllabus(false);
  };

  const handleParse = async () => {
    if (!syllabusFiles.length) return setParseError('Upload at least one syllabus PDF');
    const MAX_FILE_MB = 150;
    const oversized = [...syllabusFiles, ...materialFiles].filter(f => f.size > MAX_FILE_MB * 1024 * 1024);
    if (oversized.length) return setParseError(`File(s) too large (max ${MAX_FILE_MB}MB each): ${oversized.map(f => f.name).join(', ')}`);
    setParsing(true); setParseError('');
    try {
      const filteredCos = useManualCOs ? manualCos.filter(c => c.code && c.description) : [];
      const filteredPos = useManualCOs ? manualPos.filter(p => p.code && p.description) : [];
      const formData = new FormData();
      formData.append('courseCode', courseCode);
      if (filteredCos.length) formData.append('manualCos', JSON.stringify(filteredCos));
      if (filteredPos.length) formData.append('manualPos', JSON.stringify(filteredPos));
      syllabusFiles.forEach(f => formData.append('syllabusFile', f));
      materialFiles.forEach(f => formData.append('materialFile', f));
      const result = await api.syllabus.parse(formData);
      setActiveSyllabus(result);
      setGenUnits((result.units || []).map(u => u.number));
      setSelectedUnitsForPaper((result.units || []).map(u => u.number));
      setPaperConfig(p => ({ ...p, title: `${result.courseCode || courseCode} End-Sem Paper`, subject: result.courseTitle || '' }));
      setTemplateConfig(t => ({
        ...t,
        department: result.department || t.department,
        program: result.program || t.program,
        semester: result.semester || t.semester,
      }));
      setSyllabi(prev => [{ id: result.id, course_code: result.courseCode, title: result.courseTitle, credits: result.credits, created_at: new Date().toISOString() }, ...prev]);
      setSyllabusFiles([]); setMaterialFiles([]);
      setTab(1);
    } catch (e) { setParseError(e.message); }
    setParsing(false);
  };

  const handleGenerate = async () => {
    if (!activeSyllabus?.id) return;
    setGenerating(true); setGeneratedQs([]); setGenErrors([]);
    setGenProgress(`Generating questions for ${genUnits.length} unit(s)…`);
    try {
      const formData = new FormData();
      formData.append('unitNumbers', JSON.stringify(genUnits));
      formData.append('config', JSON.stringify(genConfig));
      materialFiles.forEach(f => formData.append('materialFile', f));
      const result = await api.syllabus.generateQuestions(activeSyllabus.id, formData);
      setGeneratedQs(result.questions || []);
      setGenErrors(result.errors || []);
      setGenProgress(result.message || 'Done');
    } catch (e) { setGenProgress(''); alert(e.message); }
    setGenerating(false);
  };

  const handleBuildPaper = async (mode = 'exam') => {
    if (!activeSyllabus?.id) return;
    if (examType === 'midterm' && !selectedUnitsForPaper.length) { setBuildError('Select at least one unit for Mid-Term paper.'); return; }
    const total = paperConfig.sections.reduce((s, sec) => s + sec.count * sec.marksPerQ, 0);
    setBuilding(true); setBuildResult(null); setBuildError('');
    try {
      const result = await api.syllabus.buildPaper(activeSyllabus.id, {
        ...paperConfig, totalMarks: total, examType,
        unitFilter: examType === 'midterm' ? selectedUnitsForPaper : [],
        program: templateConfig.program, department: templateConfig.department,
        semester: templateConfig.semester, templateConfig,
        includeAnswers: mode === 'answer-key',
      });
      setBuildResult({
        ...result, examType, templateConfig,
        examDate: paperConfig.examDate,
        duration: paperConfig.duration,
        instructions: paperConfig.instructions,
        sections: paperConfig.sections,
        paperMode: mode,
      });
    } catch (e) { setBuildError(e.message); }
    setBuilding(false);
  };

  const handleFetchPapers = async () => {
    setLoadingPapers(true);
    try {
      const [papersRes, notifsRes] = await Promise.all([api.syllabus.papers(), api.syllabus.notifications()]);
      setPapers(papersRes.papers || []);
      setNotifications(notifsRes.notifications || []);
    } catch (e) { alert(e.message); }
    setLoadingPapers(false);
  };

  const handleNotify = async (paperId) => {
    setNotifying(true);
    try {
      await api.syllabus.notifyTeacher(paperId, notifyForm);
      setShowNotifyModal(null);
      setNotifyForm({ teacherName: '', teacherEmail: '', message: '' });
      await handleFetchPapers();
    } catch (e) { alert(e.message); }
    setNotifying(false);
  };

  const TABS = [
    ['ri-upload-cloud-2-line', 'Upload & Parse'],
    ['ri-book-open-line', 'Syllabus Review'],
    ['ri-sparkling-line', 'Generate Questions'],
    ['ri-file-paper-2-line', 'Build Paper'],
    ['ri-archive-line', 'Paper Repository'],
  ];

  const lbl = { fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }} className="page-fade">
      {/* Tab bar */}
      <div className="tab-bar" style={{ marginBottom: 20, width: '100%' }}>
        {TABS.map(([ic, t], i) => (
          <button key={i} onClick={() => setTab(i)} className={`tab-btn${tab === i ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, justifyContent: 'center' }}>
            <i className={ic} style={{ fontSize: 12 }} />{t}
          </button>
        ))}
      </div>

      {/* ── TAB 0: Upload & Parse ──────────────────────────────────────────────── */}
      {tab === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={S.card}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}>
                <i className="ri-file-pdf-line" style={{ color: '#ef4444' }} />Syllabus PDF(s)
              </h3>
              <DropZone label="Upload Syllabus" icon="ri-upload-cloud-2-line" accept=".pdf" files={syllabusFiles} onFiles={setSyllabusFiles} />
            </div>

            <div style={S.card}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}>
                <i className="ri-book-open-line" style={{ color: '#3b82f6' }} />Course Material <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>(optional)</span>
              </h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                Upload lecture notes, textbook chapters, or reference material. Gemini will use these to generate richer questions.
              </p>
              <DropZone label="Upload Course Material" icon="ri-file-text-line" accept=".pdf" files={materialFiles} onFiles={setMaterialFiles} />
            </div>

            {syllabi.length > 0 && (
              <div style={S.card}>
                <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Previously Parsed</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {syllabi.map(s => (
                    <div key={s.id} onClick={() => loadSyllabus(s.id)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 11px', borderRadius: 7, cursor: 'pointer', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.07)', transition: 'border-color 0.15s, background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(15,23,42,0.07)'; }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#4f46e5' }}>{s.course_code}</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>{s.title}</span>
                      </div>
                      <i className="ri-arrow-right-line" style={{ color: '#64748b' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div style={S.card}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}>
                <i className="ri-settings-3-line" style={{ color: '#64748b' }} />Configuration
              </h3>
              <label style={lbl}>Course Code (optional)</label>
              <input value={courseCode} onChange={e => setCourseCode(e.target.value.toUpperCase())} placeholder="e.g. CSE301" style={{ ...S.inp, marginBottom: 12 }} />

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 14, cursor: 'pointer', color: '#64748b' }}>
                <input type="checkbox" checked={useManualCOs} onChange={e => setUseManualCOs(e.target.checked)} />
                Provide COs / POs manually
              </label>

              {useManualCOs && (
                <>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Course Outcomes</p>
                  {manualCos.map((co, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 24px', gap: 6, marginBottom: 6 }}>
                      <input value={co.code} onChange={e => setManualCos(cs => cs.map((c, j) => j === i ? { ...c, code: e.target.value } : c))} placeholder="CO1" style={S.inp} />
                      <input value={co.description} onChange={e => setManualCos(cs => cs.map((c, j) => j === i ? { ...c, description: e.target.value } : c))} placeholder="Students will be able to…" style={S.inp} />
                      <button onClick={() => setManualCos(cs => cs.filter((_, j) => j !== i))} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, cursor: 'pointer', color: '#f87171' }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setManualCos(cs => [...cs, { code: `CO${cs.length + 1}`, description: '' }])} style={{ ...S.btn('#10b981'), fontSize: 11, padding: '4px 10px', marginBottom: 14 }}>+ Add CO</button>

                  <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, marginTop: 4 }}>Program Outcomes</p>
                  {manualPos.map((po, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 24px', gap: 6, marginBottom: 6 }}>
                      <input value={po.code} onChange={e => setManualPos(ps => ps.map((p, j) => j === i ? { ...p, code: e.target.value } : p))} placeholder="PO1" style={S.inp} />
                      <input value={po.description} onChange={e => setManualPos(ps => ps.map((p, j) => j === i ? { ...p, description: e.target.value } : p))} placeholder="Engineering knowledge…" style={S.inp} />
                      <button onClick={() => setManualPos(ps => ps.filter((_, j) => j !== i))} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, cursor: 'pointer', color: '#f87171' }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setManualPos(ps => [...ps, { code: `PO${ps.length + 1}`, description: '' }])} style={{ ...S.btn('#10b981'), fontSize: 11, padding: '4px 10px', marginBottom: 14 }}>+ Add PO</button>
                </>
              )}

              {parseError && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{parseError}</p>}

              <button onClick={handleParse} disabled={parsing} className="btn btn-primary" style={{ width: '100%', padding: '11px', fontSize: 14, opacity: parsing ? .7 : 1, gap: 6 }}>
                <i className={parsing ? 'ri-loader-4-line' : 'ri-brain-line'} />
                {parsing ? 'Parsing with Gemini…' : 'Parse Syllabus'}
              </button>
            </div>

            <div style={S.card}>
              <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What the engine extracts</h3>
              {[
                ['ri-git-branch-line', '#3b82f6', 'Units & Topics', 'All units with sub-topics and teaching hours'],
                ['ri-target-line', '#10b981', 'Course Outcomes', "CO codes, descriptions, Bloom's levels, PO mapping"],
                ['ri-award-line', '#f59e0b', 'Program Outcomes', 'PO codes and descriptions per NBA/ABET framework'],
                ['ri-lightbulb-line', '#8b5cf6', 'Exam Concepts', 'Key concepts per unit for question generation'],
                ['ri-book-2-line', '#ef4444', 'References', 'Textbooks and reference material'],
              ].map(([icon, color, title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={icon} style={{ color, fontSize: 14 }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 12.5, color: '#1e293b' }}>{title}</p>
                    <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 1: Syllabus Review ─────────────────────────────────────────────── */}
      {tab === 1 && (
        activeSyllabus ? (
          <div>
            <div style={{
              background: 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 14,
              padding: '20px 24px',
              marginBottom: 20,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(99,102,241,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{activeSyllabus.courseTitle || activeSyllabus.title}</h2>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {activeSyllabus.courseCode && <span style={B.white()}>{activeSyllabus.courseCode}</span>}
                    {activeSyllabus.credits && <span style={B.white()}>{activeSyllabus.credits} Credits</span>}
                    {activeSyllabus.semester && <span style={B.white()}>{activeSyllabus.semester} Semester</span>}
                    <span style={B.white()}>{(activeSyllabus.units || []).length} Units</span>
                    <span style={B.white()}>{(activeSyllabus.cos || activeSyllabus.courseOutcomes || []).length} COs</span>
                  </div>
                </div>
                <button onClick={() => { setActiveSyllabus(null); setTab(0); }} className="btn btn-ghost" style={{ fontSize: 12, gap: 5 }}>
                  <i className="ri-upload-2-line" />New Upload
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ri-git-branch-line" style={{ color: '#3b82f6' }} />Units & Topics
                </h3>
                {(activeSyllabus.units || []).map(unit => (
                  <div key={unit.number} style={{ ...S.card, padding: '12px 16px', marginBottom: 8 }}>
                    <div onClick={() => setExpandedUnits(e => ({ ...e, [unit.number]: !e[unit.number] }))}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#4f46e5' }}>Unit {unit.number}: </span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{unit.title}</span>
                        {unit.hours && <span style={{ ...B.gray(), marginLeft: 8, fontSize: 10 }}>{unit.hours}h</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {(unit.coMapping || []).map(co => <span key={co} style={B.blue()}>{co}</span>)}
                        <i className={`ri-arrow-${expandedUnits[unit.number] ? 'up' : 'down'}-s-line`} style={{ color: '#64748b' }} />
                      </div>
                    </div>
                    {expandedUnits[unit.number] && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(15,23,42,0.07)' }}>
                        {(unit.topics || []).map(topic => (
                          <div key={topic} style={{ marginBottom: 6 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
                              <i className="ri-arrow-right-s-line" style={{ color: '#6366f1' }} />{topic}
                            </p>
                            {unit.subTopics?.[topic]?.map(st => (
                              <p key={st} style={{ margin: '2px 0 0 16px', fontSize: 11, color: '#64748b' }}>• {st}</p>
                            ))}
                          </div>
                        ))}
                        {unit.keyConceptsForExam?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Key exam concepts</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {unit.keyConceptsForExam.map(c => <span key={c} style={B.green()}>{c}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ri-target-line" style={{ color: '#10b981' }} />Course Outcomes
                </h3>
                {(activeSyllabus.cos || activeSyllabus.courseOutcomes || []).map(co => (
                  <div key={co.code} style={{ ...S.card, padding: '10px 14px', marginBottom: 8, borderLeft: `3px solid ${BLOOMS_COLORS[co.bloomsLevel] || 'rgba(99,102,241,0.3)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#4f46e5' }}>{co.code}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={S.tag(co.bloomsLevel)}>{co.bloomsLevel} {co.bloomsVerb || BLOOMS_LABELS[co.bloomsLevel] || ''}</span>
                        {(co.poMapping || []).map(po => <span key={po} style={B.amber()}>{po}</span>)}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{co.description}</p>
                    {co.unitMapping?.length > 0 && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Units: {co.unitMapping.join(', ')}</p>
                    )}
                  </div>
                ))}

                <h3 style={{ margin: '16px 0 12px', fontSize: 14, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ri-award-line" style={{ color: '#f59e0b' }} />Program Outcomes
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {(activeSyllabus.pos || activeSyllabus.programOutcomes || []).map(po => (
                    <div key={po.code} style={{ ...S.card, padding: '8px 12px', marginBottom: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#d97706' }}>{po.code}: </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{po.description}</span>
                    </div>
                  ))}
                </div>

                {(activeSyllabus.textbooks?.length > 0 || activeSyllabus.references?.length > 0) && (
                  <div style={{ ...S.card, marginTop: 16 }}>
                    {activeSyllabus.textbooks?.length > 0 && (
                      <>
                        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <i className="ri-book-2-line" style={{ color: '#ef4444' }} />Textbooks
                        </p>
                        {activeSyllabus.textbooks.map((t, i) => <p key={i} style={{ margin: '0 0 4px', fontSize: 11.5, color: '#64748b' }}>{i + 1}. {t}</p>)}
                      </>
                    )}
                    {activeSyllabus.references?.length > 0 && (
                      <>
                        <p style={{ margin: '12px 0 8px', fontWeight: 700, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <i className="ri-links-line" style={{ color: '#3b82f6' }} />References
                        </p>
                        {activeSyllabus.references.map((r, i) => <p key={i} style={{ margin: '0 0 4px', fontSize: 11.5, color: '#64748b' }}>{i + 1}. {r}</p>)}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <i className="ri-file-unknow-line" style={{ fontSize: 48, color: '#374151', display: 'block', marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>No syllabus loaded. Upload and parse a syllabus first.</p>
            <button onClick={() => setTab(0)} className="btn btn-primary" style={{ gap: 6 }}><i className="ri-upload-2-line" />Go to Upload</button>
          </div>
        )
      )}

      {/* ── TAB 2: Generate Questions ──────────────────────────────────────────── */}
      {tab === 2 && (
        activeSyllabus ? (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
            <div>
              <div style={S.card}>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Select Units</h3>
                {(activeSyllabus.units || []).map(unit => (
                  <label key={unit.number} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 13, color: '#64748b' }}>
                    <input type="checkbox" checked={genUnits.includes(unit.number)} onChange={e => setGenUnits(us => e.target.checked ? [...us, unit.number] : us.filter(n => n !== unit.number))} style={{ marginTop: 2 }} />
                    <span><b style={{ color: '#4f46e5' }}>U{unit.number}</b> {unit.title} {unit.hours ? <span style={{ color: '#64748b' }}>({unit.hours}h)</span> : ''}</span>
                  </label>
                ))}
                <div style={{ borderTop: '1px solid rgba(15,23,42,0.07)', paddingTop: 8, marginTop: 4, display: 'flex', gap: 6 }}>
                  <button onClick={() => setGenUnits((activeSyllabus.units || []).map(u => u.number))} style={{ ...S.btn('#10b981'), fontSize: 11, padding: '4px 10px' }}>All</button>
                  <button onClick={() => setGenUnits([])} style={{ ...S.btn('#475569'), fontSize: 11, padding: '4px 10px' }}>None</button>
                </div>
              </div>

              <div style={S.card}>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Questions per Unit</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(genConfig.typeDistribution).map(([type, count]) => (
                    <label key={type} style={{ fontSize: 12, color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                        <i className={TYPE_ICONS[type] || 'ri-question-line'} style={{ color: '#64748b' }} />
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{type}</span>
                      </div>
                      <input type="number" min={0} max={20} value={count}
                        onChange={e => setGenConfig(c => ({ ...c, typeDistribution: { ...c.typeDistribution, [type]: parseInt(e.target.value) || 0 } }))}
                        style={{ ...S.inp, padding: '4px 8px' }} />
                    </label>
                  ))}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b' }}>
                  Total per unit: {Object.values(genConfig.typeDistribution).reduce((s, n) => s + n, 0)} questions
                </p>
              </div>

              <div style={S.card}>
                <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Difficulty Ratio (%)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {Object.entries(genConfig.difficultyRatio).map(([d, v]) => (
                    <label key={d} style={{ fontSize: 12, color: '#64748b' }}>
                      <span style={{ ...S.badge(DIFF_COLORS[d] + '22', DIFF_COLORS[d]), marginBottom: 4, display: 'inline-block' }}>{d}</span>
                      <input type="number" min={0} max={100} value={v}
                        onChange={e => setGenConfig(c => ({ ...c, difficultyRatio: { ...c.difficultyRatio, [d]: parseInt(e.target.value) || 0 } }))}
                        style={{ ...S.inp, padding: '4px 8px' }} />
                    </label>
                  ))}
                </div>
              </div>

              <div style={S.card}>
                <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Bloom's Distribution (%)</h3>
                <BloomsBar distribution={genConfig.bloomsRatio} onChange={br => setGenConfig(c => ({ ...c, bloomsRatio: br }))} />
              </div>

              <button onClick={handleGenerate} disabled={generating || !genUnits.length} className="btn btn-primary" style={{ width: '100%', padding: 11, gap: 6, opacity: generating || !genUnits.length ? .6 : 1 }}>
                <i className={generating ? 'ri-loader-4-line' : 'ri-sparkling-line'} />
                {generating ? 'Generating…' : 'Generate Questions'}
              </button>
            </div>

            <div>
              {genProgress && (
                <div style={{ ...S.card, background: generating ? 'rgba(59,130,246,0.07)' : 'rgba(16,185,129,0.07)', borderLeft: `3px solid ${generating ? '#3b82f6' : '#10b981'}`, marginBottom: 12, color: generating ? '#93c5fd' : '#6ee7b7', fontSize: 13 }}>
                  <i className={`${generating ? 'ri-loader-4-line' : 'ri-check-line'}`} style={{ marginRight: 6 }} />{genProgress}
                </div>
              )}
              {genErrors.length > 0 && genErrors.map(e => (
                <div key={e.unit} style={{ ...S.card, background: 'rgba(239,68,68,0.07)', borderLeft: '3px solid #ef4444', marginBottom: 8, color: '#fca5a5', fontSize: 13 }}>
                  <i className="ri-error-warning-line" style={{ marginRight: 4 }} />Unit {e.unit}: {e.error}
                </div>
              ))}
              {generatedQs.length === 0 && !generating && (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <i className="ri-sparkling-2-line" style={{ fontSize: 48, color: '#374151', display: 'block', marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ fontSize: 13, color: '#64748b' }}>Configure generation settings and click Generate.</p>
                  <p style={{ fontSize: 12, color: '#475569' }}>Questions will be saved to the Question Bank automatically.</p>
                </div>
              )}

              {generatedQs.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                    {['mcq', 'short', 'numerical', 'long', 'case-study'].map(t => {
                      const cnt = generatedQs.filter(q => q.type === t).length;
                      return cnt > 0 ? (
                        <div key={t} style={{ ...S.card, padding: '10px 16px', marginBottom: 0, flex: '0 0 auto', textAlign: 'center' }}>
                          <i className={TYPE_ICONS[t]} style={{ color: '#64748b', fontSize: 18, display: 'block', marginBottom: 4 }} />
                          <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 20, color: '#0f172a' }}>{cnt}</p>
                          <p style={{ margin: 0, fontSize: 10, color: '#64748b', textTransform: 'capitalize' }}>{t}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div style={{ maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {generatedQs.map((q, i) => (
                      <div key={i} style={{ ...S.card, padding: '12px 14px', marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            <span style={B.indigo()}>Q{i + 1}</span>
                            <span style={B.gray()}>{q.type}</span>
                            <span style={{ ...S.badge(DIFF_COLORS[q.difficulty] + '22', DIFF_COLORS[q.difficulty]) }}>{q.difficulty}</span>
                            <span style={S.tag(q.bloomsLevel)}>{q.bloomsLevel}</span>
                            <span style={B.green()}>{q.co}</span>
                            <span style={B.amber()}>U{q.unitNumber}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: 13 }}>{q.marks}m</span>
                        </div>
                        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#1e293b' }}>{q.text}</p>
                        {q.options && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginTop: 6 }}>
                            {Object.entries(q.options).map(([k, v]) => (
                              <p key={k} style={{ margin: 0, fontSize: 11, color: k === q.correct ? '#6ee7b7' : '#64748b', fontWeight: k === q.correct ? 700 : 400 }}>
                                {k === q.correct ? '✓ ' : ''}{k}) {v}
                              </p>
                            ))}
                          </div>
                        )}
                        {q.rubric && <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>Rubric: {q.rubric}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>No syllabus loaded. Upload and parse a syllabus first.</p>
            <button onClick={() => setTab(0)} className="btn btn-primary" style={{ gap: 6 }}><i className="ri-upload-2-line" />Go to Upload</button>
          </div>
        )
      )}

      {/* ── TAB 3: Build Paper ─────────────────────────────────────────────────── */}
      {tab === 3 && (
        activeSyllabus ? (
          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20 }}>
            <div>
              <div style={S.card}>
                <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ri-medal-line" style={{ color: '#f59e0b' }} />Examination Type
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { val: 'midterm', label: 'Mid-Term', icon: 'ri-book-open-line', desc: 'Select specific units/topics' },
                    { val: 'endterm', label: 'End-Semester', icon: 'ri-graduation-cap-line', desc: 'Complete syllabus (all units)' },
                  ].map(({ val, label, icon, desc }) => (
                    <button key={val} onClick={() => {
                      setExamType(val);
                      if (val === 'endterm') setSelectedUnitsForPaper((activeSyllabus.units || []).map(u => u.number));
                      if (val === 'midterm') setSelectedUnitsForPaper([]);
                      setPaperConfig(p => ({ ...p, title: `${activeSyllabus.courseCode} ${val === 'midterm' ? 'Mid-Term' : 'End-Sem'} Paper` }));
                    }} style={{
                      border: `2px solid ${examType === val ? '#6366f1' : 'rgba(15,23,42,0.1)'}`,
                      borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                      background: examType === val ? 'rgba(99,102,241,0.08)' : '#f8fafc',
                      transition: 'all .2s',
                    }}>
                      <i className={icon} style={{ color: examType === val ? '#a5b4fc' : '#64748b', marginRight: 6 }} />
                      <strong style={{ fontSize: 13, color: examType === val ? '#a5b4fc' : '#94a3b8' }}>{label}</strong>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>{desc}</p>
                    </button>
                  ))}
                </div>
                {examType === 'midterm' && (
                  <div style={{ borderTop: '1px solid rgba(15,23,42,0.07)', paddingTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#64748b' }}>Select Units for Mid-Term:</p>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setSelectedUnitsForPaper((activeSyllabus.units || []).map(u => u.number))} style={{ ...S.btn('#10b981'), fontSize: 10, padding: '2px 8px' }}>All</button>
                        <button onClick={() => setSelectedUnitsForPaper([])} style={{ ...S.btn('#475569'), fontSize: 10, padding: '2px 8px' }}>None</button>
                      </div>
                    </div>
                    {(activeSyllabus.units || []).map(unit => (
                      <label key={unit.number} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: 12, color: '#64748b' }}>
                        <input type="checkbox" checked={selectedUnitsForPaper.includes(unit.number)} onChange={e => setSelectedUnitsForPaper(us => e.target.checked ? [...us, unit.number] : us.filter(n => n !== unit.number))} style={{ marginTop: 2 }} />
                        <span><b style={{ color: '#4f46e5' }}>Unit {unit.number}:</b> {unit.title}{unit.hours ? <span style={{ color: '#64748b' }}> ({unit.hours}h)</span> : ''}</span>
                      </label>
                    ))}
                    {!selectedUnitsForPaper.length && <p style={{ fontSize: 11, color: '#f87171', margin: '4px 0 0' }}>Select at least one unit</p>}
                  </div>
                )}
              </div>

              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showTemplateEditor ? 12 : 0 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ri-layout-2-line" style={{ color: '#8b5cf6' }} />Paper Template
                  </h3>
                  <button onClick={() => setShowTemplateEditor(s => !s)} style={{ ...S.btn('#8b5cf6'), fontSize: 11, padding: '4px 12px' }}>
                    {showTemplateEditor ? 'Collapse' : 'Configure'}
                  </button>
                </div>
                {showTemplateEditor && (
                  <div style={{ marginTop: 12 }}>
                    {[
                      ['Institution Name', 'institution', 'text', 'e.g. Your Sarthi Platform'],
                      ['Department', 'department', 'text', 'e.g. Computer Science & Engineering'],
                      ['Programme', 'program', 'text', 'e.g. B.Tech CSE'],
                      ['Semester', 'semester', 'text', 'e.g. IV Semester'],
                      ['Academic Year', 'academicYear', 'text', 'e.g. 2025-26'],
                      ['Exam Room (optional)', 'examRoom', 'text', 'e.g. Hall A'],
                    ].map(([label, key, type, placeholder]) => (
                      <div key={key} style={{ marginBottom: 8 }}>
                        <label style={{ ...lbl }}>{label}</label>
                        <input type={type} value={templateConfig[key] || ''} placeholder={placeholder}
                          onChange={e => setTemplateConfig(t => ({ ...t, [key]: e.target.value }))}
                          style={{ ...S.inp, padding: '6px 10px' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={S.card}>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Paper Details</h3>
                {[
                  ['Title', 'title', 'text', 'e.g. CSE301 End-Semester Exam'],
                  ['Subject / Course', 'subject', 'text', 'e.g. Data Structures & Algorithms'],
                  ['Duration (mins)', 'duration', 'number', '180'],
                  ['Exam Date', 'examDate', 'date', ''],
                ].map(([label, key, type, placeholder]) => (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <label style={lbl}>{label}</label>
                    <input type={type} value={paperConfig[key] || ''} placeholder={placeholder}
                      onChange={e => setPaperConfig(p => ({ ...p, [key]: e.target.value }))} style={S.inp} />
                  </div>
                ))}
                <label style={lbl}>Instructions</label>
                <textarea value={paperConfig.instructions || ''} rows={3}
                  onChange={e => setPaperConfig(p => ({ ...p, instructions: e.target.value }))}
                  placeholder="All questions carry equal marks. Attempt any 5 from Section B…"
                  style={{ ...S.inp, resize: 'vertical' }} />
              </div>

              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Sections</h3>
                  <button onClick={() => setPaperConfig(p => ({
                    ...p, sections: [...p.sections, { label: String.fromCharCode(65 + p.sections.length), type: 'short', difficulty: '', count: 5, marksPerQ: 5 }]
                  }))} style={{ ...S.btn('#10b981'), fontSize: 11, padding: '4px 10px' }}>+ Section</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '28px 80px 80px 50px 50px 50px 24px', gap: 4, marginBottom: 4 }}>
                  {['§', 'Type', 'Diff', 'Cnt', 'Mrks', 'Sub', ''].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                {paperConfig.sections.map((sec, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 80px 80px 50px 50px 50px 24px', gap: 4, marginBottom: 6, alignItems: 'center' }}>
                    <input value={sec.label} onChange={e => setPaperConfig(p => ({ ...p, sections: p.sections.map((s, j) => j === i ? { ...s, label: e.target.value } : s) }))}
                      style={{ ...S.inp, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }} />
                    <select value={sec.type} onChange={e => setPaperConfig(p => ({ ...p, sections: p.sections.map((s, j) => j === i ? { ...s, type: e.target.value } : s) }))}
                      style={{ ...S.inp, padding: '4px 6px' }}>
                      {['mcq', 'short', 'numerical', 'long', 'case-study'].map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select value={sec.difficulty || ''} onChange={e => setPaperConfig(p => ({ ...p, sections: p.sections.map((s, j) => j === i ? { ...s, difficulty: e.target.value } : s) }))}
                      style={{ ...S.inp, padding: '4px 6px' }}>
                      <option value="">Any</option>
                      {['easy', 'medium', 'hard'].map(d => <option key={d}>{d}</option>)}
                    </select>
                    <input type="number" min={1} value={sec.count} onChange={e => setPaperConfig(p => ({ ...p, sections: p.sections.map((s, j) => j === i ? { ...s, count: parseInt(e.target.value) || 1 } : s) }))}
                      style={{ ...S.inp, padding: '4px 6px', textAlign: 'center' }} />
                    <input type="number" min={1} value={sec.marksPerQ} onChange={e => setPaperConfig(p => ({ ...p, sections: p.sections.map((s, j) => j === i ? { ...s, marksPerQ: parseInt(e.target.value) || 1 } : s) }))}
                      style={{ ...S.inp, padding: '4px 6px', textAlign: 'center' }} />
                    <span style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>{sec.count * sec.marksPerQ}</span>
                    <button onClick={() => setPaperConfig(p => ({ ...p, sections: p.sections.filter((_, j) => j !== i) }))}
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, cursor: 'pointer', color: '#f87171', fontSize: 14 }}>×</button>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(15,23,42,0.07)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{paperConfig.sections.reduce((s, sec) => s + sec.count, 0)} questions</span>
                  <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: 14 }}>Total: {paperConfig.sections.reduce((s, sec) => s + sec.count * sec.marksPerQ, 0)} marks</span>
                </div>
              </div>

              {buildError && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{buildError}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => handleBuildPaper('exam')} disabled={building || (examType === 'midterm' && !selectedUnitsForPaper.length)}
                  className="btn btn-primary" style={{ width: '100%', padding: 11, gap: 6, opacity: (building || (examType === 'midterm' && !selectedUnitsForPaper.length)) ? .7 : 1 }}>
                  <i className={building ? 'ri-loader-4-line' : 'ri-file-paper-2-line'} />
                  {building ? 'Building Paper…' : `Build ${examType === 'midterm' ? 'Mid-Term' : 'End-Semester'} Paper`}
                </button>
                <button onClick={() => handleBuildPaper('answer-key')} disabled={building || (examType === 'midterm' && !selectedUnitsForPaper.length)}
                  className="btn btn-primary" style={{ width: '100%', padding: 11, gap: 6, background: 'linear-gradient(135deg,#10b981,#059669)', opacity: (building || (examType === 'midterm' && !selectedUnitsForPaper.length)) ? .7 : 1 }}>
                  <i className={building ? 'ri-loader-4-line' : 'ri-key-line'} />
                  {building ? 'Generating Answers…' : 'Question Paper with Answers'}
                </button>
              </div>
            </div>

            <div>
              {!buildResult ? (
                <div style={{ ...S.card, textAlign: 'center', padding: 60 }}>
                  <i className="ri-file-paper-2-line" style={{ fontSize: 48, color: '#374151', display: 'block', marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ marginTop: 0, fontWeight: 600, color: '#64748b', fontSize: 14 }}>Configure sections and build the paper.</p>
                  <p style={{ fontSize: 12, color: '#64748b' }}>The engine selects questions maximising CO/PO coverage and Bloom's diversity.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20, textAlign: 'left' }}>
                    {[
                      ['ri-target-line', '#10b981', 'CO Coverage', 'All course outcomes covered'],
                      ['ri-scales-line', '#3b82f6', "Bloom's Spread", 'Higher order thinking included'],
                      ['ri-shuffle-line', '#f59e0b', 'Smart Selection', 'No duplicate questions'],
                      ['ri-list-check-3', '#8b5cf6', 'MCQ Options', 'Full A/B/C/D options included'],
                    ].map(([icon, color, title, desc]) => (
                      <div key={title} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <i className={icon} style={{ color, fontSize: 20, flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 12, color: '#1e293b' }}>{title}</p>
                          <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{
                    background: 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 12,
                    padding: '18px 22px',
                    marginBottom: 14,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{
                          display: 'inline-block', marginBottom: 6, padding: '2px 10px', borderRadius: 12, fontSize: 10,
                          fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                          background: buildResult.examType === 'midterm' ? '#f59e0b' : '#10b981', color: '#fff',
                        }}>
                          {buildResult.examType === 'midterm' ? 'Mid-Term' : 'End-Semester'}
                        </span>
                        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Paper Created!</h3>
                        <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>ID: {buildResult.paperId}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 2px', fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{buildResult.totalMarks}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Total Marks</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <span style={B.white()}>{buildResult.questionsSelected} questions</span>
                      {buildResult.cosCovered?.map(co => <span key={co} style={B.green()}>{co} ✓</span>)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                      <button onClick={() => setShowPrintView(true)} className="btn btn-ghost" style={{ fontSize: 12, gap: 5, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                        <i className="ri-printer-line" />Print / Save PDF
                      </button>
                      <button onClick={() => { setShowNotifyModal(buildResult.paperId); setNotifyForm(f => ({ ...f, message: `Question paper "${buildResult.title}" has been finalized and is ready for your review.` })); }}
                        className="btn btn-ghost" style={{ fontSize: 12, gap: 5, background: '#f1f5f9', color: '#334155', border: '1px solid rgba(15,23,42,0.1)' }}>
                        <i className="ri-notification-line" />Notify Teacher
                      </button>
                      <button onClick={() => { handleFetchPapers(); setTab(4); }} className="btn btn-ghost" style={{ fontSize: 12, gap: 5, background: '#f1f5f9', color: '#334155', border: '1px solid rgba(15,23,42,0.1)' }}>
                        <i className="ri-archive-line" />View Repository
                      </button>
                    </div>
                  </div>

                  {buildResult.paperMode === 'answer-key' && (
                    <div style={{ ...S.card, marginBottom: 12, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderLeft: '3px solid #10b981' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ri-key-line" />Answer Key — model answers are shown below each question and included in the printed paper.
                      </p>
                    </div>
                  )}
                  {[...new Set((buildResult.questions || []).map(q => q.sectionLabel))].sort().map(sLabel => (
                    <div key={sLabel} style={{ ...S.card, marginBottom: 12 }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>Section {sLabel}</h4>
                      {(buildResult.questions || []).filter(q => q.sectionLabel === sLabel).map(q => (
                        <div key={q.questionNo} style={{ padding: '10px 0', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={B.gray()}>Q{q.questionNo}</span>
                                <span style={B.indigo()}>{q.type}</span>
                                <span style={{ ...S.badge(DIFF_COLORS[q.difficulty] + '22', DIFF_COLORS[q.difficulty]) }}>{q.difficulty}</span>
                                <span style={S.tag(q.blooms)}>{q.blooms}</span>
                                {q.co && <span style={B.green()}>{q.co}</span>}
                              </div>
                              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#1e293b' }}>{q.text}</p>
                              {q.type === 'mcq' && q.options && typeof q.options === 'object' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', marginTop: 5 }}>
                                  {Object.entries(q.options).map(([k, v]) => {
                                    const isCorrect = buildResult.paperMode === 'answer-key' && k === q.correct;
                                    return (
                                      <p key={k} style={{ margin: 0, fontSize: 11, fontWeight: isCorrect ? 700 : 400, color: isCorrect ? '#065f46' : '#64748b', background: isCorrect ? 'rgba(16,185,129,0.12)' : 'transparent', borderRadius: 3, padding: isCorrect ? '1px 5px' : '1px 0' }}>
                                        <strong style={{ color: isCorrect ? '#059669' : '#4f46e5' }}>{k}.</strong> {v}{isCorrect ? ' ✓' : ''}
                                      </p>
                                    );
                                  })}
                                </div>
                              )}
                              {buildResult.paperMode === 'answer-key' && q.answer && (
                                <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.09)', border: '1px solid rgba(16,185,129,0.25)', borderLeft: '3px solid #10b981', borderRadius: 6 }}>
                                  <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Model Answer</p>
                                  <p style={{ margin: 0, fontSize: 12, color: '#0f172a', lineHeight: 1.7 }}>{q.answer}</p>
                                </div>
                              )}
                            </div>
                            <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: 13, flexShrink: 0 }}>{q.marks}m</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>No syllabus loaded. Upload and parse a syllabus first.</p>
            <button onClick={() => setTab(0)} className="btn btn-primary" style={{ gap: 6 }}><i className="ri-upload-2-line" />Go to Upload</button>
          </div>
        )
      )}

      {/* ── TAB 4: Paper Repository ────────────────────────────────────────────── */}
      {tab === 4 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                <i className="ri-archive-line" style={{ color: '#6366f1', marginRight: 8 }} />Question Paper Repository
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {notifications.filter(n => !n.read).length > 0 && (
                <span style={{ ...B.amber(), padding: '4px 10px' }}>
                  <i className="ri-notification-3-line" style={{ marginRight: 4 }} />{notifications.filter(n => !n.read).length} unread
                </span>
              )}
              <button onClick={handleFetchPapers} disabled={loadingPapers} className="btn btn-primary" style={{ fontSize: 13, gap: 5, opacity: loadingPapers ? .7 : 1 }}>
                <i className={loadingPapers ? 'ri-loader-4-line' : 'ri-refresh-line'} />
                {loadingPapers ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>

          {notifications.length > 0 && (
            <div style={{ ...S.card, marginBottom: 16, background: 'rgba(245,158,11,0.05)', borderLeft: '3px solid rgba(245,158,11,0.4)' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ri-notification-3-line" />Notifications — Controller of Examination
              </h3>
              {notifications.slice(0, 8).map(n => (
                <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid rgba(245,158,11,0.1)', opacity: n.read ? 0.5 : 1 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: n.read ? 400 : 600, color: '#1e293b' }}>{n.message}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                      {n.teacherName ? `To: ${n.teacherName}` : ''}{n.teacherEmail ? ` (${n.teacherEmail})` : ''}{' · '}{new Date(n.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  {!n.read && <span style={B.green()}>NEW</span>}
                </div>
              ))}
            </div>
          )}

          {papers.length === 0 ? (
            <div style={{ ...S.card, textAlign: 'center', padding: 60 }}>
              <i className="ri-archive-line" style={{ fontSize: 48, color: '#374151', display: 'block', marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontWeight: 600, color: '#64748b', fontSize: 14, marginBottom: 6 }}>No papers loaded yet.</p>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Build exam papers in the "Build Paper" tab, then refresh here.</p>
              <button onClick={handleFetchPapers} disabled={loadingPapers} className="btn btn-primary" style={{ gap: 6 }}>
                <i className={loadingPapers ? 'ri-loader-4-line' : 'ri-refresh-line'} />{loadingPapers ? 'Loading…' : 'Load Papers'}
              </button>
            </div>
          ) : (
            (() => {
              const grouped = {};
              papers.forEach(p => {
                const key = p.program || p.department || 'Uncategorised';
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(p);
              });
              return Object.entries(grouped).map(([grp, grpPapers]) => (
                <div key={grp} style={{ marginBottom: 24 }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 8, borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ri-graduation-cap-line" style={{ color: '#6366f1' }} />{grp}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                    {grpPapers.map(paper => (
                      <div key={paper.id || paper.paperId} style={{ ...S.card, marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                              <span style={{
                                ...S.badge(paper.examType === 'midterm' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', paper.examType === 'midterm' ? '#fcd34d' : '#6ee7b7'),
                                fontSize: 10, textTransform: 'uppercase',
                              }}>
                                {paper.examType === 'midterm' ? 'Mid-Term' : 'End-Sem'}
                              </span>
                              {paper.notified && <span style={{ ...B.indigo(), fontSize: 10 }}>Notified</span>}
                            </div>
                            <h4 style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{paper.title}</h4>
                            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{paper.subject || paper.courseName || paper.courseCode || '—'}</p>
                          </div>
                          <span style={{ fontWeight: 800, fontSize: 17, color: '#4f46e5', flexShrink: 0 }}>
                            {paper.total_marks || paper.totalMarks || '—'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                          {paper.semester && <span style={B.gray()}>{paper.semester}</span>}
                          {paper.courseCode && <span style={B.blue()}>{paper.courseCode}</span>}
                          {(paper.exam_date || paper.examDate) && (
                            <span style={B.gray()}>{new Date(paper.exam_date || paper.examDate).toLocaleDateString('en-IN')}</span>
                          )}
                          {(paper.question_count || paper.questionsSelected) && (
                            <span style={B.gray()}>{paper.question_count || paper.questionsSelected} Qs</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => {
                            const pid = paper.id || paper.paperId;
                            if (buildResult && buildResult.paperId === pid) setShowPrintView(true);
                            else alert(`Paper ID: ${pid}\nTo print, rebuild in "Build Paper" tab.`);
                          }} style={{ ...S.btn(), fontSize: 11, padding: '6px 10px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <i className="ri-printer-line" />Print
                          </button>
                          <button onClick={() => {
                            const pid = paper.id || paper.paperId;
                            setShowNotifyModal(pid);
                            setNotifyForm(f => ({ ...f, message: `Question paper "${paper.title}" has been finalized and is ready for your review.` }));
                          }} style={{ ...S.btn(paper.notified ? '#475569' : '#10b981'), fontSize: 11, padding: '6px 10px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <i className="ri-notification-line" />{paper.notified ? 'Re-notify' : 'Notify'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
      )}

      {showPrintView && buildResult && (
        <PaperPrintView paper={buildResult} showAnswers={buildResult.paperMode === 'answer-key'} onClose={() => setShowPrintView(false)} />
      )}

      {showNotifyModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ri-notification-line" style={{ color: '#10b981' }} />Notify Subject Teacher
              </h3>
              <button onClick={() => { setShowNotifyModal(null); setNotifyForm({ teacherName: '', teacherEmail: '', message: '' }); }}
                style={{ background: '#f1f5f9', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, padding: '4px 8px', color: '#475569', cursor: 'pointer', fontSize: 16 }}>
                <i className="ri-close-line" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Teacher Name', 'teacherName', 'text', 'e.g. Dr. Amit Kumar'], ['Teacher Email', 'teacherEmail', 'email', 'e.g. amit.k@itmuniversity.ac.in']].map(([label, key, type, placeholder]) => (
                <div key={key}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input type={type} value={notifyForm[key] || ''} placeholder={placeholder} onChange={e => setNotifyForm(f => ({ ...f, [key]: e.target.value }))} className="form-input" />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Message</label>
                <textarea value={notifyForm.message || ''} rows={3} onChange={e => setNotifyForm(f => ({ ...f, message: e.target.value }))} className="form-input" style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(15,23,42,0.08)' }}>
              <button onClick={() => { setShowNotifyModal(null); setNotifyForm({ teacherName: '', teacherEmail: '', message: '' }); }} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
              <button onClick={() => handleNotify(showNotifyModal)} disabled={notifying} className="btn btn-primary" style={{ fontSize: 13, gap: 6, background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <i className="ri-send-plane-line" />{notifying ? 'Saving…' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
