import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../api/client';

const TABS = [
  { id: 'chat',       label: 'Chat',          icon: 'ri-message-3-line' },
  { id: 'quiz',       label: 'Quiz',           icon: 'ri-questionnaire-line' },
  { id: 'flashcards', label: 'Flashcards',     icon: 'ri-layout-cards-line' },
  { id: 'viva',       label: 'Viva Prep',      icon: 'ri-mic-line' },
  { id: 'notes',      label: 'Study Notes',    icon: 'ri-file-text-line' },
  { id: 'materials',  label: 'Materials',      icon: 'ri-folder-upload-line' },
];

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMd(text) {
  if (!text) return '';
  return text
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre style="background:#f1f5f9;border-radius:8px;padding:12px 14px;font-size:12.5px;overflow-x:auto;margin:8px 0;border:1px solid rgba(15,23,42,0.06)"><code>$1</code></pre>')
    .replace(/`([^`\n]+)`/g, '<code style="background:#f1f5f9;padding:1px 6px;border-radius:4px;font-size:0.85em;font-family:monospace;color:#1d4ed8">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<strong style="font-size:1.05em;display:block;margin:12px 0 5px;color:#0f172a">$1</strong>')
    .replace(/^## (.+)$/gm, '<strong style="font-size:1.08em;display:block;margin:14px 0 6px;color:#0f172a">$1</strong>')
    .replace(/^# (.+)$/gm, '<strong style="font-size:1.12em;display:block;margin:16px 0 7px;color:#0f172a">$1</strong>')
    .replace(/^\d+\. (.+)$/gm, '<div style="display:flex;gap:8px;margin:3px 0;padding-left:4px"><span style="color:#6366f1;font-weight:700;flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;gap:8px;margin:3px 0;padding-left:4px"><span style="color:#94a3b8;flex-shrink:0">–</span><span>$1</span></div>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    ready:      { color: '#047857', bg: 'rgba(16,185,129,0.1)',  label: 'Ready' },
    processing: { color: '#b45309', bg: 'rgba(245,158,11,0.1)', label: 'Processing…' },
    embedding:  { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', label: 'Embedding…' },
    chunking:   { color: '#0369a1', bg: 'rgba(14,165,233,0.1)', label: 'Chunking…' },
    failed:     { color: '#b91c1c', bg: 'rgba(239,68,68,0.1)',  label: 'Failed' },
    unknown:    { color: '#64748b', bg: 'rgba(15,23,42,0.06)',  label: 'Unknown' },
  };
  const s = map[status] || map.unknown;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function MsgBubble({ msg, isStreaming }) {
  const [showSources, setShowSources] = useState(false);
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: isUser ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
        }}>
          <i className={isUser ? 'ri-user-line' : 'ri-sparkling-2-line'} style={{ color: '#fff' }} />
        </div>
        <div style={{
          maxWidth: '78%', padding: '11px 15px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#fff',
          border: isUser ? 'none' : '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 1px 6px rgba(15,23,42,0.07)',
          color: isUser ? '#fff' : '#0f172a',
          fontSize: 13.5, lineHeight: 1.65,
        }}>
          {isUser
            ? <span>{msg.content}</span>
            : <span dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }} />}
          {isStreaming && msg.role === 'assistant' && (
            <span style={{ display: 'inline-block', width: 6, height: 6, background: '#0ea5e9', borderRadius: '50%', marginLeft: 6, animation: 'pulse 1s infinite' }} />
          )}
        </div>
      </div>

      {!isUser && msg.sources && msg.sources.length > 0 && (
        <div style={{ marginTop: 6, maxWidth: '78%', marginLeft: 38 }}>
          <button onClick={() => setShowSources(v => !v)} style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ri-book-open-line" />
            {showSources ? 'Hide' : 'View'} {msg.sources.length} source{msg.sources.length !== 1 ? 's' : ''}
          </button>
          {showSources && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
              {msg.sources.map((s, i) => (
                <div key={i} style={{ fontSize: 11.5, color: '#64748b', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 8, padding: '7px 11px', lineHeight: 1.5 }}>
                  <span style={{ color: '#6366f1', fontWeight: 600 }}>Excerpt {i + 1}</span>
                  {s.score != null && <span style={{ color: '#94a3b8', marginLeft: 6 }}>{Math.round(s.score * 100)}% relevance</span>}
                  <p style={{ margin: '3px 0 0', color: '#475569', fontStyle: 'italic', lineHeight: 1.5 }}>{s.excerpt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Input styles ─────────────────────────────────────────────────────────────
const inp = {
  padding: '9px 13px', background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.12)', borderRadius: 8,
  fontSize: 13, color: '#0f172a', outline: 'none',
  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function AITutor({ courseId, courseName, user }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [geminiOk, setGeminiOk]   = useState(null);

  // Chat
  const [sessionId, setSessionId]   = useState(null);
  const [messages, setMessages]     = useState([]);
  const [inputText, setInputText]   = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Materials
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef  = useRef(null);
  const pollTimers    = useRef({});

  // Quiz
  const [quizTopic, setQuizTopic]       = useState('');
  const [quizCount, setQuizCount]       = useState(5);
  const [quiz, setQuiz]                 = useState([]);
  const [quizLoading, setQuizLoading]   = useState(false);
  const [quizAnswers, setQuizAnswers]   = useState({});
  const [quizRevealed, setQuizRevealed] = useState(false);

  // Flashcards
  const [flashTopic, setFlashTopic]     = useState('');
  const [flashCount, setFlashCount]     = useState(8);
  const [flashcards, setFlashcards]     = useState([]);
  const [flashLoading, setFlashLoading] = useState(false);
  const [flashIdx, setFlashIdx]         = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);

  // Viva
  const [vivaTopic, setVivaTopic]       = useState('');
  const [vivaCount, setVivaCount]       = useState(5);
  const [vivaQs, setVivaQs]             = useState([]);
  const [vivaLoading, setVivaLoading]   = useState(false);
  const [vivaOpenIdx, setVivaOpenIdx]   = useState(null);

  // Notes / Summary
  const [notesTopic, setNotesTopic]     = useState('');
  const [notes, setNotes]               = useState('');
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    checkHealth();
    loadDocuments();
    initSession();
    return () => Object.values(pollTimers.current).forEach(clearInterval);
  }, [courseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function checkHealth() {
    try {
      const data = await api.aiTutor.health();
      setGeminiOk(data.gemini === true);
    } catch { setGeminiOk(false); }
  }

  async function loadDocuments() {
    try {
      const docs = await api.aiTutor.documents(courseId);
      setDocuments(docs);
      docs.filter(d => d.status !== 'ready' && d.status !== 'failed').forEach(d => startPolling(d.id));
    } catch {}
  }

  async function initSession() {
    try {
      const sessions = await api.aiTutor.sessions(courseId);
      if (sessions.length > 0) {
        const s = sessions[0];
        setSessionId(s.id);
        const msgs = await api.aiTutor.messages(s.id);
        setMessages(msgs);
      } else {
        const s = await api.aiTutor.createSession(courseId, `${courseName || 'Course'} Chat`);
        setSessionId(s.id);
        setMessages([]);
      }
    } catch {}
  }

  function startPolling(docId) {
    if (pollTimers.current[docId]) return;
    const timer = setInterval(async () => {
      try {
        const s = await api.aiTutor.docStatus(docId);
        setDocuments(prev => prev.map(d =>
          d.id === docId ? { ...d, status: s.status, chunkCount: s.chunks ?? d.chunkCount } : d
        ));
        if (!['processing', 'embedding', 'chunking', 'extracting'].includes(s.status)) {
          clearInterval(pollTimers.current[docId]);
          delete pollTimers.current[docId];
        }
      } catch {
        clearInterval(pollTimers.current[docId]);
        delete pollTimers.current[docId];
      }
    }, 2500);
    pollTimers.current[docId] = timer;
  }

  const handleFileUpload = async (files) => {
    if (!files?.length) return;
    const file = files[0];
    const ext  = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'pptx', 'txt'].includes(ext)) {
      alert('Only PDF, DOCX, PPTX, and TXT files are supported.');
      return;
    }
    setUploading(true);
    try {
      const fd  = new FormData();
      fd.append('file', file);
      const doc = await api.aiTutor.upload(courseId, fd);
      if (doc.error) throw new Error(doc.error);
      setDocuments(prev => [{ id: doc.id, fileName: file.name, status: 'processing', chunkCount: 0, createdAt: new Date().toISOString() }, ...prev]);
      startPolling(doc.id);
    } catch (e) { alert(e.message || 'Upload failed'); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Remove this document from the AI knowledge base?')) return;
    try {
      await api.aiTutor.deleteDoc(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch {}
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isStreaming || !sessionId) return;
    const question  = inputText.trim();
    setInputText('');
    inputRef.current?.focus();

    const tempUser = `u_${Date.now()}`;
    const tempAsst = `a_${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: tempUser, role: 'user',      content: question, sources: [] },
      { id: tempAsst, role: 'assistant', content: '',        sources: [] },
    ]);
    setIsStreaming(true);

    try {
      const stored = JSON.parse(localStorage.getItem('itm_user') || 'null');
      const res = await fetch(`/api/ai-tutor/chat/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id':   stored?.id   || '',
          'x-user-role': stored?.role || '',
          'x-user-name': stored?.name || '',
        },
        body: JSON.stringify({ question, courseId }),
      });
      if (!res.ok) throw new Error('Chat request failed');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') {
              setMessages(prev => prev.map(m =>
                m.id === tempAsst ? { ...m, content: m.content + data.text } : m
              ));
            } else if (data.type === 'done') {
              setMessages(prev => prev.map(m =>
                m.id === tempAsst ? { ...m, id: data.id, sources: data.sources || [] } : m
              ));
            } else if (data.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === tempAsst ? { ...m, content: `Error: ${data.message}` } : m
              ));
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === tempAsst ? { ...m, content: `Error: ${err.message}` } : m
      ));
    }
    setIsStreaming(false);
  };

  const newChat = async () => {
    try {
      const s = await api.aiTutor.createSession(courseId, `${courseName || 'Course'} Chat`);
      setSessionId(s.id);
      setMessages([]);
    } catch {}
  };

  const generateQuiz = async () => {
    if (!quizTopic.trim()) return;
    setQuizLoading(true); setQuiz([]); setQuizAnswers({}); setQuizRevealed(false);
    try {
      const { quiz: q } = await api.aiTutor.quiz(courseId, quizTopic, quizCount);
      setQuiz(q || []);
    } catch {}
    setQuizLoading(false);
  };

  const generateFlashcards = async () => {
    if (!flashTopic.trim()) return;
    setFlashLoading(true); setFlashcards([]); setFlashIdx(0); setFlashFlipped(false);
    try {
      const { flashcards: f } = await api.aiTutor.flashcards(courseId, flashTopic, flashCount);
      setFlashcards(f || []);
    } catch {}
    setFlashLoading(false);
  };

  const generateViva = async () => {
    if (!vivaTopic.trim()) return;
    setVivaLoading(true); setVivaQs([]); setVivaOpenIdx(null);
    try {
      const { questions } = await api.aiTutor.viva(courseId, vivaTopic, vivaCount);
      setVivaQs(questions || []);
    } catch {}
    setVivaLoading(false);
  };

  const generateNotes = async () => {
    if (!notesTopic.trim()) return;
    setNotesLoading(true); setNotes('');
    try {
      const { summary } = await api.aiTutor.summary(courseId, notesTopic);
      setNotes(summary || '');
    } catch {}
    setNotesLoading(false);
  };

  const hasReadyDocs = documents.some(d => d.status === 'ready');

  // ─── No course selected ───────────────────────────────────────────────────
  if (!courseId) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '64px 20px' }}>
        <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
          <i className="ri-sparkling-2-line" style={{ color: '#fff', fontSize: 34 }} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>AI Course Tutor</h3>
        <p style={{ fontSize: 13.5, color: '#64748b', marginBottom: 20, maxWidth: 380, margin: '0 auto 20px' }}>
          Open a course from the Courses page and click <strong>AI Tutor</strong> to start learning.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569', background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 8, padding: '8px 14px' }}>
          <i className="ri-google-fill" style={{ color: '#4285f4' }} />
          Powered by Gemini AI + local vector retrieval
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#0f172a' }}>

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 3px 10px rgba(99,102,241,0.25)' }}>
          <i className="ri-sparkling-2-line" style={{ color: '#fff', fontSize: 21 }} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>AI Tutor</h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: '1px 0 0' }}>{courseName}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, padding: '5px 11px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: geminiOk === true ? '#10b981' : geminiOk === false ? '#ef4444' : '#f59e0b' }} />
          <span style={{ fontSize: 11.5, color: '#475569', fontWeight: 500 }}>
            {geminiOk === true ? 'Gemini Online' : geminiOk === false ? 'Gemini Offline' : 'Checking…'}
          </span>
        </div>
      </div>

      {geminiOk === false && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 12, fontSize: 12.5, color: '#b91c1c' }}>
          <i className="ri-error-warning-line" />
          <span>Gemini API is not responding. Check that <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: 3 }}>GEMINI_API_KEY</code> is set in your server <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: 3 }}>.env</code> file.</span>
        </div>
      )}

      {!hasReadyDocs && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 8, marginBottom: 12, fontSize: 12.5, color: '#0369a1' }}>
          <i className="ri-information-line" />
          <span>Upload course materials in the <strong>Materials</strong> tab to enable AI chat, quiz, flashcards, and more.</span>
        </div>
      )}

      {/* ─── Tabs ─── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', borderBottom: '1px solid rgba(15,23,42,0.08)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', transition: 'all 0.15s',
              background: activeTab === t.id ? '#fff' : 'transparent',
              color: activeTab === t.id ? '#6366f1' : '#64748b',
              borderBottom: activeTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
            }}
          >
            <i className={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── CHAT ─── */}
      {activeTab === 'chat' && (
        <div>
          <div style={{ height: 420, overflowY: 'auto', padding: '14px 16px', marginBottom: 12, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 14, background: '#f8fafc' }}>
            {messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: 10 }}>
                <i className="ri-sparkling-2-line" style={{ fontSize: 48, color: '#c7d2fe', opacity: 0.7 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#64748b', margin: 0 }}>Ask anything about {courseName}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, textAlign: 'center' }}>
                  Answers are grounded in your uploaded course materials — no hallucinations.
                </p>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <MsgBubble key={m.id || i} msg={m} isStreaming={isStreaming && i === messages.length - 1} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              style={{ ...inp, flex: 1 }}
              placeholder={hasReadyDocs ? 'Ask a question about the course…' : 'Upload materials first to enable chat'}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              disabled={isStreaming || !hasReadyDocs || !sessionId}
            />
            <button onClick={sendMessage} disabled={isStreaming || !inputText.trim() || !hasReadyDocs || !sessionId} className="btn btn-primary" style={{ padding: '9px 16px', gap: 6 }}>
              {isStreaming ? <i className="ri-loader-4-line spin" /> : <i className="ri-send-plane-fill" />}
            </button>
            <button onClick={newChat} title="New conversation" className="btn btn-ghost" style={{ padding: '9px 12px' }}>
              <i className="ri-add-line" />
            </button>
          </div>
        </div>
      )}

      {/* ─── QUIZ ─── */}
      {activeTab === 'quiz' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <input style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="Topic (e.g. Binary Trees, Newton's Laws)…" value={quizTopic} onChange={e => setQuizTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateQuiz()} />
            <select style={{ ...inp, width: 88 }} value={quizCount} onChange={e => setQuizCount(+e.target.value)}>
              {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n} Qs</option>)}
            </select>
            <button onClick={generateQuiz} disabled={quizLoading || !quizTopic.trim() || !hasReadyDocs} className="btn btn-primary" style={{ gap: 6, whiteSpace: 'nowrap' }}>
              {quizLoading ? <><i className="ri-loader-4-line spin" />Generating…</> : <><i className="ri-questionnaire-line" />Generate Quiz</>}
            </button>
          </div>

          {quiz.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{quiz.length} questions from course material</span>
                {quizRevealed && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1' }}>
                    Score: {quiz.filter((q, i) => quizAnswers[i] === q.answer).length} / {quiz.length}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
                {quiz.map((q, i) => {
                  const userAns = quizAnswers[i];
                  return (
                    <div key={i} style={{ background: '#fff', border: `1px solid ${quizRevealed && userAns && userAns !== q.answer ? 'rgba(239,68,68,0.3)' : quizRevealed && userAns === q.answer ? 'rgba(16,185,129,0.3)' : 'rgba(15,23,42,0.08)'}`, borderRadius: 10, padding: '13px 15px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 10px' }}>Q{i + 1}. {q.question}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(q.options || []).map((opt, oi) => {
                          const letter = 'ABCD'[oi];
                          const isCorrect  = letter === q.answer;
                          const isSelected = userAns === letter;
                          let bg = '#f8fafc', color = '#475569', border = 'rgba(15,23,42,0.08)';
                          if (quizRevealed) {
                            if (isCorrect)       { bg = 'rgba(16,185,129,0.08)'; color = '#047857'; border = 'rgba(16,185,129,0.3)'; }
                            else if (isSelected) { bg = 'rgba(239,68,68,0.08)';  color = '#b91c1c'; border = 'rgba(239,68,68,0.3)'; }
                          } else if (isSelected) {
                            bg = 'rgba(99,102,241,0.08)'; color = '#4f46e5'; border = 'rgba(99,102,241,0.3)';
                          }
                          return (
                            <button key={oi} disabled={quizRevealed} onClick={() => setQuizAnswers(prev => ({ ...prev, [i]: letter }))}
                              style={{ padding: '7px 12px', borderRadius: 7, fontSize: 13, textAlign: 'left', background: bg, color, border: `1px solid ${border}`, cursor: quizRevealed ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', width: '100%', transition: 'all 0.15s' }}>
                              <span style={{ fontWeight: 700, marginRight: 8 }}>{letter})</span>
                              {opt.replace(/^[A-D]\)\s*/, '')}
                              {quizRevealed && isCorrect && <i className="ri-check-line" style={{ marginLeft: 8, color: '#047857' }} />}
                            </button>
                          );
                        })}
                      </div>
                      {quizRevealed && q.explanation && (
                        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#475569', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 6, padding: '8px 11px', lineHeight: 1.55 }}>
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {!quizRevealed
                ? <button onClick={() => setQuizRevealed(true)} className="btn btn-primary" style={{ marginTop: 14, width: '100%', gap: 6 }}><i className="ri-check-double-line" />Submit & Reveal Answers</button>
                : <button onClick={() => { setQuiz([]); setQuizRevealed(false); setQuizAnswers({}); }} className="btn btn-ghost" style={{ marginTop: 10, width: '100%', gap: 6 }}><i className="ri-restart-line" />New Quiz</button>
              }
            </>
          )}
          {quiz.length === 0 && !quizLoading && !hasReadyDocs && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
              <i className="ri-folder-upload-line" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
              <p style={{ fontSize: 13 }}>Upload course materials first to generate a quiz.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── FLASHCARDS ─── */}
      {activeTab === 'flashcards' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <input style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="Topic for flashcards…" value={flashTopic} onChange={e => setFlashTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateFlashcards()} />
            <select style={{ ...inp, width: 88 }} value={flashCount} onChange={e => setFlashCount(+e.target.value)}>
              {[5, 8, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button onClick={generateFlashcards} disabled={flashLoading || !flashTopic.trim() || !hasReadyDocs} className="btn btn-primary" style={{ gap: 6, whiteSpace: 'nowrap' }}>
              {flashLoading ? <><i className="ri-loader-4-line spin" />Generating…</> : <><i className="ri-layout-cards-line" />Generate</>}
            </button>
          </div>

          {flashcards.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Card {flashIdx + 1} of {flashcards.length}</span>
                <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Click card to flip</span>
              </div>
              <div onClick={() => setFlashFlipped(v => !v)} style={{ height: 220, cursor: 'pointer', perspective: 1000, marginBottom: 16 }}>
                <div style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 0.45s ease', transform: flashFlipped ? 'rotateY(180deg)' : 'none' }}>
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 32px', textAlign: 'center', boxShadow: '0 4px 20px rgba(99,102,241,0.25)' }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>Question</span>
                      <p style={{ fontSize: 17, fontWeight: 600, color: '#fff', lineHeight: 1.5, margin: 0 }}>{flashcards[flashIdx]?.front}</p>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: '#fff', border: '2px solid rgba(99,102,241,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 32px', textAlign: 'center' }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>Answer</span>
                      <p style={{ fontSize: 15, color: '#0f172a', lineHeight: 1.65, margin: 0 }}>{flashcards[flashIdx]?.back}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
                <button onClick={() => { setFlashIdx(i => Math.max(0, i - 1)); setFlashFlipped(false); }} disabled={flashIdx === 0} className="btn btn-ghost" style={{ gap: 5 }}><i className="ri-arrow-left-line" />Prev</button>
                <button onClick={() => { setFlashIdx(i => Math.min(flashcards.length - 1, i + 1)); setFlashFlipped(false); }} disabled={flashIdx === flashcards.length - 1} className="btn btn-ghost" style={{ gap: 5 }}>Next<i className="ri-arrow-right-line" /></button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
                {flashcards.map((_, i) => (
                  <div key={i} onClick={() => { setFlashIdx(i); setFlashFlipped(false); }}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: i === flashIdx ? '#6366f1' : '#e2e8f0', cursor: 'pointer', transition: 'background 0.2s' }} />
                ))}
              </div>
            </div>
          )}
          {flashcards.length === 0 && !flashLoading && !hasReadyDocs && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
              <i className="ri-folder-upload-line" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
              <p style={{ fontSize: 13 }}>Upload course materials first to generate flashcards.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── VIVA ─── */}
      {activeTab === 'viva' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <input style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="Topic for viva prep (e.g. Sorting Algorithms)…" value={vivaTopic} onChange={e => setVivaTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateViva()} />
            <select style={{ ...inp, width: 88 }} value={vivaCount} onChange={e => setVivaCount(+e.target.value)}>
              {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n} Qs</option>)}
            </select>
            <button onClick={generateViva} disabled={vivaLoading || !vivaTopic.trim() || !hasReadyDocs} className="btn btn-primary" style={{ gap: 6, whiteSpace: 'nowrap' }}>
              {vivaLoading ? <><i className="ri-loader-4-line spin" />Generating…</> : <><i className="ri-mic-line" />Generate Viva Qs</>}
            </button>
          </div>

          {vivaQs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vivaQs.map((q, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                  <button onClick={() => setVivaOpenIdx(vivaOpenIdx === i ? null : i)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textAlign: 'left', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: q.difficulty === 'hard' ? 'rgba(239,68,68,0.1)' : q.difficulty === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: q.difficulty === 'hard' ? '#b91c1c' : q.difficulty === 'medium' ? '#92400e' : '#047857', flexShrink: 0 }}>
                        {(q.difficulty || 'medium').charAt(0).toUpperCase() + (q.difficulty || 'medium').slice(1)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Q{i + 1}. {q.question}</span>
                    </div>
                    <i className={`ri-arrow-${vivaOpenIdx === i ? 'up' : 'down'}-s-line`} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  </button>
                  {vivaOpenIdx === i && (
                    <div style={{ padding: '10px 15px 14px', borderTop: '1px solid rgba(15,23,42,0.06)', background: 'rgba(99,102,241,0.03)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Model Answer</p>
                      <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, margin: 0 }}>{q.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {vivaQs.length === 0 && !vivaLoading && !hasReadyDocs && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
              <i className="ri-mic-line" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
              <p style={{ fontSize: 13 }}>Upload course materials first to generate viva questions.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── STUDY NOTES ─── */}
      {activeTab === 'notes' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <input style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="Topic to summarize (e.g. Chapter 3 — Memory Management)…" value={notesTopic} onChange={e => setNotesTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateNotes()} />
            <button onClick={generateNotes} disabled={notesLoading || !notesTopic.trim() || !hasReadyDocs} className="btn btn-primary" style={{ gap: 6, whiteSpace: 'nowrap' }}>
              {notesLoading ? <><i className="ri-loader-4-line spin" />Generating…</> : <><i className="ri-file-text-line" />Generate Notes</>}
            </button>
          </div>

          {notes && (
            <div style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: '18px 20px', maxHeight: 560, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Study Notes — {notesTopic}</span>
                <button onClick={() => navigator.clipboard?.writeText(notes)} className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px', gap: 5 }}>
                  <i className="ri-clipboard-line" />Copy
                </button>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.75, color: '#0f172a' }} dangerouslySetInnerHTML={{ __html: renderMd(notes) }} />
            </div>
          )}

          {!notes && !notesLoading && !hasReadyDocs && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
              <i className="ri-file-text-line" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
              <p style={{ fontSize: 13 }}>Upload course materials first to generate study notes.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── MATERIALS ─── */}
      {activeTab === 'materials' && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files); }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? '#6366f1' : 'rgba(99,102,241,0.25)'}`, borderRadius: 14, background: dragOver ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.02)', padding: '32px 24px', textAlign: 'center', cursor: uploading ? 'wait' : 'pointer', transition: 'all 0.2s', marginBottom: 18 }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx,.txt" style={{ display: 'none' }} onChange={e => handleFileUpload(e.target.files)} />
            {uploading ? (
              <div>
                <i className="ri-loader-4-line spin" style={{ fontSize: 32, color: '#6366f1', display: 'block', marginBottom: 10 }} />
                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#475569', margin: 0 }}>Uploading & Processing…</p>
              </div>
            ) : (
              <div>
                <i className="ri-upload-cloud-2-line" style={{ fontSize: 36, color: dragOver ? '#6366f1' : '#94a3b8', display: 'block', marginBottom: 10 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: '0 0 5px' }}>{dragOver ? 'Drop to upload' : 'Drop a file or click to browse'}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px' }}>PDF, DOCX, PPTX, TXT · Max 50 MB</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 6, padding: '4px 10px' }}>
                  <i className="ri-google-fill" style={{ color: '#4285f4' }} />
                  Gemini embeddings will index the content
                </div>
              </div>
            )}
          </div>

          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <i className="ri-file-add-line" style={{ fontSize: 32, color: '#cbd5e1', display: 'block', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>No documents yet. Upload lecture notes, textbooks, or slides to begin.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documents.map(doc => {
                const iconMap  = { pdf: 'ri-file-pdf-line', txt: 'ri-file-text-line', docx: 'ri-file-word-line', pptx: 'ri-file-ppt-line' };
                const colorMap = { pdf: '#ef4444', txt: '#64748b', docx: '#3b82f6', pptx: '#f59e0b' };
                return (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 10, padding: '11px 14px' }}>
                    <i className={iconMap[doc.fileType] || 'ri-file-line'} style={{ fontSize: 22, color: colorMap[doc.fileType] || '#64748b', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.fileName}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                        {doc.chunkCount > 0 && `${doc.chunkCount} chunks · `}
                        {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB · ` : ''}
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <StatusBadge status={doc.status} />
                    <button onClick={() => handleDeleteDoc(doc.id)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, padding: '2px 4px', opacity: 0.5, flexShrink: 0, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
