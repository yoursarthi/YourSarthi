export default function WellBot() {
  const features = [
    { icon: 'ri-robot-2-line',        title: 'AI-Powered Conversations',    desc: 'Local LLM (Ollama) integration for private, offline, empathetic responses without sending student data to external servers.' },
    { icon: 'ri-line-chart-line',     title: 'Stress Analytics Dashboard',  desc: 'Track student stress trends over time, identify at-risk students, and measure wellness program effectiveness.' },
    { icon: 'ri-group-line',          title: 'Anonymous Peer Support',      desc: 'Moderated group chats where students can connect anonymously and share experiences safely.' },
    { icon: 'ri-calendar-check-line', title: 'Academic Calendar Sync',      desc: 'Proactive stress forecasting based on exam schedules, assignment deadlines, and campus events.' },
    { icon: 'ri-shield-check-line',   title: 'Crisis Detection & Response', desc: 'Automatic detection of distress signals with immediate crisis helpline resource integration.' },
    { icon: 'ri-code-box-line',       title: 'Easy Integration',            desc: 'Plug-and-play iFrame embed or full React/Vue component — works with any University Management System.' },
  ];

  const stats = [
    { value: '93%',  label: 'Student reported stress reduction' },
    { value: '24/7', label: 'Always available support' },
    { value: '100%', label: 'Private & anonymous' },
    { value: '0',    label: 'Data leaves your server' },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 20,
        padding: '40px 40px 36px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 28,
      }}>
        {/* decorative emoji */}
        <span style={{ position: 'absolute', right: 0, bottom: -24, fontSize: 160, opacity: 0.1, pointerEvents: 'none', lineHeight: 1 }}>🌱</span>

        {/* Coming Soon badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)', borderRadius: 100, padding: '5px 14px', marginBottom: 18 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', display: 'inline-block', boxShadow: '0 0 0 3px rgba(251,191,36,0.3)' }} />
          <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.5 }}>COMING SOON · University Wellness Suite</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.2 }}>
          🌱 Well-Bot AI<br />Mental Wellness Assistant
        </h1>
        <p style={{ opacity: 0.9, maxWidth: 560, lineHeight: 1.6, margin: 0, fontSize: 14.5 }}>
          Integrate empathetic AI-powered mental health support directly into Your Sarthi.
          100% private, 24/7 available, clinically informed responses — designed for student wellbeing.
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 28,
      }}>
        {stats.map(s => (
          <div key={s.value} style={{
            background: '#fff',
            border: '1px solid rgba(15,23,42,0.09)',
            borderRadius: 16,
            padding: '20px 16px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
          }}>
            <div style={{
              fontSize: 26,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.2,
              marginBottom: 6,
            }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features grid */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Key Features</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Designed specifically for student mental health and academic stress management</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {features.map(f => (
            <div key={f.title} style={{
              background: '#fff',
              border: '1px solid rgba(15,23,42,0.09)',
              borderRadius: 16,
              padding: '22px',
              transition: 'box-shadow 0.2s, transform 0.2s',
              boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(102,126,234,0.18)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.05)'; e.currentTarget.style.transform = ''; }}
            >
              <div style={{
                width: 46, height: 46,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(102,126,234,0.12), rgba(118,75,162,0.12))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <i className={f.icon} style={{
                  fontSize: 22,
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 6px' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Integration snippet */}
      <div style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 16, padding: 24, marginBottom: 28, boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <i className="ri-code-s-slash-line" style={{ fontSize: 18, color: '#6366f1' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Quick Integration (2 lines of code)</span>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px 20px', fontFamily: "'Monaco','Menlo',monospace", fontSize: 12.5, color: '#e2e8f0', overflowX: 'auto' }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{`<!-- Add this anywhere in your University Management System -->
<iframe src="https://your-server.com/wellbot"
        width="100%"
        height="600"
        frameborder="0">
</iframe>`}</pre>
        </div>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 12, marginBottom: 0 }}>
          <i className="ri-information-line" style={{ marginRight: 5 }} />
          Customizable height, theme, and features via URL parameters.
        </p>
      </div>

      {/* CTA */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(102,126,234,0.07), rgba(118,75,162,0.07))',
        border: '1px solid rgba(102,126,234,0.2)',
        borderRadius: 16,
        padding: '28px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🌱</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>This feature is coming soon</h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
          Well-Bot AI is currently in development and will be integrated into Your Sarthi shortly.<br />
          Contact your administrator to request early access.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff', border: 'none',
              padding: '11px 26px', borderRadius: 50,
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(102,126,234,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            onClick={() => alert('Contact wellness@university.edu or your IT admin to request early access to Well-Bot AI.')}
          >
            <i className="ri-mail-send-line" />
            Request Early Access
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <i className="ri-shield-check-line" style={{ color: '#10b981' }} />
            FERPA · GDPR · Data stays on your server
          </div>
        </div>
      </div>
    </div>
  );
}
