import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

// ── Animated neural-network canvas ────────────────────────────────────────────
function NeuralCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const NODE_COUNT = 54;
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height,
      vx:   (Math.random() - 0.5) * 0.45,
      vy:   (Math.random() - 0.5) * 0.45,
      r:    Math.random() * 2.5 + 1.2,
      glow: Math.random(),
      phase: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    let raf;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Move nodes
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });

      const LINK_DIST = 130;

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.55;
            // Pulse a color shift between cyan and indigo
            const pulse = (Math.sin(frame * 0.018 + nodes[i].phase) + 1) / 2;
            const r = Math.round(99  + pulse * 56);
            const g = Math.round(102 + pulse * 129);
            const b = Math.round(241);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((n, i) => {
        const pulse = (Math.sin(frame * 0.025 + n.phase) + 1) / 2;
        const brightness = 0.55 + pulse * 0.45;
        const radius = n.r * (1 + pulse * 0.5);

        // Outer glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius * 4);
        grad.addColorStop(0,   `rgba(139,92,246,${brightness * 0.5})`);
        grad.addColorStop(0.5, `rgba(99,102,241,${brightness * 0.18})`);
        grad.addColorStop(1,   'rgba(99,102,241,0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(192,132,252,${brightness})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ── Floating feature chips on the left panel ──────────────────────────────────
const FEATURES = [
  { icon: 'ri-brain-line',          label: 'AI Evaluation',         sub: 'Gemini-powered grading' },
  { icon: 'ri-bar-chart-2-line',    label: 'Smart Analytics',       sub: 'Real-time insights' },
  { icon: 'ri-robot-line',          label: 'Intelligent Syllabus',  sub: 'Auto-generation' },
  { icon: 'ri-shield-check-line',   label: 'Secure & Scalable',     sub: 'Role-based access' },
];

// ── Main Login component ───────────────────────────────────────────────────────
export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await api.login(email, password);
      onLogin(user);
    } catch (err) {
      toast(err.message, 'error');
    }
    setLoading(false);
  };

  const fill = (e, p) => { setEmail(e); setPassword(p); setDemoOpen(false); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>

      {/* ── Left panel ── */}
      <div style={{
        flex: '0 0 58%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #06011a 0%, #0d0730 35%, #130a3a 65%, #1a0545 100%)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Animated canvas layer */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <NeuralCanvas />
        </div>

        {/* Ambient glow blobs */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '-8%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '50%', width: 280, height: 280, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)', zIndex: 1, pointerEvents: 'none' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', padding: '44px 52px' }}>

          {/* Logo + university name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
              <svg viewBox="0 0 40 40" width="34" height="34">
                <circle cx="20" cy="20" r="18" fill="rgba(99,102,241,0.9)" />
                <text x="20" y="26" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800" fontFamily="Inter,sans-serif">YS</text>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>Your Sarthi</div>
              <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.9)', marginTop: 1 }}>AI-Powered Learning Platform</div>
            </div>
          </div>

          {/* Main hero text */}
          <div style={{ marginTop: 'auto', marginBottom: 'auto', paddingTop: 40, paddingBottom: 40 }}>
            {/* AI badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 9999, padding: '5px 14px', marginBottom: 24 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 8px #a78bfa', display: 'inline-block', animation: 'pulseDot 1.8s ease-in-out infinite' }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#c4b5fd', letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI-Powered Learning Management</span>
            </div>

            {/* Tagline */}
            <h1 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, lineHeight: 1.12, margin: '0 0 10px', color: '#ffffff', letterSpacing: '-0.02em' }}>
              Achieve Your<br />
              <span className="gradient-animate" style={{ background: 'linear-gradient(90deg, #818cf8, #c084fc, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Dreams.</span>
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(148,163,184,0.95)', lineHeight: 1.65, maxWidth: 420, margin: '0 0 36px' }}>
              The next-generation university platform — AI evaluation, intelligent syllabus design, and real-time analytics to power every learner's potential.
            </p>

            {/* Feature chips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 460 }}>
              {FEATURES.map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)', transition: 'background .2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(99,102,241,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={f.icon} style={{ fontSize: 16, color: '#a78bfa' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#e2e8f0' }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)' }}>Smart Learning · AI Evaluation · Real-time Analytics</span>
            <div style={{ display: 'flex', gap: 14 }}>
              {['ri-global-line', 'ri-phone-line', 'ri-mail-line'].map(ic => (
                <div key={ic} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <i className={ic} style={{ fontSize: 13, color: '#94a3b8' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', padding: '32px 24px', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Welcome text */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Your Journey starts here.</h2>
            <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 6 }}>Sign in to your Your Sarthi account</p>
          </div>

          {/* Demo credentials (collapsible) */}
          <div style={{ marginBottom: 22 }}>
            <button type="button" onClick={() => setDemoOpen(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#4f46e5' }}>
                <i className="ri-key-2-line" style={{ fontSize: 14 }} />Demo Credentials
              </span>
              <i className={`ri-arrow-${demoOpen ? 'up' : 'down'}-s-line`} style={{ fontSize: 16, color: '#6366f1' }} />
            </button>

            {demoOpen && (
              <div style={{ marginTop: 8, borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', overflow: 'hidden', boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
                {[
                  { role: 'Admin',     icon: 'ri-shield-user-line', color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  email: 'admin@itmuniversity.ac.in',   pass: 'admin123'   },
                  { role: 'Faculty',   icon: 'ri-user-star-line',   color: '#059669', bg: 'rgba(16,185,129,0.08)', email: 'faculty@itmuniversity.ac.in', pass: 'faculty123' },
                  { role: 'Student',   icon: 'ri-graduation-cap-line', color: '#d97706', bg: 'rgba(245,158,11,0.08)', email: 'aditya.s@itmuniversity.ac.in', pass: 'ITM2024001' },
                ].map(d => (
                  <div key={d.role} onClick={() => fill(d.email, d.pass)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(15,23,42,0.06)', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: d.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={d.icon} style={{ fontSize: 15, color: d.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{d.role}</div>
                      <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.email}</div>
                    </div>
                    <span style={{ fontSize: 10.5, color: '#6366f1', fontWeight: 600, background: 'rgba(99,102,241,0.08)', padding: '2px 8px', borderRadius: 5, flexShrink: 0 }}>Click to fill</span>
                  </div>
                ))}
                <div style={{ padding: '8px 14px', background: '#f8fafc' }}>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Student password = Student ID (e.g. ITM2024001)</p>
                </div>
              </div>
            )}
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <i className="ri-mail-line" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="your@itmuniversity.ac.in"
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>Password</label>
              </div>
              <div style={{ position: 'relative' }}>
                <i className="ri-lock-line" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 38, paddingRight: 44 }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8', fontSize: 16, display: 'flex', alignItems: 'center' }}>
                  <i className={showPass ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: '#fff', background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.45)', transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
              {loading
                ? <><i className="ri-loader-4-line spin" style={{ fontSize: 16 }} />Signing in…</>
                : <><i className="ri-login-circle-line" style={{ fontSize: 16 }} />Sign In to Sarthi</>
              }
            </button>
          </form>

          {/* Bottom note */}
          <p style={{ fontSize: 11.5, color: '#94a3b8', textAlign: 'center', marginTop: 28, lineHeight: 1.7 }}>
            By signing in you agree to Your Sarthi's<br />
            <span style={{ color: '#6366f1', cursor: 'pointer', fontWeight: 500 }}>Terms of Use</span> &amp; <span style={{ color: '#6366f1', cursor: 'pointer', fontWeight: 500 }}>Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
