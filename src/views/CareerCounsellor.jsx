import { useState } from 'react';

const HOBBIES = [
  { id: 'coding',    label: 'Coding',      icon: 'ri-code-line' },
  { id: 'drawing',   label: 'Drawing',     icon: 'ri-palette-line' },
  { id: 'writing',   label: 'Writing',     icon: 'ri-edit-2-line' },
  { id: 'sports',    label: 'Sports',      icon: 'ri-football-line' },
  { id: 'music',     label: 'Music',       icon: 'ri-music-2-line' },
  { id: 'gaming',    label: 'Gaming',      icon: 'ri-gamepad-line' },
  { id: 'math',      label: 'Mathematics', icon: 'ri-calculator-line' },
  { id: 'business',  label: 'Business',    icon: 'ri-briefcase-line' },
  { id: 'design',    label: 'Design',      icon: 'ri-layout-line' },
  { id: 'leadership',label: 'Leadership',  icon: 'ri-user-star-line' },
  { id: 'reading',   label: 'Reading',     icon: 'ri-book-read-line' },
  { id: 'teaching',  label: 'Teaching',    icon: 'ri-teach-line' },
];

const CAREERS = [
  { title: 'Software Developer',    skills: ['Programming', 'DSA', 'Problem Solving'], cgpaMin: 7.0, salary: '₹6–25 LPA',  growth: 'High',     match: ['coding', 'math'] },
  { title: 'Data Scientist',        skills: ['Statistics', 'Python', 'ML'],            cgpaMin: 7.5, salary: '₹8–30 LPA',  growth: 'Very High',match: ['coding', 'math'] },
  { title: 'UI/UX Designer',        skills: ['Design Thinking', 'Figma', 'Research'],  cgpaMin: 6.5, salary: '₹5–20 LPA',  growth: 'High',     match: ['drawing', 'design'] },
  { title: 'Management Consultant', skills: ['Strategy', 'Analytics', 'Comm.'],        cgpaMin: 7.5, salary: '₹10–35 LPA', growth: 'Very High',match: ['business', 'leadership'] },
  { title: 'AI/ML Engineer',        skills: ['Deep Learning', 'Python', 'TensorFlow'], cgpaMin: 8.0, salary: '₹10–40 LPA', growth: 'Very High',match: ['coding', 'math'] },
  { title: 'Content Writer',        skills: ['Writing', 'Research', 'Comm.'],          cgpaMin: 6.0, salary: '₹3–12 LPA',  growth: 'Moderate', match: ['writing', 'reading'] },
  { title: 'Entrepreneur',          skills: ['Leadership', 'Innovation', 'Risk Mgmt'], cgpaMin: 6.0, salary: 'Variable',    growth: 'Variable', match: ['business', 'leadership'] },
  { title: 'Teacher / Professor',   skills: ['Subject Expertise', 'Comm.', 'Patience'],cgpaMin: 6.5, salary: '₹4–15 LPA',  growth: 'Stable',   match: ['teaching', 'reading'] },
];

const GROWTH_COLOR = { 'Very High': '#10b981', High: '#6366f1', Moderate: '#f59e0b', Stable: '#94a3b8', Variable: '#f97316' };

