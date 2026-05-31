import { useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../../api/client';
import { processFiles } from '../../utils/fileHelpers';
import { uid, GC } from '../../utils/helpers';
import { qMax } from '../../utils/gemini';
import { S } from './styles';
import Btn from '../../components/ui/Btn';
import Spin from '../../components/ui/Spin';

export default function BulkEval({
  questions, subject, maxMarks, modelAnswerImages, apiKey,
  paperId, pgReady, onPaperCreated, paperMeta, toast,
  onViewTabulation,
}) {
  const [bulkStudents, setBulkStudents] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [log, setLog] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [evalComplete, setEvalComplete] = useState(false);
  const socketRef = useRef(null);
  const fileRef = useRef();

  const addLog = (msg, type = 'info') =>
    setLog(p => [{ id: uid(), msg, type, time: new Date().toLocaleTimeString() }, ...p].slice(0, 100));

  const handleBulkFiles = async (files) => {
    setEvalComplete(false);
    const processed = [];
    for (const f of Array.from(files)) {
      const imgs = await processFiles([f]);
      if (imgs.length) {
        const name = f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();
        processed.push({ id: uid(), name, rollNo: '', images: imgs, status: 'pending', result: null, err: null });
      }
    }
    setBulkStudents(p => [...p, ...processed]);
    addLog(`Added ${processed.length} sheet(s) to queue.`, 'success');
  };

  // validQuestions is already filtered — just check it's non-empty
  const hasQuestions = Array.isArray(questions) && questions.length > 0;

  const runBulk = async () => {
    const pending = bulkStudents.filter(s => s.status === 'pending' || s.status === 'error');
    if (!pending.length || !hasQuestions) return;
    setRunning(true); setTotal(pending.length); setDone(0);
    setSavedCount(0); setEvalComplete(false);

    const socket = io(import.meta.env.VITE_API_URL || undefined);
    socketRef.current = socket;

    let sid = '';
    try {
      const r = await api.evaluations.createSession({ subject, maxMarks });
      sid = r.sessionId;
    } catch {}

    let currentPaperId = paperId;
    if (!currentPaperId && paperMeta) {
      try {
        const r = await api.exams.createPaper({
          title: paperMeta.title || `${subject || 'Exam'} — ${new Date().toLocaleDateString('en-IN')}`,
          subject: paperMeta.subject, program: paperMeta.program, semester: paperMeta.semester,
          questions: (paperMeta.questions || []).filter(q => q.text.trim()).map((q, i) => ({
            questionNo: q.questionNo || i + 1, text: q.text, maxMarks: qMax(q),
            rubric: q.rubric || '',
            subSections: (q.subSections || []).map(ss => ({
              label: ss.label, text: ss.text, maxMarks: parseInt(ss.maxMarks) || 0, rubric: ss.rubric || '',
            })),
          })),
        });
        currentPaperId = r.paperId;
        onPaperCreated(r.paperId);
      } catch (e) {
        addLog(`Paper creation failed: ${e.message}`, 'error');
      }
    }

    socket.on('eval:update', ({ clientId, status, result, error, studentName }) => {
      setBulkStudents(p =>
        p.map(s => s.id !== clientId ? s : { ...s, status, result: result ?? s.result, err: error ?? null })
      );
      if (status === 'done') {
        setDone(d => d + 1);
        if (pgReady) setSavedCount(n => n + 1);
        addLog(`✓ ${studentName} → ${result.grade} (${result.percentage}%)`, 'success');
      } else if (status === 'error') {
        setDone(d => d + 1);
        addLog(`✗ ${studentName}: ${error}`, 'error');
      } else if (status === 'evaluating') {
        addLog(`Evaluating: ${studentName}…`, 'info');
      }
    });

    socket.on('eval:complete', () => {
      setRunning(false);
      setEvalComplete(true);
      socket.disconnect();
      addLog('Bulk evaluation complete!', 'success');
    });

    socket.on('connect_error', (e) => {
      setRunning(false);
      socket.disconnect();
      addLog(`Cannot reach server: ${e.message}`, 'error');
    });

    socket.emit('join:session', sid || 'bulk');
    socket.emit('bulk:start', {
      sessionId: sid || 'bulk',
      students: pending.map(s => ({
        clientId: s.id, name: s.name, rollNo: s.rollNo, enrollmentNo: '',
        images: s.images.map(im => ({ b64: im.b64, mime: im.mime })),
      })),
      subject, maxMarks,
      modelAnswer: '',
      modelAnswerImages: modelAnswerImages.map(im => ({ b64: im.b64, mime: im.mime })),
      apiKey,
      questions: questions.map(q => ({
        questionNo: q.questionNo, text: q.text, maxMarks: qMax(q),
        rubric: q.rubric || '',
        subSections: (q.subSections || []).map(ss => ({
          label: ss.label, text: ss.text, maxMarks: parseInt(ss.maxMarks) || 0, rubric: ss.rubric || '',
        })),
      })),
      paperId: currentPaperId,
    });
    addLog(`${pending.length} jobs queued — 3× parallel workers.`, 'success');
  };

  const exportCSV = () => {
    const ev = bulkStudents.filter(s => s.result);
    if (!ev.length) { toast('No results to export yet.', 'warning'); return; }
    const qNos = questions.map(q => q.questionNo);
    const headers = ['S.No', 'Student Name', 'Roll No',
      ...qNos.map(n => `Q${n}(/${qMax(questions.find(q => q.questionNo === n) || {})})`),
      `Total(/${maxMarks})`, 'Percentage', 'Grade'];
    const rows = [headers];
    ev.forEach((s, i) => {
      const qMarks = qNos.map(n => {
        const q = (s.result.questions || []).find(r => r.questionNo === n);
        return q ? q.marksAwarded : '-';
      });
      rows.push([i + 1, s.name, s.rollNo, ...qMarks,
        s.result.totalMarksAwarded, s.result.percentage + '%', s.result.grade]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `bulk_results_${Date.now()}.csv`;
    a.click();
  };

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const doneCount = bulkStudents.filter(s => s.status === 'done').length;
  const pendingCount = bulkStudents.filter(s => s.status === 'pending').length;
  const errorCount = bulkStudents.filter(s => s.status === 'error').length;
  const statusColor = s => ({ pending: '#6b7280', evaluating: '#2563eb', done: '#16a34a', error: '#dc2626' }[s] || '#6b7280');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
      <div>
        {!hasQuestions && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 12 }}>
            ⚠️ Add questions with text in the Evaluate tab first.
          </div>
        )}

        {/* Post-completion banner */}
        {evalComplete && doneCount > 0 && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600, flex: 1 }}>
              ✅ {doneCount} student(s) evaluated
              {pgReady && savedCount > 0 && ` · ${savedCount} saved to PostgreSQL`}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="green" sm onClick={exportCSV}>⬇ Export CSV</Btn>
              {pgReady && paperId && onViewTabulation && (
                <Btn variant="primary" sm onClick={onViewTabulation}>📊 View Tabulation →</Btn>
              )}
            </div>
          </div>
        )}

        {!running && (
          <div style={S.card}>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
              📁 Upload Answer Sheets (one file = one student)
            </div>
            <div
              onClick={() => fileRef.current.click()}
              style={{ border: '2px dashed rgba(99,102,241,0.25)', borderRadius: 10, padding: '22px 16px', textAlign: 'center', cursor: 'pointer', background: 'rgba(99,102,241,0.04)', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
            >
              <i className="ri-stack-line" style={{ fontSize: 30, color: '#6366f1', display: 'block', marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>Drop all answer sheets here</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Each file = one student · JPG, PNG, WEBP, PDF</div>
              <input
                ref={fileRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
                onChange={e => { handleBulkFiles(e.target.files); e.target.value = ''; }}
              />
            </div>
          </div>
        )}

        {running && (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Spin color="#2563eb" /> Evaluating class…
                {pgReady && (
                  <span style={{ fontSize: 11, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 6px' }}>
                    Saving to DB
                  </span>
                )}
              </div>
              <span style={{ fontWeight: 700, color: '#2563eb' }}>{done}/{total} ({pct}%)</span>
            </div>
            <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 5, transition: 'width .5s ease' }} />
            </div>
          </div>
        )}

        {bulkStudents.length > 0 && (
          <div style={S.card}>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
              👥 Queue — {bulkStudents.length} students
            </div>
            {bulkStudents.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 8px', borderBottom: '1px solid #f3f4f6', borderRadius: 5,
                  background: s.status === 'evaluating' ? '#eff6ff' : s.status === 'done' ? '#f0fdf4' : s.status === 'error' ? '#fef2f2' : 'transparent',
                }}
              >
                <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 20 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || 'Unnamed'}</div>
                  <input
                    style={{ ...S.inp, fontSize: 11, padding: '2px 6px', marginTop: 3, marginBottom: 0, width: 120 }}
                    placeholder="Roll No"
                    value={s.rollNo}
                    onChange={e => setBulkStudents(p => p.map(x => x.id === s.id ? { ...x, rollNo: e.target.value } : x))}
                    disabled={running}
                  />
                </div>
                <span style={{ fontSize: 11, color: statusColor(s.status), minWidth: 70 }}>
                  {s.status === 'evaluating' ? <><Spin size={11} color="#2563eb" /> eval…</> : s.status}
                </span>
                {s.result && (
                  <span style={{ background: GC(s.result.grade) + '20', color: GC(s.result.grade), borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                    {s.result.grade} {s.result.percentage}%
                  </span>
                )}
                {!running && (
                  <button
                    onClick={() => setBulkStudents(p => p.filter(x => x.id !== s.id))}
                    style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                  >✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel */}
      <div>
        <div style={S.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              ['Total', bulkStudents.length, '#374151'],
              ['Pending', pendingCount, '#d97706'],
              ['Done', doneCount, '#16a34a'],
              ['Errors', errorCount, '#dc2626'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: '#f9fafb', borderRadius: 7, padding: '9px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          {!running
            ? <Btn variant="primary" full disabled={!bulkStudents.length || !hasQuestions || pendingCount === 0} onClick={runBulk}>
                ⚡ Start Bulk Eval ({pendingCount})
              </Btn>
            : <Btn variant="yellow" full onClick={() => { socketRef.current?.disconnect(); setRunning(false); }}>⏹ Stop</Btn>
          }
          {pgReady && !running && doneCount > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '6px 9px', color: '#15803d' }}>
              🐘 {savedCount}/{doneCount} results saved to PostgreSQL
            </div>
          )}
          {!apiKey && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#92400e', background: '#fffbeb', borderRadius: 6, padding: '6px 9px' }}>
              ⚠ Set Gemini API key first
            </div>
          )}
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>📋 Activity Log</div>
          <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {log.length === 0
              ? <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: 12 }}>No activity yet.</div>
              : log.map(l => (
                <div
                  key={l.id}
                  style={{
                    display: 'flex', gap: 6, padding: '4px 6px', borderRadius: 4,
                    background: l.type === 'error' ? '#fef2f2' : l.type === 'success' ? '#f0fdf4' : '#f9fafb',
                  }}
                >
                  <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>{l.time}</span>
                  <span style={{ fontSize: 12, color: l.type === 'error' ? '#dc2626' : l.type === 'success' ? '#15803d' : '#374151', lineHeight: 1.5 }}>{l.msg}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
