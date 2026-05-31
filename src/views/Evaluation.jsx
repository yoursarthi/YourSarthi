import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { processFiles } from '../utils/fileHelpers';
import { uid, GC } from '../utils/helpers';
import { computeGrade, safeParseJSON, qMax, buildQBlock, callGeminiPerQuestion } from '../utils/gemini';
import Btn from '../components/ui/Btn';
import Spin from '../components/ui/Spin';
import { TABS, S } from './evaluation/styles';
import PerQuestionResult from './evaluation/PerQuestionResult';
import TabulationView from './evaluation/TabulationView';
import MarksheetsView from './evaluation/MarksheetsView';
import EvalHistory from './evaluation/EvalHistory';
import BulkEval from './evaluation/BulkEval';
import { useLocalStorage } from '../hooks/useLocalStorage';

const GEMINI_MODEL = 'gemini-2.5-flash';

export default function Evaluation({ user }) {
  const toast = useToast();

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('gemini_api_key'));
  useEffect(() => { if (apiKey) localStorage.setItem('gemini_api_key', apiKey); }, [apiKey]);

  // ── Persisted form state — survives tab switches and page navigation ──────────
  const [view, setView] = useLocalStorage('itm_eval_view', 'evaluate');
  const [paperId, setPaperId, clearPaperId] = useLocalStorage('itm_eval_paper_id', null);
  const [paperTitle, setPaperTitle] = useLocalStorage('itm_eval_paper_title', '');
  const [paperSubject, setPaperSubject] = useLocalStorage('itm_eval_paper_subject', '');
  const [paperProgram, setPaperProgram] = useLocalStorage('itm_eval_paper_program', '');
  const [paperSemester, setPaperSemester] = useLocalStorage('itm_eval_paper_semester', '');
  const [questions, setQuestions] = useLocalStorage('itm_eval_questions', () => [
    { id: uid(), questionNo: 1, text: '', maxMarks: 10, rubric: '', subSections: [] },
    { id: uid(), questionNo: 2, text: '', maxMarks: 10, rubric: '', subSections: [] },
  ]);

  const [modelAnswerImages, setModelAnswerImages] = useState([]);
  const maFileRef = useRef();
  const [extracting, setExtracting] = useState(false);

  const [sName, setSName] = useState('');
  const [sRoll, setSRoll] = useState('');
  const [sEnroll, setSEnroll] = useState('');
  const [imgs, setImgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [roster, setRoster] = useState([]);

  const [pgReady, setPgReady] = useState(false);
  const [papers, setPapers] = useState([]);
  const [tabPaperId, setTabPaperId] = useState('');
  const [tabData, setTabData] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);

  const [msPaperId, setMsPaperId] = useState('');
  const [msResults, setMsResults] = useState([]);
  const [msView, setMsView] = useState(null);
  const [msLoading, setMsLoading] = useState(false);

  const [history, setHistory] = useState([]);

  const fileRef = useRef();

  useEffect(() => {
    api.exams.status().then(r => setPgReady(r.pgConnected)).catch(() => {});
  }, []);

  useEffect(() => {
    if (view === 'history') api.evaluations.results().then(setHistory).catch(() => {});
    if (view === 'tabulation' || view === 'marksheets') {
      api.exams.papers().then(setPapers).catch(() => {});
    }
  }, [view]);

  const handleFiles = useCallback(async (files) => {
    const out = await processFiles(Array.from(files));
    if (out.length) setImgs(p => [...p, ...out]);
  }, []);

  const handleMAFiles = useCallback(async (files) => {
    const out = await processFiles(Array.from(files));
    if (out.length) setModelAnswerImages(p => [...p, ...out]);
  }, []);

  const extractFromModelAnswer = async () => {
    if (!modelAnswerImages.length || !apiKey) return;
    setExtracting(true);
    try {
      const parts = [];
      modelAnswerImages.forEach(im => parts.push({ inline_data: { mime_type: im.mime, data: im.b64 } }));
      parts.push({ text: `You are analyzing a question paper or model answer sheet.

Extract EVERY question visible in this document. For each question produce:
1. questionNo — the integer question number
2. text — the full question text exactly as written (the stem / instruction)
3. maxMarks — integer max marks if printed on the paper, otherwise make a reasonable estimate
4. subSections — array of sub-parts (a), (b), (c)… if the question has them; empty array otherwise
   For each sub-section: label (single lowercase letter), text (exact text of that part), maxMarks (integer), rubric (see below)
5. rubric — a detailed, mark-specific rubric derived from the model answer content:
   - Spell out exactly what earns each mark or band of marks
   - Reference key terms, steps, or concepts visible in the model answer
   - Keep it concise but precise enough to grade fairly
   - If the question HAS sub-sections put rubric on each sub-section and leave the top-level rubric as an empty string
   - If the question has NO sub-sections put the rubric on the question itself

Return ONLY raw JSON — no markdown, no code fences:
{"questions":[{"questionNo":1,"text":"...","maxMarks":10,"rubric":"","subSections":[{"label":"a","text":"...","maxMarks":5,"rubric":"Award 2 marks for… Award 3 marks for…"}]}]}` });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1, maxOutputTokens: 16384 } }) }
      );
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      if (!d.candidates?.length) throw new Error('No response from Gemini');
      const raw = d.candidates[0].content.parts.map(p => p.text || '').join('');
      const extracted = safeParseJSON(raw);
      if (!extracted.questions?.length) throw new Error('No questions detected in the document');

      const newQuestions = extracted.questions.map(q => ({
        id: uid(),
        questionNo: parseInt(q.questionNo) || 1,
        text: q.text || '',
        maxMarks: parseInt(q.maxMarks) || 10,
        rubric: q.rubric || '',
        subSections: (q.subSections || []).map((ss, si) => ({
          id: uid(),
          label: ss.label || String.fromCharCode(97 + si),
          text: ss.text || '',
          maxMarks: parseInt(ss.maxMarks) || 5,
          rubric: ss.rubric || '',
        })),
      }));

      setQuestions(newQuestions);
      toast(`Extracted ${newQuestions.length} question(s) with rubrics!`, 'success');
    } catch (e) {
      toast(`Extraction failed: ${e.message}`, 'error');
    }
    setExtracting(false);
  };

  const addQuestion = () => {
    const nextNo = questions.length > 0 ? Math.max(...questions.map(q => q.questionNo)) + 1 : 1;
    setQuestions(p => [...p, { id: uid(), questionNo: nextNo, text: '', maxMarks: 10, rubric: '', subSections: [] }]);
  };

  const removeQuestion = (id) => setQuestions(p => p.filter(q => q.id !== id));
  const updateQuestion = (id, field, val) => setQuestions(p => p.map(q => q.id === id ? { ...q, [field]: val } : q));

  const addSubSection = (qId) => setQuestions(p => p.map(q => q.id !== qId ? q : {
    ...q, subSections: [...(q.subSections || []), { id: uid(), label: String.fromCharCode(97 + (q.subSections || []).length), text: '', maxMarks: 5, rubric: '' }],
  }));
  const removeSubSection = (qId, ssId) => setQuestions(p => p.map(q => q.id !== qId ? q : {
    ...q, subSections: (q.subSections || []).filter(ss => ss.id !== ssId),
  }));
  const updateSubSection = (qId, ssId, field, val) => setQuestions(p => p.map(q => q.id !== qId ? q : {
    ...q, subSections: (q.subSections || []).map(ss => ss.id !== ssId ? ss : { ...ss, [field]: val }),
  }));

  const totalMaxMarks = questions.reduce((s, q) => s + qMax(q), 0);
  const validQuestions = questions.filter(q =>
    q.text.trim() || (q.subSections || []).some(ss => ss.text.trim())
  );

  const ensurePaper = async () => {
    if (paperId) return paperId;
    try {
      const r = await api.exams.createPaper({
        title: paperTitle || `${paperSubject || 'Exam'} — ${new Date().toLocaleDateString('en-IN')}`,
        subject: paperSubject,
        program: paperProgram,
        semester: paperSemester,
        questions: validQuestions.map((q, i) => ({
          questionNo: q.questionNo || i + 1,
          text: q.text,
          maxMarks: qMax(q),
          rubric: q.rubric || '',
          subSections: (q.subSections || []).map(ss => ({ label: ss.label, text: ss.text, maxMarks: parseInt(ss.maxMarks) || 0, rubric: ss.rubric || '' })),
        })),
      });
      setPaperId(r.paperId);
      return r.paperId;
    } catch (e) {
      console.warn('Paper creation failed:', e.message);
      return null;
    }
  };

  const runEval = async () => {
    if (!imgs.length || !validQuestions.length) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await callGeminiPerQuestion({
        images: imgs, questions: validQuestions, modelAnswerImages,
        subject: paperSubject, program: paperProgram, semester: paperSemester,
        studentName: sName, apiKey,
      });
      setResult(res);

      const pid = await ensurePaper();

      if (pid) {
        try {
          await api.exams.saveResult({
            paperId: pid,
            studentName: sName, rollNo: sRoll, enrollmentNo: sEnroll,
            totalMarksObtained: res.totalMarksAwarded,
            maxMarks: res.totalMaxMarks,
            percentage: res.percentage, grade: res.grade,
            transcription: res.transcription || '', detailedFeedback: res.detailedFeedback || '',
            strengths: res.strengths || [], improvements: res.improvements || [],
            questionResponses: (res.questions || []).map(q => ({
              questionNo: q.questionNo,
              questionText: validQuestions.find(dq => dq.questionNo === q.questionNo)?.text || '',
              marksAwarded: q.marksAwarded, maxMarks: q.maxMarks, feedback: q.feedback || '',
              subSectionResponses: (q.subSections || []).map(ss => ({
                label: ss.label, marksAwarded: ss.marksAwarded, maxMarks: ss.maxMarks, feedback: ss.feedback || '',
              })),
            })),
          });
        } catch (e) { console.warn('PG save failed:', e.message); }
      }

      await api.evaluations.saveResult({ studentName: sName, rollNo: sRoll, result: { ...res, marksAwarded: res.totalMarksAwarded, maxMarks: res.totalMaxMarks } }).catch(() => {});

      setRoster(p => [...p, { id: uid(), name: sName, rollNo: sRoll, enrollmentNo: sEnroll, result: res }]);
      toast(`Evaluated ${sName || 'student'} — ${res.grade} (${res.percentage}%)`, 'success');
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const resetPaper = () => {
    clearPaperId();
    setRoster([]);
    setResult(null);
    toast('Paper reset — next evaluation will create a new exam paper.', 'info');
  };

  const exportRosterCSV = () => {
    const ev = roster.filter(s => s.result);
    if (!ev.length) { toast('No results yet.', 'warning'); return; }
    const qNos = validQuestions.map(q => q.questionNo);
    const headers = ['S.No', 'Student Name', 'Roll No', 'Enrollment No', ...qNos.map(n => { const qd = validQuestions.find(q => q.questionNo === n); return `Q${n}(/${qd ? qMax(qd) : '?'})`; }), `Total(/${totalMaxMarks})`, 'Percentage', 'Grade'];
    const rows = [headers];
    ev.forEach((s, i) => {
      const qMarks = qNos.map(n => {
        const q = (s.result.questions || []).find(r => r.questionNo === n);
        return q ? q.marksAwarded : '-';
      });
      rows.push([i + 1, s.name, s.rollNo, s.enrollmentNo || '', ...qMarks, s.result.totalMarksAwarded, s.result.percentage + '%', s.result.grade]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `results_${Date.now()}.csv`;
    a.click();
  };

  const loadTabulation = async (pid) => {
    setTabLoading(true); setTabData(null);
    try { setTabData(await api.exams.tabulation(pid)); } catch (e) { toast(e.message, 'error'); }
    setTabLoading(false);
  };

  const loadMarksheets = async (pid) => {
    try { setMsResults(await api.exams.paperResults(pid)); } catch (e) { toast(e.message, 'error'); }
  };

  const generateMarksheet = async (resultId) => {
    setMsLoading(true);
    try {
      await api.exams.generateMarksheet(resultId);
      const ms = await api.exams.marksheet(resultId);
      setMsView(ms);
    } catch (e) { toast(e.message, 'error'); }
    setMsLoading(false);
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#0f172a' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ri-brain-line" style={{ color: '#6366f1' }} />AI Evaluation
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Per-question AI grading with rubric-based evaluation</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {pgReady && (
            <span style={{ background: 'rgba(16,185,129,0.1)', color: '#047857', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ri-database-2-line" />PostgreSQL
            </span>
          )}
          {showKeyInput ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '6px 12px' }}>
              <i className="ri-key-2-line" style={{ color: '#d97706', fontSize: 14 }} />
              <input style={{ ...S.inp, width: 220, marginBottom: 0, padding: '5px 10px' }} type="password" placeholder="AIzaSy…" value={apiKey} onChange={e => setApiKey(e.target.value)} />
              <Btn variant="primary" sm onClick={() => setShowKeyInput(false)} disabled={!apiKey}>Save</Btn>
            </div>
          ) : (
            <button onClick={() => setShowKeyInput(true)} style={{ fontSize: 12, color: '#64748b', background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ri-key-2-line" />API Key
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar" style={{ marginBottom: 18 }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn${view === t.id ? ' active' : ''}`} onClick={() => setView(t.id)}>
            <i className={t.icon} style={{ marginRight: 5 }} />{t.label}
          </button>
        ))}
      </div>

      {view === 'evaluate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14 }}>
          {/* Left Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}><i className="ri-file-list-3-line" style={{ fontSize: 13, color: '#6366f1' }} />Exam Paper Setup</div>
                {paperId && (
                  <button onClick={resetPaper} style={{ fontSize: 10, color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}>New Paper</button>
                )}
              </div>
              {paperId && <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 7, padding: '6px 10px', fontSize: 11, color: '#047857', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><i className="ri-checkbox-circle-line" />Paper saved — {roster.length} student(s) this session</div>}
              {!paperId && validQuestions.length > 0 && <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 7, padding: '6px 10px', fontSize: 11, color: '#b45309', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><i className="ri-draft-line" />Draft — will be saved on first evaluation</div>}
              <label style={S.lbl}>Exam Title</label>
              <input style={S.inp} value={paperTitle} onChange={e => setPaperTitle(e.target.value)} placeholder="e.g. Mid-Term Exam 2024-25" disabled={!!paperId} />
              <label style={S.lbl}>Subject</label>
              <input style={S.inp} value={paperSubject} onChange={e => setPaperSubject(e.target.value)} placeholder="e.g. Data Structures" disabled={!!paperId} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                  <label style={S.lbl}>Program</label>
                  <input style={S.inp} value={paperProgram} onChange={e => setPaperProgram(e.target.value)} placeholder="B.Tech CSE" disabled={!!paperId} />
                </div>
                <div>
                  <label style={S.lbl}>Semester</label>
                  <input style={S.inp} value={paperSemester} onChange={e => setPaperSemester(e.target.value)} placeholder="4th" disabled={!!paperId} />
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}><i className="ri-question-line" style={{ fontSize: 13, color: '#6366f1' }} />Questions & Max Marks</div>
                <button onClick={addQuestion} style={{ fontSize: 11, color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer' }} disabled={!!paperId}><i className="ri-add-line" /> Add</button>
              </div>
              {questions.map((q, i) => {
                const hasSS = (q.subSections || []).length > 0;
                return (
                  <div key={q.id} style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, padding: '8px 10px', marginBottom: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', minWidth: 22 }}>Q{q.questionNo}</span>
                      {!hasSS && (
                        <input
                          style={{ ...S.inp, marginBottom: 0, flex: 1, fontSize: 12, padding: '5px 9px' }}
                          placeholder={`Question ${i + 1} text…`}
                          value={q.text}
                          onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                          disabled={!!paperId}
                        />
                      )}
                      {!paperId && questions.length > 1 && (
                        <button onClick={() => removeQuestion(q.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                    {!hasSS && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>Max marks:</span>
                        <input
                          type="number" min="1" max="100"
                          style={{ ...S.inp, width: 56, marginBottom: 0, fontSize: 12, padding: '4px 7px' }}
                          value={q.maxMarks}
                          onChange={e => updateQuestion(q.id, 'maxMarks', parseInt(e.target.value) || 1)}
                          disabled={!!paperId}
                        />
                      </div>
                    )}
                    {hasSS && (
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>
                        Total: <strong>{qMax(q)}</strong> marks (from sub-sections)
                      </div>
                    )}
                    {!hasSS && !paperId && (
                      <button
                        onClick={() => updateQuestion(q.id, '_showRubric', !q._showRubric)}
                        style={{ fontSize: 10, color: q.rubric ? '#7c3aed' : '#9ca3af', background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', marginBottom: 4 }}
                      >
                        📝 {q._showRubric ? 'Hide' : (q.rubric ? '✓ Edit' : 'Add')} Rubric
                      </button>
                    )}
                    {q._showRubric && !hasSS && !paperId && (
                      <textarea
                        style={{ ...S.ta, fontSize: 11, minHeight: 48, marginBottom: 4 }}
                        placeholder="Rubric / marking criteria for this question…"
                        value={q.rubric || ''}
                        onChange={e => updateQuestion(q.id, 'rubric', e.target.value)}
                      />
                    )}
                    {(q.subSections || []).map((ss) => (
                      <div key={ss.id} style={{ background: '#ffffff', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 7, padding: '6px 8px', marginTop: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', minWidth: 32 }}>({ss.label})</span>
                          <input
                            style={{ ...S.inp, marginBottom: 0, flex: 1, fontSize: 11 }}
                            placeholder={`Sub-section (${ss.label}) description…`}
                            value={ss.text}
                            onChange={e => updateSubSection(q.id, ss.id, 'text', e.target.value)}
                            disabled={!!paperId}
                          />
                          <input
                            type="number" min="1" max="50"
                            style={{ ...S.inp, width: 44, marginBottom: 0, fontSize: 11, padding: '3px 5px' }}
                            value={ss.maxMarks}
                            onChange={e => updateSubSection(q.id, ss.id, 'maxMarks', parseInt(e.target.value) || 1)}
                            disabled={!!paperId}
                          />
                          <span style={{ fontSize: 9, color: '#9ca3af' }}>m</span>
                          {!paperId && <button onClick={() => removeSubSection(q.id, ss.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>✕</button>}
                        </div>
                        {!paperId && (
                          <button
                            onClick={() => updateSubSection(q.id, ss.id, '_showRubric', !ss._showRubric)}
                            style={{ fontSize: 9, color: ss.rubric ? '#7c3aed' : '#9ca3af', background: 'none', border: '1px solid #e5e7eb', borderRadius: 3, padding: '1px 6px', cursor: 'pointer', marginBottom: 3 }}
                          >
                            📝 {ss._showRubric ? 'Hide' : (ss.rubric ? '✓ Edit' : 'Add')} Rubric
                          </button>
                        )}
                        {ss._showRubric && !paperId && (
                          <textarea
                            style={{ ...S.ta, fontSize: 10, minHeight: 36 }}
                            placeholder={`Rubric for (${ss.label})…`}
                            value={ss.rubric || ''}
                            onChange={e => updateSubSection(q.id, ss.id, 'rubric', e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                    {!paperId && (
                      <button
                        onClick={() => addSubSection(q.id)}
                        style={{ fontSize: 10, color: '#6366f1', background: 'none', border: '1px dashed rgba(99,102,241,0.4)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer', marginTop: 5, width: '100%' }}
                      >
                        + Add Sub-section
                      </button>
                    )}
                  </div>
                );
              })}
              <div style={{ fontSize: 11, color: '#374151', fontWeight: 600, textAlign: 'right', marginTop: 4 }}>
                Total: {totalMaxMarks} marks · {validQuestions.length}/{questions.length} with text
              </div>
            </div>

            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}><i className="ri-file-paper-2-line" style={{ fontSize: 13, color: '#6366f1' }} />Model Answer (Optional)</div>
              <div onClick={() => maFileRef.current.click()} style={{ border: `2px dashed ${modelAnswerImages.length ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.25)'}`, borderRadius: 8, padding: '12px', textAlign: 'center', cursor: 'pointer', background: modelAnswerImages.length ? 'rgba(16,185,129,0.06)' : 'rgba(99,102,241,0.04)', transition: 'all .2s' }}>
                <i className={modelAnswerImages.length ? 'ri-checkbox-circle-line' : 'ri-file-upload-line'} style={{ fontSize: 22, color: modelAnswerImages.length ? '#059669' : '#6366f1', display: 'block', marginBottom: 4 }} />
                <div style={{ fontSize: 11, color: modelAnswerImages.length ? '#059669' : '#64748b', fontWeight: 600 }}>{modelAnswerImages.length ? `${modelAnswerImages.length} page(s) uploaded` : 'Drop model answer sheet here'}</div>
                <input ref={maFileRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} onChange={e => { handleMAFiles(e.target.files); e.target.value = ''; }} />
              </div>
              {modelAnswerImages.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                    {modelAnswerImages.map((im, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        {im.preview
                          ? <img src={im.preview} alt="" style={{ width: 44, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }} />
                          : <div style={{ width: 44, height: 32, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#9ca3af' }}>PDF</div>}
                        <button onClick={() => setModelAnswerImages(p => p.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                    ))}
                  </div>
                  {!paperId && (
                    <button
                      onClick={extractFromModelAnswer}
                      disabled={extracting || !apiKey}
                      style={{ marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: extracting ? '#9ca3af' : '#7c3aed', background: extracting ? '#f9fafb' : '#f5f3ff', border: `1px solid ${extracting ? '#e5e7eb' : '#ddd6fe'}`, borderRadius: 6, padding: '6px 10px', cursor: extracting ? 'default' : 'pointer' }}
                    >
                      {extracting ? <><Spin color="#7c3aed" />&nbsp;Extracting questions & rubrics…</> : '✨ Extract Questions & Rubrics from this sheet'}
                    </button>
                  )}
                  {!paperId && (
                    <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
                      Fills in question text, sub-sections & rubrics automatically — overwrites current questions
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}><i className="ri-user-line" style={{ fontSize: 13, color: '#6366f1' }} />Student Info</div>
              <label style={S.lbl}>Full Name</label>
              <input style={S.inp} value={sName} onChange={e => setSName(e.target.value)} placeholder="Student full name" />
              <label style={S.lbl}>Exam Roll Number</label>
              <input style={S.inp} value={sRoll} onChange={e => setSRoll(e.target.value)} placeholder="e.g. 24CSE042" />
              <label style={S.lbl}>Enrollment / ID</label>
              <input style={{ ...S.inp, marginBottom: 0 }} value={sEnroll} onChange={e => setSEnroll(e.target.value)} placeholder="e.g. STU2024001" />
            </div>
          </div>

          {/* Right Panel */}
          <div>
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}><i className="ri-image-line" style={{ fontSize: 13, color: '#6366f1' }} />Student Answer Sheet</div>
              <div onClick={() => fileRef.current.click()} style={{ border: '2px dashed rgba(99,102,241,0.25)', borderRadius: 10, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 8, background: 'rgba(99,102,241,0.04)', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
              >
                <i className="ri-upload-cloud-2-line" style={{ fontSize: 32, color: '#6366f1', display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Click to browse or drag & drop</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>JPG · PNG · WEBP · PDF · Multiple pages</div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
              </div>
              {imgs.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 7, marginBottom: 10 }}>
                  {imgs.map((im, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      {im.preview
                        ? <img src={im.preview} alt="" style={{ width: '100%', height: 65, objectFit: 'cover', borderRadius: 7, border: '1px solid #e5e7eb' }} />
                        : <div style={{ width: '100%', height: 65, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9ca3af' }}><span style={{ fontSize: 18 }}>📄</span>PDF</div>}
                      <button onClick={() => setImgs(p => p.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      <div style={{ textAlign: 'center', fontSize: 9, color: '#9ca3af', marginTop: 2 }}>Pg {i + 1}</div>
                    </div>
                  ))}
                </div>
              )}
              <Btn variant="primary" full disabled={!imgs.length || !validQuestions.length || loading} onClick={runEval}>
                {loading ? <><Spin color="#fff" />&nbsp;Evaluating per question…</> : <><i className="ri-ai-generate" style={{ marginRight: 5 }} />Evaluate ({validQuestions.length} questions / {totalMaxMarks} marks)</>}
              </Btn>
              <div style={{ fontSize: 11, textAlign: 'center', marginTop: 5, color: imgs.length && validQuestions.length ? '#16a34a' : '#9ca3af' }}>
                {!validQuestions.length ? 'Add at least one question on the left' : !imgs.length ? 'Upload an answer sheet above' : '✓ Ready to evaluate'}
              </div>
              {error && <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#b91c1c', marginTop: 8, display: 'flex', alignItems: 'center', gap: 7 }}><i className="ri-error-warning-line" />{error}</div>}
            </div>

            {result && (
              <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}><i className="ri-bar-chart-2-line" style={{ fontSize: 13, color: '#6366f1' }} />Result — {sName || 'Student'}</div>
                <PerQuestionResult result={result} questions={validQuestions} />
              </div>
            )}

            {roster.length > 0 && (
              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Session Results ({roster.length} students)</div>
                  <Btn variant="green" sm onClick={exportRosterCSV}>⬇ Export CSV</Btn>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid rgba(15,23,42,0.08)' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>#</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Student</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Roll No</th>
                      {validQuestions.map(q => (
                        <th key={q.id} style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Q{q.questionNo}<br /><span style={{ fontSize: 9, fontWeight: 400 }}>/{qMax(q)}</span></th>
                      ))}
                      <th style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Total<br /><span style={{ fontSize: 9, fontWeight: 400 }}>/{totalMaxMarks}</span></th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                        <td style={{ padding: '6px 8px', color: '#9ca3af' }}>{i + 1}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 500 }}>{s.name || '—'}</td>
                        <td style={{ padding: '6px 8px', color: '#6b7280' }}>{s.rollNo || '—'}</td>
                        {validQuestions.map(q => {
                          const qr = (s.result.questions || []).find(r => r.questionNo === q.questionNo);
                          return (
                            <td key={q.id} style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, color: qr ? GC(computeGrade(Math.round((qr.marksAwarded / q.maxMarks) * 100))) : '#9ca3af' }}>
                              {qr ? qr.marksAwarded : '—'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{s.result.totalMarksAwarded}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <span style={{ background: GC(s.result.grade) + '20', color: GC(s.result.grade), border: `1px solid ${GC(s.result.grade)}40`, borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{s.result.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'bulk' && (
        <BulkEval
          questions={validQuestions} subject={paperSubject} maxMarks={totalMaxMarks}
          modelAnswerImages={modelAnswerImages} apiKey={apiKey}
          paperId={paperId} pgReady={pgReady}
          onPaperCreated={setPaperId}
          paperMeta={{ title: paperTitle, subject: paperSubject, program: paperProgram, semester: paperSemester, questions: validQuestions }}
          toast={toast}
          onViewTabulation={() => {
            api.exams.papers().then(setPapers).catch(() => {});
            if (paperId) { setTabPaperId(paperId); loadTabulation(paperId); }
            setView('tabulation');
          }}
        />
      )}

      {view === 'tabulation' && (
        <TabulationView
          pgReady={pgReady} papers={papers} tabPaperId={tabPaperId}
          setTabPaperId={setTabPaperId} tabData={tabData} tabLoading={tabLoading}
          onLoad={loadTabulation}
        />
      )}

      {view === 'marksheets' && (
        <MarksheetsView
          pgReady={pgReady} papers={papers} msPaperId={msPaperId}
          setMsPaperId={setMsPaperId} msResults={msResults} msLoading={msLoading}
          msView={msView} setMsView={setMsView}
          onLoadResults={loadMarksheets}
          onGenerate={generateMarksheet}
        />
      )}

      {view === 'history' && <EvalHistory history={history} />}
    </div>
  );
}