export default function CareerCounsellor() {
  const [mode, setMode]           = useState('select');
  const [selectedHobbies, setSelectedHobbies] = useState([]);
  const [cgpa, setCgpa]           = useState('');
  const [results, setResults]     = useState([]);
  const [chat, setChat]           = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [apiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');

  const toggleHobby = (id) => setSelectedHobbies(p => p.includes(id) ? p.filter(h => h !== id) : [...p, id]);

  const runAssessment = () => {
    const cgpaNum = parseFloat(cgpa) || 0;
    const scored = CAREERS.map(c => {
      const hobbyMatch = c.match.filter(m => selectedHobbies.includes(m)).length;
      const cgpaOk = cgpaNum >= c.cgpaMin;
      return { ...c, score: hobbyMatch * 30 + (cgpaOk ? 40 : 0) + Math.random() * 10, hobbyMatch, cgpaOk };
    }).sort((a, b) => b.score - a.score);
    setResults(scored.slice(0, 5));
    setMode('results');
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChat(p => [...p, { role: 'user', text: msg }]);
    setChatLoading(true);
    if (!apiKey) {
      setChat(p => [...p, { role: 'bot', text: 'Please set your Gemini API key in the AI Evaluation page first.' }]);
      setChatLoading(false);
      return;
    }
    try {
      const history = chat.map(c => ({ role: c.role === 'user' ? 'user' : 'model', parts: [{ text: c.text }] }));
      history.push({ role: 'user', parts: [{ text: `You are Your Sarthi Platform's AI Career Counsellor. A student asks: ${msg}. Give helpful, specific, practical advice. Keep response under 200 words.` }] });
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: history, generationConfig: { temperature: 0.7, maxOutputTokens: 400 } }),
      });
      const d = await res.json();
      const reply = d.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || 'Sorry, could not respond right now.';
      setChat(p => [...p, { role: 'bot', text: reply }]);
    } catch (e) {
      setChat(p => [...p, { role: 'bot', text: `Error: ${e.message}` }]);
    }
    setChatLoading(false);
  };

  return (
    <div className="page-fade" style={{ maxWidth: 860, margin: '0 auto' }}>
      {mode === 'select' && (
        <div>
          {/* Hero header */}
          <div style={{
            textAlign: 'center', padding: '32px 24px 28px',
            background: 'linear-gradient(135deg,rgba(99,102,241,0.08) 0%,rgba(245,158,11,0.05) 100%)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 16, marginBottom: 24,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(99,102,241,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.07) 0%, transparent 50%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <i className="ri-compass-3-line" style={{ fontSize: 26, color: '#fff' }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Sarthi Career Guidance</h2>
              <p style={{ fontSize: 14, color: '#64748b' }}>Discover your ideal career path based on interests and academic performance</p>
            </div>
          </div>

          {/* Feature cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div
              onClick={() => setMode('assessment')}
              style={{
                background: 'linear-gradient(135deg,rgba(99,102,241,0.08) 0%,rgba(139,92,246,0.05) 100%)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 14, padding: '24px', cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(99,102,241,0.2)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
            >
              <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <i className="ri-bar-chart-grouped-line" style={{ fontSize: 20, color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Career Assessment</h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>
                Take a quick assessment based on your hobbies and CGPA to find your best career matches.
              </p>
              <button className="btn btn-primary" style={{ gap: 6, fontSize: 13 }}>
                <i className="ri-play-line" />Start Assessment
              </button>
            </div>

            <div
              onClick={() => setMode('chat')}
              style={{
                background: 'linear-gradient(135deg,rgba(245,158,11,0.07) 0%,rgba(239,68,68,0.05) 100%)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 14, padding: '24px', cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(245,158,11,0.15)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.2)'; }}
            >
              <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <i className="ri-robot-2-line" style={{ fontSize: 20, color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>AI Career Chat</h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>
                Chat with our AI counsellor for personalized career guidance, skill advice, and more.
              </p>
              <button style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i className="ri-chat-3-line" />Start Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'assessment' && (
        <div className="dark-card" style={{ padding: 24 }}>
          <button onClick={() => setMode('select')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 18 }}>
            <i className="ri-arrow-left-line" />Back
          </button>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Career Assessment</h3>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 10 }}>Select your hobbies &amp; interests:</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {HOBBIES.map(h => {
                const sel = selectedHobbies.includes(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHobby(h.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 9999, fontSize: 12.5, fontWeight: 500,
                      background: sel ? 'rgba(99,102,241,0.1)' : '#f1f5f9',
                      color: sel ? '#4f46e5' : '#64748b',
                      border: `1px solid ${sel ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.08)'}`,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      display: 'flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}
                  >
                    <i className={h.icon} style={{ fontSize: 13 }} />{h.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Your current CGPA:</label>
            <input type="number" min={0} max={10} step={0.1} className="form-input" style={{ maxWidth: 160 }} value={cgpa} onChange={e => setCgpa(e.target.value)} placeholder="e.g. 7.5" />
          </div>
          <button onClick={runAssessment} disabled={selectedHobbies.length === 0} className="btn btn-primary" style={{ gap: 6 }}>
            <i className="ri-search-line" />View Career Matches
          </button>
        </div>
      )}

      {mode === 'results' && (
        <div>
          <button onClick={() => setMode('assessment')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 18 }}>
            <i className="ri-arrow-left-line" />Retake Assessment
          </button>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Your Top Career Matches</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map((c, i) => (
              <div key={c.title} className="dark-card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? 'rgba(245,158,11,0.12)' : '#f8fafc',
                    border: `1.5px solid ${i === 0 ? 'rgba(245,158,11,0.3)' : 'rgba(15,23,42,0.08)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800,
                    color: i === 0 ? '#fcd34d' : '#94a3b8',
                  }}>
                    {i + 1}
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', flex: 1 }}>{c.title}</h4>
                  <span style={{ fontSize: 12, fontWeight: 600, color: GROWTH_COLOR[c.growth] || '#94a3b8' }}>
                    {c.growth} Growth
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {c.skills.map(s => (
                    <span key={s} style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 11, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>{s}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}><i className="ri-money-rupee-circle-line" style={{ marginRight: 4 }} />{c.salary}</span>
                  <span style={{ color: '#64748b' }}>Min CGPA: {c.cgpaMin}</span>
                  <span style={{ color: c.cgpaOk ? '#10b981' : '#f87171' }}>
                    <i className={`${c.cgpaOk ? 'ri-check-line' : 'ri-alert-line'}`} style={{ marginRight: 3 }} />
                    {c.cgpaOk ? 'CGPA ok' : 'Improve CGPA'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button onClick={() => setMode('chat')} className="btn btn-primary" style={{ gap: 6 }}>
              <i className="ri-chat-3-line" />Discuss with AI Counsellor
            </button>
          </div>
        </div>
      )}

      {mode === 'chat' && (
        <div className="dark-card" style={{ display: 'flex', flexDirection: 'column', height: 520 }}>
          {/* Chat header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setMode('select')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, fontSize: 16 }}>
              <i className="ri-arrow-left-line" />
            </button>
            <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>AI</div>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', margin: 0 }}>Sarthi Career Counsellor</p>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Powered by Gemini AI</p>
            </div>
          </div>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chat.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 40, color: '#475569', fontSize: 13 }}>
                <i className="ri-chat-smile-3-line" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                Hello! Ask me anything about careers, skills, or your courses.
              </div>
            )}
            {chat.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '9px 14px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: m.role === 'user' ? '#6366f1' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : '#0f172a',
                  fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '9px 14px', borderRadius: '18px 18px 18px 4px', background: '#f1f5f9', color: '#64748b', fontSize: 13 }}>
                  Thinking…
                </div>
              </div>
            )}
          </div>
          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(15,23,42,0.08)', display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Ask about careers, skills, placements…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !chatLoading && sendChat()}
            />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="btn btn-primary" style={{ padding: '8px 16px', flexShrink: 0 }}>
              <i className="ri-send-plane-line" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
