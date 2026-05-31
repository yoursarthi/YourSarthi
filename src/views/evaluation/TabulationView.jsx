import { GC } from '../../utils/helpers';
import { computeGrade } from '../../utils/gemini';
import { S } from './styles';
import Btn from '../../components/ui/Btn';
import Spin from '../../components/ui/Spin';

export default function TabulationView({ pgReady, papers, tabPaperId, setTabPaperId, tabData, tabLoading, onLoad }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Class Tabulation</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Per-student, per-question marks sheet</div>
        </div>
        <select
          style={{ ...S.sel, width: 280, marginBottom: 0 }}
          value={tabPaperId}
          onChange={e => { setTabPaperId(e.target.value); if (e.target.value) onLoad(e.target.value); }}
        >
          <option value="">— Select Exam Paper —</option>
          {papers.map(p => (
            <option key={p.id} value={p.id}>{p.title} ({p.student_count} students)</option>
          ))}
        </select>
        {tabData && (
          <Btn variant="green" sm onClick={() => window.open(`/api/exams/papers/${tabPaperId}/tabulation/export`)}>⬇ Export CSV</Btn>
        )}
      </div>

      {tabLoading && <div style={{ textAlign: 'center', padding: 32 }}><Spin size={24} color="#6366f1" /></div>}

      {!tabLoading && !tabData && !tabPaperId && (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>📊</div>
          <div>Select an exam paper to view the class tabulation.</div>
        </div>
      )}

      {tabData && (
        <>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div><span style={{ fontSize: 11, color: '#64748b' }}>Paper</span><br /><span style={{ fontWeight: 600 }}>{tabData.paper.title}</span></div>
            <div><span style={{ fontSize: 11, color: '#64748b' }}>Subject</span><br /><span style={{ fontWeight: 600 }}>{tabData.paper.subject || '—'}</span></div>
            <div><span style={{ fontSize: 11, color: '#64748b' }}>Program</span><br /><span style={{ fontWeight: 600 }}>{tabData.paper.program || '—'}</span></div>
            <div><span style={{ fontSize: 11, color: '#64748b' }}>Semester</span><br /><span style={{ fontWeight: 600 }}>{tabData.paper.semester || '—'}</span></div>
            <div><span style={{ fontSize: 11, color: '#64748b' }}>Total Marks</span><br /><span style={{ fontWeight: 600 }}>{tabData.paper.total_marks}</span></div>
            <div><span style={{ fontSize: 11, color: '#64748b' }}>Students</span><br /><span style={{ fontWeight: 600 }}>{tabData.tabulation.length}</span></div>
          </div>

          {tabData.tabulation.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>No students evaluated for this paper yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
                <thead>
                  <tr style={{ background: '#6366f1', color: '#fff' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>S.No</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Student Name</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>Roll No</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>Enrollment No</th>
                    {tabData.questions.map(q => (
                      <th key={q.id} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>
                        Q{q.question_no}<br /><span style={{ fontSize: 9, opacity: 0.8 }}>/{q.max_marks}</span>
                      </th>
                    ))}
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>Total<br /><span style={{ fontSize: 9, opacity: 0.8 }}>/{tabData.paper.total_marks}</span></th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>%</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {tabData.tabulation.map((row, i) => (
                    <tr key={row.resultId} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{row.serialNo}</td>
                      <td style={{ padding: '8px', fontWeight: 500 }}>{row.studentName || '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>{row.rollNo || '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>{row.enrollmentNo || '—'}</td>
                      {row.questionMarks.map(qm => (
                        <td key={qm.questionNo} style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: GC(computeGrade(qm.maxMarks > 0 ? Math.round((qm.marksAwarded / qm.maxMarks) * 100) : 0)) }}>
                          {qm.marksAwarded}
                        </td>
                      ))}
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{row.totalMarksObtained}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: GC(row.grade) }}>{row.percentage}%</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{ background: GC(row.grade) + '20', color: GC(row.grade), border: `1px solid ${GC(row.grade)}40`, borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{row.grade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'rgba(99,102,241,0.05)', fontWeight: 700, borderTop: '2px solid #6366f1' }}>
                    <td colSpan={4} style={{ padding: '8px', textAlign: 'right', color: '#374151' }}>Class Average →</td>
                    {tabData.questions.map(q => {
                      const avg = tabData.tabulation.length
                        ? (tabData.tabulation.reduce((s, r) => s + (r.questionMarks.find(qm => qm.questionNo === q.question_no)?.marksAwarded || 0), 0) / tabData.tabulation.length).toFixed(1)
                        : '—';
                      return <td key={q.id} style={{ padding: '8px', textAlign: 'center', color: '#374151' }}>{avg}</td>;
                    })}
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {tabData.tabulation.length ? (tabData.tabulation.reduce((s, r) => s + r.totalMarksObtained, 0) / tabData.tabulation.length).toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {tabData.tabulation.length ? (tabData.tabulation.reduce((s, r) => s + r.percentage, 0) / tabData.tabulation.length).toFixed(1) + '%' : '—'}
                    </td>
                    <td style={{ padding: '8px' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
