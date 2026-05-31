import { GC } from '../../utils/helpers';
import { S } from './styles';
import Btn from '../../components/ui/Btn';
import Spin from '../../components/ui/Spin';
import MarksheetPrint from './MarksheetPrint';

export default function MarksheetsView({ pgReady, papers, msPaperId, setMsPaperId, msResults, msLoading, msView, setMsView, onLoadResults, onGenerate }) {
  if (msView) {
    return <MarksheetPrint data={msView} onClose={() => setMsView(null)} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Marksheets</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Generate & print official marksheets with digital verification</div>
        </div>
        <select
          style={{ ...S.sel, width: 300, marginBottom: 0 }}
          value={msPaperId}
          onChange={e => { setMsPaperId(e.target.value); if (e.target.value) onLoadResults(e.target.value); }}
        >
          <option value="">— Select Exam Paper —</option>
          {papers.map(p => (
            <option key={p.id} value={p.id}>{p.title} ({p.student_count} students)</option>
          ))}
        </select>
      </div>

      {!msPaperId && (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>📋</div>
          <div>Select an exam paper to manage marksheets.</div>
        </div>
      )}

      {msPaperId && msResults.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>No students evaluated for this paper yet.</div>
      )}

      {msResults.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
          {msResults.map((r) => (
            <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.student_name || 'Unknown'}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Roll: {r.roll_no || '—'} · Enroll: {r.enrollment_no || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: GC(r.grade) }}>{r.grade}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{parseFloat(r.total_marks_obtained)}/{r.max_marks}</div>
                </div>
              </div>
              <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${parseFloat(r.percentage)}%`, background: GC(r.grade), borderRadius: 2 }} />
              </div>
              {r.has_marksheet
                ? <Btn variant="blue" full sm onClick={() => onGenerate(r.id)}>📋 View Marksheet</Btn>
                : <Btn variant="primary" full sm disabled={msLoading} onClick={() => onGenerate(r.id)}>{msLoading ? <><Spin color="#fff" /> Generating…</> : '📋 Generate Marksheet'}</Btn>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
