import React from 'react';
import { GC } from '../../utils/helpers';
import { computeGrade } from '../../utils/gemini';
import Btn from '../../components/ui/Btn';

export default function MarksheetPrint({ data, onClose }) {
  const result = ['O', 'A+', 'A', 'B+', 'B', 'C'].includes(data.grade) ? 'PASS' : 'FAIL';
  const issuedDate = new Date(data.issued_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <Btn variant="ghost" onClick={onClose}>← Back</Btn>
        <Btn variant="primary" onClick={() => window.print()}>🖨 Print Marksheet</Btn>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Verification Code:</span>
          <code style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: 5, fontWeight: 600 }}>{data.verification_code}</code>
        </div>
      </div>

      <div id="marksheet" style={{ maxWidth: 800, margin: '0 auto', background: '#fff', border: '2px solid #1a237e', borderRadius: 0, fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
        <div style={{ background: '#1a237e', color: '#fff', padding: '20px 30px', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <svg width="56" height="56" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#fff" fillOpacity="0.15" stroke="#fff" strokeWidth="1.5"/><text x="20" y="26" textAnchor="middle" fill="#ff6f00" fontSize="13" fontWeight="bold">YS</text></svg>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>YOUR SARTHI PLATFORM</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>AI-Powered Learning Management System</div>
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Mark Sheet</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Academic Session {new Date().getFullYear() - 1}–{new Date().getFullYear()}</div>
          </div>
        </div>

        <div style={{ height: 5, background: 'linear-gradient(90deg, #ff6f00, #ffa726)' }} />

        <div style={{ padding: '18px 30px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13 }}>
            {[
              ['Student Name', data.student_name],
              ['Enrollment No.', data.enrollment_no || '—'],
              ['Exam Roll No.', data.roll_no || '—'],
              ['Program', data.program || '—'],
              ['Semester', data.semester || '—'],
              ['Examination', data.paper_title || data.subject || '—'],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ display: 'flex', gap: 8, borderBottom: '1px solid #f3f4f6', paddingBottom: 5 }}>
                <span style={{ color: '#6b7280', minWidth: 110 }}>{lbl}:</span>
                <span style={{ fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 30px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1a237e', color: '#fff' }}>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, width: 50 }}>Q.No</th>
                <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600 }}>Question / Topic</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, width: 90 }}>Max Marks</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, width: 90 }}>Marks Obtained</th>
              </tr>
            </thead>
            <tbody>
              {(data.questionResponses || []).map((qr, i) => {
                const subs = Array.isArray(qr.sub_section_responses) ? qr.sub_section_responses : [];
                return (
                  <React.Fragment key={qr.question_no}>
                    <tr style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: subs.length ? 'none' : '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#1a237e' }}>Q{qr.question_no}</td>
                      <td style={{ padding: '8px 10px' }}>{qr.question_text || `Question ${qr.question_no}`}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{qr.max_marks}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: GC(computeGrade(qr.max_marks > 0 ? Math.round((parseFloat(qr.marks_awarded) / qr.max_marks) * 100) : 0)) }}>
                        {parseFloat(qr.marks_awarded)}
                      </td>
                    </tr>
                    {subs.map(ss => (
                      <tr key={`q${qr.question_no}${ss.label}`} style={{ background: i % 2 === 0 ? '#fafcff' : '#f4f7fb', borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '5px 10px', textAlign: 'center', fontSize: 11, color: '#2563eb' }}>({ss.label})</td>
                        <td style={{ padding: '5px 10px', fontSize: 11, color: '#6b7280', paddingLeft: 20 }}>{ss.feedback || `Sub-section ${ss.label}`}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'center', fontSize: 11 }}>{ss.maxMarks || ss.max_marks}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: 600, fontSize: 12, color: GC(computeGrade((ss.maxMarks || ss.max_marks) > 0 ? Math.round((ss.marksAwarded || ss.marks_awarded) / (ss.maxMarks || ss.max_marks) * 100) : 0)) }}>
                          {ss.marksAwarded ?? ss.marks_awarded}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f0f4ff', borderTop: '2px solid #1a237e', fontWeight: 700 }}>
                <td colSpan={2} style={{ padding: '10px', textAlign: 'right', color: '#374151' }}>TOTAL</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#374151' }}>{data.paper_total_marks || data.max_marks}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: GC(data.grade), fontSize: 15 }}>{parseFloat(data.total_marks_obtained)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ padding: '14px 30px', borderTop: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, textAlign: 'center' }}>
          {[
            ['Marks Obtained', `${parseFloat(data.total_marks_obtained)} / ${data.max_marks}`],
            ['Percentage', `${parseFloat(data.percentage).toFixed(1)}%`],
            ['Grade', data.grade],
            ['Result', result],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7, padding: '10px 6px' }}>
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{lbl}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: lbl === 'Grade' ? GC(data.grade) : lbl === 'Result' ? (result === 'PASS' ? '#15803d' : '#dc2626') : '#111827' }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 30px 20px', borderTop: '2px solid #e5e7eb', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[
            { title: 'Controller of Examinations', name: 'Prof. R.K. Sharma', dept: 'Examination Division' },
            { title: 'Registrar', name: 'Dr. S.P. Gupta', dept: 'Your Sarthi Platform' },
          ].map(sig => (
            <div key={sig.title} style={{ textAlign: 'center' }}>
              <div style={{ height: 40, borderBottom: '1.5px solid #374151', marginBottom: 6 }} />
              <div style={{ fontSize: 13, fontWeight: 700 }}>{sig.name}</div>
              <div style={{ fontSize: 11, color: '#374151' }}>{sig.title}</div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>{sig.dept}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#f0f4ff', borderTop: '2px solid #1a237e', padding: '12px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>Digital Verification Code</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a237e', letterSpacing: 1.5 }}>{data.verification_code}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#6b7280' }}>Issued on: {issuedDate}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Verify at: yoursarthi.com/verify · This is a computer-generated marksheet</div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #marksheet, #marksheet * { visibility: visible; }
          #marksheet { position: fixed; top: 0; left: 0; width: 100%; border: none !important; }
        }
      `}</style>
    </div>
  );
}
