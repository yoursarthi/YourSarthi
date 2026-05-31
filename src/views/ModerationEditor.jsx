import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

const SECTION_TYPES = ['mcq', 'short', 'long', 'case_study', 'numerical'];
const BLOOMS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

function printModeratedPaper(paper, assignment) {
  const subject = paper.subject || 'Subject';
  const title   = paper.title   || 'Examination Paper';
  const questions = paper.questions || [];

  const sections = {};
  questions.forEach(q => {
    const sec = q.section_label || q.sectionLabel || 'A';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(q);
  });

  const sectionHTML = Object.entries(sections).map(([sec, qs]) => `
    <div class="section">
      <h3>SECTION ${sec}</h3>
      ${qs.map((q, i) => `
        <div class="question">
          <span class="qnum">${i + 1}.</span>
          <span class="qtext">${q.question_text || q.text || ''}</span>
          <span class="marks">[${q.marks || q.max_marks || '?'} M]</span>
          ${(q.type === 'mcq' && q.options) ? `
            <div class="options">
              ${Object.entries(q.options).map(([k, v]) => `<span class="opt">(${k}) ${v}</span>`).join('')}
            </div>` : ''}
        </div>
      `).join('')}
    </div>
  `).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>${subject} — Moderated</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width:800px; margin:0 auto; padding:30px; color:#000; }
    h1 { text-align:center; font-size:18px; margin:0; }
    h2 { text-align:center; font-size:15px; margin:4px 0; }
    .meta { border: 1px solid #000; border-collapse: collapse; width:100%; margin:16px 0; }
    .meta td { border:1px solid #000; padding:5px 8px; font-size:13px; }
    .section h3 { text-align:center; font-size:14px; border-top:1px solid #000; padding-top:8px; margin-top:16px; }
    .question { margin:10px 0 6px; font-size:13px; line-height:1.6; }
    .qnum { font-weight:bold; margin-right:4px; }
    .marks { font-weight:bold; margin-left:6px; }
    .options { display:grid; grid-template-columns:1fr 1fr; gap:2px 20px; margin-left:20px; font-size:12px; }
    .watermark { text-align:center; font-size:10px; color:#888; margin-top:40px; border-top:1px solid #ccc; padding-top:8px; }
    .moderation-note { background:#fff8e1; border:1px solid #ffe082; padding:8px 12px; font-size:11px; margin-bottom:12px; border-radius:4px; }
    .signatures { display:flex; justify-content:space-between; margin-top:48px; font-size:12px; }
    .sig-line { border-top:1px solid #000; min-width:160px; text-align:center; padding-top:4px; }
    @media print { .moderation-note { display:none; } }
  </style>
  </head><body>
  <h1>${paper.templateConfig?.institution || 'Your Sarthi Platform'}</h1>
  <h2>${paper.examType === 'midterm' ? 'MID-TERM EXAMINATION' : 'END-SEMESTER EXAMINATION'}</h2>
  <h2>${subject}</h2>
  <p class="moderation-note"><strong>MODERATED COPY</strong> — Moderator: ${assignment?.moderator_name || 'Moderator'} | Notes: ${paper.moderationNotes || paper.moderation_notes || 'None'}</p>
  <table class="meta">
    <tr><td>Programme: ${paper.templateConfig?.program || '—'}</td><td>Max. Marks: ${paper.totalMarks || paper.total_marks || '—'}</td></tr>
    <tr><td>Date: ${paper.examDate ? new Date(paper.examDate).toLocaleDateString() : paper.exam_date ? new Date(paper.exam_date).toLocaleDateString() : '—'}</td><td>Duration: ${paper.durationMins || paper.duration_mins || 180} Minutes</td></tr>
  </table>
  ${sectionHTML}
  <div class="signatures">
    <div class="sig-line">Paper Setter</div>
    <div class="sig-line">Moderator</div>
    <div class="sig-line">Controller of Examinations</div>
  </div>
  <p class="watermark">MODERATED — ${subject}_MODERATED.pdf</p>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

function QuestionEditor({ q, idx, onUpdate, onRemove, onMove, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
        <div className="flex flex-col gap-0.5">
          <button onClick={() => !isFirst && onMove(idx, -1)} disabled={isFirst} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 leading-none">
            <i className="ri-arrow-up-s-line" />
          </button>
          <button onClick={() => !isLast && onMove(idx, 1)} disabled={isLast} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 leading-none">
            <i className="ri-arrow-down-s-line" />
          </button>
        </div>
        <span className="text-xs font-bold text-gray-500 min-w-[28px]">Q{idx + 1}</span>
        <p className="flex-1 text-sm text-gray-700 truncate">{q.question_text || q.text || '(empty question)'}</p>
        <span className="text-xs text-gray-500 whitespace-nowrap">{q.marks || q.max_marks || '—'} M</span>
        <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-700">
          <i className={`ri-arrow-${expanded ? 'up' : 'down'}-s-line`} />
        </button>
        <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600">
          <i className="ri-delete-bin-line" />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-3 border-t border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Question Text</label>
            <textarea
              value={q.question_text || q.text || ''}
              onChange={e => onUpdate(idx, { question_text: e.target.value, text: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={q.type || 'short'}
                onChange={e => onUpdate(idx, { type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
              <input
                value={q.section_label || q.sectionLabel || 'A'}
                onChange={e => onUpdate(idx, { section_label: e.target.value, sectionLabel: e.target.value })}
                maxLength={3}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marks</label>
              <input
                type="number"
                value={q.marks || q.max_marks || ''}
                onChange={e => onUpdate(idx, { marks: +e.target.value, max_marks: +e.target.value })}
                min={0}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bloom's</label>
              <select
                value={q.blooms || ''}
                onChange={e => onUpdate(idx, { blooms: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                {BLOOMS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {(q.type === 'mcq') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">MCQ Options (A–D)</label>
              <div className="grid grid-cols-2 gap-2">
                {['A', 'B', 'C', 'D'].map(opt => (
                  <div key={opt} className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-500 w-5">({opt})</span>
                    <input
                      value={(q.options || {})[opt] || ''}
                      onChange={e => onUpdate(idx, { options: { ...(q.options || {}), [opt]: e.target.value } })}
                      placeholder={`Option ${opt}`}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-600">Correct answer:</span>
                {['A', 'B', 'C', 'D'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => onUpdate(idx, { correct: opt })}
                    className={`w-7 h-7 rounded-full text-xs font-bold border ${q.correct === opt ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}
                  >{opt}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ModerationEditor({ user, assignmentId, onBack }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [started, setStarted] = useState(false);

  // Editable fields
  const [title, setTitle]         = useState('');
  const [subject, setSubject]     = useState('');
  const [instructions, setInstructions] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [durationMins, setDurationMins] = useState(180);
  const [examDate, setExamDate]   = useState('');
  const [examType, setExamType]   = useState('endterm');
  const [questions, setQuestions] = useState([]);
  const [moderationNotes, setModerationNotes] = useState('');
  const [templateConfig, setTemplateConfig] = useState({});

  useEffect(() => { loadAssignment(); }, [assignmentId]);

  async function loadAssignment() {
    setLoading(true);
    setError('');
    try {
      const res = await api.moderation.get(assignmentId);
      setData(res);
      const src = res.moderatedPaper || res.originalPaper || {};
      setTitle(src.title || '');
      setSubject(src.subject || '');
      setInstructions(src.instructions || '');
      setTotalMarks(src.total_marks || src.totalMarks || '');
      setDurationMins(src.duration_mins || src.durationMins || 180);
      setExamDate(src.exam_date || src.examDate || '');
      setExamType(src.exam_type || src.examType || 'endterm');
      setTemplateConfig(src.template_config || src.templateConfig || {});
      setModerationNotes(res.moderatedPaper?.moderation_notes || res.moderatedPaper?.moderationNotes || '');
      // Questions: prefer moderated paper questions, fall back to original
      const qs = res.moderatedPaper?.questions || res.originalPaper?.questions || [];
      setQuestions(Array.isArray(qs) ? qs : []);
      setStarted(res.assignment?.status !== 'assigned');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    try {
      await api.moderation.start(assignmentId);
      setStarted(true);
      setData(prev => prev ? { ...prev, assignment: { ...prev.assignment, status: 'under_review' } } : prev);
    } catch (e) {
      setError(e.message);
    }
  }

  function buildPayload() {
    return { title, subject, instructions, totalMarks: +totalMarks, durationMins: +durationMins, examDate, examType, questions, moderationNotes, templateConfig };
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (!started) await handleStart();
      await api.moderation.saveDraft(assignmentId, buildPayload());
      setSuccess('Draft saved successfully.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!window.confirm('Submit the moderated paper to admin for review? You can still edit if it gets returned.')) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.moderation.submit(assignmentId, buildPayload());
      setSuccess('Paper submitted for admin approval!');
      setData(prev => prev ? { ...prev, assignment: { ...prev.assignment, status: 'moderated' } } : prev);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleUpdateQuestion(idx, patch) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  }

  function handleRemoveQuestion(idx) {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  }

  function handleMoveQuestion(idx, dir) {
    setQuestions(prev => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }

  function handleAddQuestion() {
    setQuestions(prev => [...prev, { id: Date.now().toString(), type: 'short', question_text: '', text: '', marks: 5, max_marks: 5, section_label: 'B', sectionLabel: 'B', blooms: '', options: null, correct: null }]);
  }

  const computed_total = questions.reduce((s, q) => s + (+(q.marks || q.max_marks || 0)), 0);
  const assignment = data?.assignment;
  const isApproved = assignment?.status === 'approved';
  const isSubmitted = assignment?.status === 'moderated';
  const canEdit = !isApproved;
  const rejectionReason = assignment?.rejection_reason || assignment?.rejectionReason;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading assignment...</div>;
  if (error && !data) return (
    <div className="p-8 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <button onClick={onBack} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Go Back</button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-800">
          <i className="ri-arrow-left-line text-xl" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-800">{title || subject || 'Moderation Editor'}</h2>
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isApproved ? 'bg-green-100 text-green-700'
              : isSubmitted ? 'bg-purple-100 text-purple-700'
              : started ? 'bg-yellow-100 text-yellow-700'
              : 'bg-blue-100 text-blue-700'
            }`}>
              {isApproved ? 'Approved' : isSubmitted ? 'Awaiting Approval' : started ? 'In Progress' : 'Assigned'}
            </span>
            {assignment?.deadline && (
              <span><i className="ri-calendar-line mr-1" />Due {new Date(assignment.deadline).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => printModeratedPaper({ title, subject, instructions, totalMarks, durationMins, examDate, examType, questions, moderationNotes, templateConfig }, assignment)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
          >
            <i className="ri-printer-line" /> Print
          </button>
          {canEdit && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-3 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5"
              >
                <i className="ri-save-line" /> {saving ? 'Saving...' : 'Save Draft'}
              </button>
              {!isSubmitted && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <i className="ri-send-plane-line" /> {submitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{success}</div>}
      {rejectionReason && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-orange-800">Returned for Revision</p>
          <p className="text-sm text-orange-700 mt-0.5">{rejectionReason}</p>
        </div>
      )}
      {!started && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-blue-700">Click "Start Review" to begin moderating this paper. The original paper will be loaded as your starting point.</p>
          <button onClick={handleStart} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Start Review</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Paper metadata */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Paper Details</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} disabled={!canEdit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} disabled={!canEdit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Exam Type</label>
              <select value={examType} onChange={e => setExamType(e.target.value)} disabled={!canEdit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50">
                <option value="endterm">End-Semester</option>
                <option value="midterm">Mid-Term</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max Marks</label>
                <input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} disabled={!canEdit}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Duration (min)</label>
                <input type="number" value={durationMins} onChange={e => setDurationMins(+e.target.value)} disabled={!canEdit}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Exam Date</label>
              <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} disabled={!canEdit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Instructions</h3>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} disabled={!canEdit}
              rows={4} placeholder="Exam instructions..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 resize-none" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Moderation Notes</h3>
            <textarea value={moderationNotes} onChange={e => setModerationNotes(e.target.value)} disabled={!canEdit}
              rows={3} placeholder="Add notes about changes made..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 resize-none" />
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Question Summary</p>
            <p className="text-sm text-gray-700">{questions.length} questions</p>
            <p className="text-sm text-gray-700">Computed total: <span className={computed_total !== +totalMarks ? 'text-orange-600 font-semibold' : 'text-green-600 font-semibold'}>{computed_total}</span> / {totalMarks} M</p>
            {computed_total !== +totalMarks && (
              <p className="text-xs text-orange-600 mt-1">Mismatch: update Max Marks or question marks.</p>
            )}
          </div>
        </div>

        {/* Right: Questions editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">{questions.length} Questions</h3>
            {canEdit && (
              <button onClick={handleAddQuestion}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1.5">
                <i className="ri-add-line" /> Add Question
              </button>
            )}
          </div>

          {questions.length === 0
            ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                <i className="ri-file-text-line text-4xl text-gray-300 mb-3 block" />
                <p className="text-gray-500 text-sm">No questions yet</p>
                {canEdit && <button onClick={handleAddQuestion} className="mt-3 text-blue-600 text-sm hover:underline">Add first question</button>}
              </div>
            )
            : questions.map((q, i) => (
              <QuestionEditor
                key={q.id || i}
                q={q}
                idx={i}
                onUpdate={handleUpdateQuestion}
                onRemove={handleRemoveQuestion}
                onMove={handleMoveQuestion}
                isFirst={i === 0}
                isLast={i === questions.length - 1}
              />
            ))
          }

          {/* Audit logs */}
          {data?.logs?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Log</h3>
              <div className="space-y-2">
                {data.logs.map(log => (
                  <div key={log.id} className="flex gap-3 text-xs text-gray-600">
                    <span className="text-gray-400 whitespace-nowrap">{new Date(log.created_at || log.createdAt).toLocaleString()}</span>
                    <span className="font-medium capitalize">{log.action}</span>
                    {log.notes && <span className="text-gray-500">— {log.notes}</span>}
                    <span className="text-gray-400 ml-auto">by {log.actor_name || log.actorName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
