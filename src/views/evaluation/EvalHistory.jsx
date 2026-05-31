import { GC } from '../../utils/helpers';

const GRADE_RINGS = {
  O:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)' },
  'A+':{ color: '#34d399',bg: 'rgba(52,211,153,0.12)',   border: 'rgba(52,211,153,0.3)' },
  A:  { color: '#6ee7b7', bg: 'rgba(110,231,183,0.12)',  border: 'rgba(110,231,183,0.3)' },
  B:  { color: '#6366f1', bg: 'rgba(99,102,241,0.12)',   border: 'rgba(99,102,241,0.3)' },
  C:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.3)' },
  D:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.3)' },
  F:  { color: '#f87171', bg: 'rgba(248,113,113,0.12)',  border: 'rgba(248,113,113,0.3)' },
};

function CircularProgress({ pct, color, size = 56 }) {
  const r   = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, pct) / 100);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="5" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        className="ring-progress"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fontSize: 12, fontWeight: 700, fill: color, fontFamily: 'Inter,sans-serif' }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function EvalHistory({ history }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
        Evaluation History{' '}
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>({history.length} records)</span>
      </div>
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <i className="ri-folder-open-line" style={{ fontSize: 32, color: '#cbd5e1', display: 'block', marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: '#475569' }}>No evaluations saved yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 12 }}>
          {history.map(e => {
            const gc  = GC(e.grade);
            const gs  = GRADE_RINGS[e.grade] || { color: gc, bg: `${gc}20`, border: `${gc}44` };
            const pct = parseInt(e.percentage) || 0;
            return (
              <div key={e.id} className="dark-card fade-in-up" style={{
                padding: '16px 18px',
                borderLeft: `3px solid ${gs.color}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Student info */}
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{e.studentName || 'Student'}</p>
                  {e.rollNo && <p style={{ fontSize: 11, color: '#6366f1', fontFamily: 'monospace', marginTop: 2 }}>{e.rollNo}</p>}
                  {e.subject && <span style={{ fontSize: 10.5, color: '#64748b', padding: '1px 7px', borderRadius: 9999, background: '#f1f5f9', border: '1px solid rgba(15,23,42,0.1)', display: 'inline-block', marginTop: 4 }}>{e.subject}</span>}
                </div>

                {/* Grade + circular progress */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Grade circle */}
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: gs.bg, border: `2px solid ${gs.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: gs.color, lineHeight: 1 }}>{e.grade}</span>
                  </div>
                  {/* SVG ring */}
                  <CircularProgress pct={pct} color={gs.color} />
                </div>

                {/* Marks */}
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{e.marksAwarded}/{e.maxMarks}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>marks</span>
                </div>

                {/* Progress bar */}
                <div className="progress-track" style={{ marginTop: 8 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: gs.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
