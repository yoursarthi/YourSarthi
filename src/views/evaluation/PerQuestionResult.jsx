import { useState } from 'react';
import { GC } from '../../utils/helpers';
import { computeGrade } from '../../utils/gemini';

export default function PerQuestionResult({ result, questions }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const col = GC(result.grade);
  const pct = result.percentage || 0;

  return (
    <div>
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, fontWeight: 700, color: col, lineHeight: 1 }}>{result.grade}</div>
          <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1.2 }}>GRADE</div>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 26, fontWeight: 700 }}>{result.totalMarksAwarded}</span>
            <span style={{ fontSize: 13, color: '#6b7280' }}>/ {result.totalMaxMarks}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: col, marginLeft: 6 }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 3, transition: 'width 1.2s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
            {(result.strengths || []).slice(0, 2).map((s, i) => (
              <span key={i} style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 20, padding: '2px 8px', fontSize: 10 }}>✓ {s.slice(0, 25)}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}><i className="ri-bar-chart-2-line" style={{ fontSize: 13, color: '#6366f1' }} />Per-Question Breakdown</div>
        {(result.questions || []).map((q) => {
          const qDef = questions.find(dq => dq.questionNo === q.questionNo);
          const qPct = q.maxMarks > 0 ? Math.round((q.marksAwarded / q.maxMarks) * 100) : 0;
          const qCol = GC(computeGrade(qPct));
          return (
            <div key={q.questionNo} style={{ background: '#f9fafb', border: `1px solid ${qCol}30`, borderRadius: 8, padding: '10px 12px', marginBottom: 7 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5' }}>Q{q.questionNo}</span>
                  {qDef?.text && <span style={{ fontSize: 11, color: '#374151', marginLeft: 6 }}>{qDef.text.slice(0, 60)}{qDef.text.length > 60 ? '…' : ''}</span>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: qCol }}>{q.marksAwarded}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>/{q.maxMarks}</span>
                  <span style={{ fontSize: 11, color: qCol, marginLeft: 4 }}>({qPct}%)</span>
                </div>
              </div>
              <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${qPct}%`, background: qCol, borderRadius: 2 }} />
              </div>
              {(q.subSections || []).length > 0 && (
                <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: `3px solid ${qCol}40` }}>
                  {(q.subSections || []).map(ss => {
                    const ssPct = ss.maxMarks > 0 ? Math.round((ss.marksAwarded / ss.maxMarks) * 100) : 0;
                    const ssCol = GC(computeGrade(ssPct));
                    return (
                      <div key={ss.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, fontSize: 11 }}>
                        <span style={{ color: '#6366f1', fontWeight: 700, minWidth: 28 }}>({ss.label})</span>
                        <div style={{ flex: 1, height: 3, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${ssPct}%`, background: ssCol, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: ssCol }}>{ss.marksAwarded}</span>
                        <span style={{ color: '#64748b' }}>/{ss.maxMarks}</span>
                        {ss.feedback && <span style={{ color: '#6b7280', fontSize: 10, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ss.feedback}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              {q.feedback && <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.5, marginTop: 4 }}>{q.feedback}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: 10, fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ fontSize: 10, color: '#15803d', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>✅ Strengths</div>
          {(result.strengths || []).map((s, i) => <div key={i}>• {s}</div>)}
        </div>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, padding: 10, fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ fontSize: 10, color: '#92400e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>⚠️ Improve</div>
          {(result.improvements || []).map((s, i) => <div key={i}>• {s}</div>)}
        </div>
      </div>

      {result.detailedFeedback && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7, padding: 12, fontSize: 13, lineHeight: 1.8, marginBottom: 8 }}>{result.detailedFeedback}</div>
      )}

      {result.transcription && (
        <div>
          <button onClick={() => setShowTranscript(p => !p)} style={{ fontSize: 11, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', marginBottom: 6 }}>
            {showTranscript ? '▲ Hide Transcription' : '▼ Show Transcription'}
          </button>
          {showTranscript && (
            <div style={{ background: '#f9fafb', borderLeft: '3px solid #d1d5db', padding: 10, fontSize: 12, lineHeight: 1.75, color: '#4b5563', fontStyle: 'italic', whiteSpace: 'pre-wrap', borderRadius: '0 7px 7px 0' }}>{result.transcription}</div>
          )}
        </div>
      )}
    </div>
  );
}
