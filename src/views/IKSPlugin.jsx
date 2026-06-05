export default function IKSPlugin() {
  const modules = [
    {
      title: 'IKS Syllabus Designer',
      desc: 'Upload a course outline and receive instant AI suggestions for relevant historical Indian treatises, author links, and case studies to enrich modern STEM pedagogy.',
      dashed: false,
    },
    {
      title: 'Research Synergy Map',
      desc: 'A live, semantic Knowledge Graph connecting isolated departments. Discover non-obvious links between Metallurgy and Rasashastra or Management and Arthashastra.',
      dashed: false,
    },
    {
      title: 'Mentorship Dashboard',
      desc: 'The "Parenting" module tracks holistic student growth—academics, well-being, and community service—alerting mentors when students need support.',
      dashed: false,
    },
    {
      title: 'Interdisciplinary Bridge',
      desc: 'Connect concepts like Kerala School Mathematics to Computer Science or Vastu Shastra to Urban Town Planning for inter-dept seed grants.',
      dashed: true,
    },
  ];

  const hexStyle = (active) => ({
    width: 100,
    height: 57,
    backgroundColor: active ? '#d4812c' : '#eee6d8',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 12,
    textAlign: 'center',
    color: active ? '#fff' : '#4a4a4a',
    marginTop: 28,
    marginBottom: 28,
  });

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 40 }}>
      <style>{`
        .iks-hex { width:100px; height:57px; position:relative; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; text-align:center; margin: 28px 0; }
        .iks-hex::before, .iks-hex::after { content:""; position:absolute; left:0; width:0; height:0; border-left:50px solid transparent; border-right:50px solid transparent; }
        .iks-hex::before { bottom:100%; }
        .iks-hex::after { top:100%; }
        .iks-hex.inactive { background:#eee6d8; color:#4a4a4a; }
        .iks-hex.inactive::before { border-bottom:28px solid #eee6d8; }
        .iks-hex.inactive::after { border-top:28px solid #eee6d8; }
        .iks-hex.active-hex { background:#d4812c; color:#fff; }
        .iks-hex.active-hex::before { border-bottom:28px solid #d4812c; }
        .iks-hex.active-hex::after { border-top:28px solid #d4812c; }
        @media (max-width:600px) { .iks-grid { grid-template-columns:1fr !important; } .iks-synergy { transform:scale(0.7); } }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(to bottom, #fff4e6, #fffcf8)',
        borderRadius: 12,
        borderTop: '10px solid #d4812c',
        border: '1px solid #eee6d8',
        padding: '40px 40px 24px',
        textAlign: 'center',
        marginBottom: 24,
        boxShadow: '0 8px 24px rgba(0,0,0,0.07)',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(212,129,44,0.12)', border: '1px solid rgba(212,129,44,0.3)', borderRadius: 100, padding: '4px 14px', marginBottom: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d4812c', display: 'inline-block' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#d4812c', letterSpacing: 2, textTransform: 'uppercase' }}>NEP 2020 Research Initiative</span>
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 48, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px', letterSpacing: -1 }}>Saraswati</h1>
        <p style={{ fontSize: 18, color: '#4a4a4a', fontWeight: 300, margin: 0 }}>The AI-Powered IKS Synergy Engine</p>
      </div>

      {/* Hexagon Visual */}
      <div className="iks-synergy" style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 8 }}>
        <div className="iks-hex inactive">STEM</div>
        <div className="iks-hex active-hex">AI BRAIN</div>
        <div className="iks-hex inactive">IKS</div>
      </div>

      {/* Problem / Vision */}
      <div style={{ display: 'flex', gap: 20, padding: '0 0 24px', textAlign: 'center' }}>
        <div style={{ flex: 1, padding: 15, background: '#f0f0f0', borderRadius: 8, fontSize: 13, color: '#1a1a1a' }}>
          <strong>THE PROBLEM:</strong> Departmental Silos &amp; Fragmented Research.
        </div>
        <div style={{ flex: 1, padding: 15, background: '#fff4e6', borderRadius: 8, fontSize: 13, border: '1px solid #d4812c', color: '#1a1a1a' }}>
          <strong>THE VISION:</strong> A Dynamic, Interdisciplinary Web of Wisdom.
        </div>
      </div>

      {/* Module Cards */}
      <div className="iks-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {modules.map((m) => (
          <div key={m.title} style={{
            padding: 24,
            borderRadius: 10,
            background: '#fff',
            border: m.dashed ? '1px dashed #d4812c' : '1px solid #eee6d8',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ fontFamily: 'Georgia, serif', color: '#d4812c', margin: '0 0 10px', fontSize: 20 }}>{m.title}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#4a4a4a', margin: 0 }}>{m.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '32px 40px', textAlign: 'center' }}>
        <button
          style={{
            background: '#d4812c',
            color: '#fff',
            padding: '14px 40px',
            border: 'none',
            fontWeight: 700,
            fontSize: 14,
            borderRadius: 6,
            cursor: 'pointer',
            letterSpacing: 1,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          LAUNCH SYNERGY ENGINE
        </button>
        <p style={{ fontStyle: 'italic', color: '#999', fontSize: 13, marginTop: 16, marginBottom: 0 }}>
          "Where ancient wisdom fuels modern innovation."<br />
          <strong style={{ color: '#bbb' }}>Compliant with UGC-IKS Guidelines</strong>
        </p>
      </div>
    </div>
  );
}
