import { useEffect } from 'react';

const EXAM_LABELS = {
  midterm: 'MID-TERM EXAMINATION',
  endterm: 'END-SEMESTER EXAMINATION',
};

export default function PaperPrintView({ paper, showAnswers = false, onClose }) {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'paper-print-css';
    style.textContent = `
      @media print {
        /* Hide everything via visibility so descendants can selectively opt-in */
        body { visibility: hidden; }

        /* Show the print root and all its children */
        #paper-print-root,
        #paper-print-root * { visibility: visible; }

        /* Remove fixed/overflow constraints so all pages print */
        #paper-print-root {
          position: static !important;
          overflow: visible !important;
          background: white !important;
          height: auto !important;
          inset: auto !important;
        }

        /* Strip the grey outer background and shadow from the A4 sheet */
        #paper-print-root .paper-sheet {
          box-shadow: none !important;
          margin: 0 !important;
        }

        /* Force background colours to print (answer boxes) */
        #paper-print-root .answer-box {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Hide UI-only elements */
        #paper-print-root .toolbar-noPrint { display: none !important; }
        #paper-print-root .meta-noPrint   { display: none !important; }

        @page { margin: 14mm; size: A4 portrait; }
      }
    `;
    document.head.appendChild(style);
    return () => { const el = document.getElementById('paper-print-css'); if (el) el.remove(); };
  }, []);

  if (!paper) return null;

  const {
    title, subject, examDate, duration, totalMarks, instructions,
    examType = 'endterm', templateConfig = {}, sections = [], questions = [],
  } = paper;

  const tc = templateConfig;
  const sectionLabels = [...new Set((questions || []).map(q => q.sectionLabel))].sort();

  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div
      id="paper-print-root"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#f3f4f6', overflowY: 'auto' }}
    >
      {/* Toolbar */}
      <div
        className="toolbar-noPrint"
        style={{
          position: 'sticky', top: 0, background: '#1a237e', color: '#fff', zIndex: 10000,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 24px', boxShadow: '0 2px 8px rgba(0,0,0,.3)',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          <i className="ri-eye-line" style={{ marginRight: 8 }} />
          {showAnswers ? 'Answer Key Preview — ' : 'Paper Preview — '}{title}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.print()}
            style={{
              background: '#fff', color: '#1a237e', border: 'none', borderRadius: 6,
              padding: '7px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className="ri-printer-line" /> Print / Save as PDF
          </button>
          <button
            onClick={onClose}
            style={{
              background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6,
              padding: '7px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className="ri-close-line" /> Close
          </button>
        </div>
      </div>

      {/* A4 paper */}
      <div
        className="paper-sheet"
        style={{
          maxWidth: 794, margin: '24px auto 40px', padding: '32px 44px',
          fontFamily: 'Times New Roman, Georgia, serif', fontSize: 12, color: '#000',
          background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,.18)',
        }}
      >
        {/* ── Header ── */}
        <div style={{ textAlign: 'center', borderBottom: '3px double #000', paddingBottom: 14, marginBottom: 14 }}>
          {tc.department && (
            <p style={{ margin: '0 0 2px', fontSize: 11, letterSpacing: 0.5 }}>
              Department of {tc.department}
            </p>
          )}
          <h1 style={{ margin: '4px 0', fontSize: 19, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
            {tc.institution || 'Your Sarthi Platform'}
          </h1>
          <p style={{ margin: '2px 0', fontSize: 11, fontStyle: 'italic' }}>
            Academic Year {tc.academicYear || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)}
          </p>
          <h2 style={{
            margin: '10px 0 4px', fontSize: 14, fontWeight: 700, letterSpacing: 2,
            textDecoration: 'underline', textUnderlineOffset: 4,
          }}>
            {EXAM_LABELS[examType] || 'EXAMINATION'}
          </h2>
          {showAnswers && (
            <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#c00', textTransform: 'uppercase' }}>
              — Answer Key / Teacher's Copy —
            </p>
          )}
        </div>

        {/* ── Course Info Table ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 11.5 }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 8px', border: '1px solid #000', width: '55%' }}>
                <strong>Programme:</strong> {tc.program || '—'}
              </td>
              <td style={{ padding: '4px 8px', border: '1px solid #000' }}>
                <strong>Date of Examination:</strong> {fmtDate(examDate)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', border: '1px solid #000' }}>
                <strong>Course Code &amp; Title:</strong> {subject || title}
              </td>
              <td style={{ padding: '4px 8px', border: '1px solid #000' }}>
                <strong>Time Allowed:</strong> {duration ? `${duration} Minutes` : '—'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', border: '1px solid #000' }}>
                <strong>Semester:</strong> {tc.semester || '—'}
              </td>
              <td style={{ padding: '4px 8px', border: '1px solid #000' }}>
                <strong>Maximum Marks:</strong> {totalMarks || '—'}
              </td>
            </tr>
            {examType === 'midterm' && (
              <tr>
                <td colSpan={2} style={{ padding: '4px 8px', border: '1px solid #000' }}>
                  <strong>Syllabus Covered:</strong> Units as taught up to mid-semester
                </td>
              </tr>
            )}
            {tc.examRoom && (
              <tr>
                <td colSpan={2} style={{ padding: '4px 8px', border: '1px solid #000' }}>
                  <strong>Exam Room:</strong> {tc.examRoom}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── Instructions ── */}
        {instructions && (
          <div style={{ border: '1px solid #000', padding: '8px 12px', marginBottom: 18, fontSize: 11 }}>
            <strong style={{ display: 'block', marginBottom: 4 }}>General Instructions:</strong>
            <div style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>{instructions}</div>
          </div>
        )}

        {/* ── Sections ── */}
        {sectionLabels.map(sLabel => {
          const secQs = (questions || []).filter(q => q.sectionLabel === sLabel);
          const secConf = (sections || []).find(s => s.label === sLabel);
          const marksEach = secConf?.marksPerQ || secQs[0]?.marks || 1;
          const secTotal  = secQs.reduce((s, q) => s + (q.marks || marksEach), 0);

          return (
            <div key={sLabel} style={{ marginBottom: 20 }}>
              

              {secQs.map((q, qi) => (
                <div key={q.questionNo} style={{ marginBottom: 14, pageBreakInside: 'avoid' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 700, minWidth: 30, flexShrink: 0, fontSize: 12 }}>
                      Q{q.questionNo}.
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ lineHeight: 1.55 }}>{q.text}</span>
                        <span style={{
                          fontWeight: 700, flexShrink: 0, fontSize: 11,
                          border: '1px solid #000', padding: '1px 7px', borderRadius: 2, whiteSpace: 'nowrap',
                        }}>
                          [{q.marks}M]
                        </span>
                      </div>

                      {/* MCQ Options */}
                      {q.type === 'mcq' && q.options && typeof q.options === 'object' && (
                        <div style={{
                          marginTop: 7, display: 'grid',
                          gridTemplateColumns: Object.keys(q.options).length <= 4 ? '1fr 1fr' : '1fr',
                          gap: '4px 24px',
                        }}>
                          {Object.entries(q.options).map(([key, val]) => (
                            <span key={key} style={{ fontSize: 11.5, lineHeight: 1.5, fontWeight: showAnswers && key === q.correct ? 700 : 400 }}>
                              <strong>({key})</strong>&nbsp;&nbsp;{val}{showAnswers && key === q.correct ? ' ✓' : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Answer shown only in answer-key mode */}
                      {showAnswers && (
                        <div className="answer-box" style={{
                          marginTop: 12,
                          padding: '8px 12px',
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderLeft: '4px solid #16a34a',
                          borderRadius: 3,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}>
                          {q.type === 'mcq' ? (
                            <>
                              <p style={{ margin: '0 0 3px', fontSize: 9.5, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Answer</p>
                              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#166534' }}>
                                ({q.correct})&nbsp;
                                {q.options && typeof q.options === 'object' ? q.options[q.correct] || '' : ''}
                              </p>
                              {q.answer && (
                                <p style={{ margin: 0, fontSize: 11, color: '#1e293b', lineHeight: 1.6 }}>{q.answer}</p>
                              )}
                            </>
                          ) : (
                            <>
                              <p style={{ margin: '0 0 4px', fontSize: 9.5, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Model Answer</p>
                              <p style={{ margin: 0, fontSize: 12, color: '#0f172a', lineHeight: 1.75, fontWeight: 400 }}>
                                {q.answer || q.rubric || ''}
                              </p>
                            </>
                          )}
                        </div>
                      )}


                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        

        <p style={{ textAlign: 'center', fontSize: 10, color: '#555', marginTop: 18, fontStyle: 'italic' }}>
          *** END OF QUESTION PAPER ***
        </p>
      </div>
    </div>
  );
}
