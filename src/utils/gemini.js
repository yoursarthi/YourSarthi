const GEMINI_MODEL = 'gemini-2.5-flash';

export function computeGrade(pct) {
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  return 'F';
}

export function safeParseJSON(raw) {
  const clean = raw.replace(/```json\n?|```\n?/g, '').trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.indexOf('{');
  if (start === -1) throw new Error(`No JSON found in response: ${clean.slice(0, 200)}`);
  const text = clean.slice(start);
  try { return JSON.parse(text); } catch {}
  for (let i = text.length - 1; i > 0; i--) {
    if (text[i] === '}' || text[i] === ']') {
      try {
        const attempt = text.slice(0, i + 1);
        const opens = (attempt.match(/\{/g) || []).length - (attempt.match(/\}/g) || []).length;
        const closing = '}'.repeat(Math.max(0, opens));
        return JSON.parse(attempt + closing);
      } catch {}
    }
  }
  throw new Error(`Malformed JSON from Gemini: ${clean.slice(0, 300)}`);
}

export function qMax(q) {
  if (q.subSections && q.subSections.length > 0)
    return q.subSections.reduce((s, ss) => s + (parseInt(ss.maxMarks) || 0), 0);
  return parseInt(q.maxMarks) || 0;
}

export function buildQBlock(q, i) {
  const no = q.questionNo || i + 1;
  const max = qMax(q);
  const hasSS = q.subSections && q.subSections.length > 0;
  let line = (q.text && q.text.trim())
    ? `Q${no} (max ${max} marks): "${q.text}"`
    : `Q${no} (max ${max} marks)`;
  if (!hasSS && q.rubric && q.rubric.trim()) line += `\n  Rubric: ${q.rubric}`;
  if (hasSS) {
    q.subSections.forEach(ss => {
      line += `\n  Q${no}(${ss.label}) (max ${ss.maxMarks} marks): "${ss.text || '(see answer sheet)'}"`;
      if (ss.rubric && ss.rubric.trim()) line += `\n    Rubric: ${ss.rubric}`;
    });
  }
  return line;
}

export function buildQExample(q, i) {
  const no = q.questionNo || i + 1;
  const max = qMax(q);
  const ex = { questionNo: no, marksAwarded: Math.round(max * 0.7), maxMarks: max, feedback: 'brief feedback' };
  if (q.subSections && q.subSections.length > 0) {
    ex.subSections = q.subSections.map(ss => ({
      label: ss.label,
      marksAwarded: Math.round(parseInt(ss.maxMarks || 0) * 0.7),
      maxMarks: parseInt(ss.maxMarks || 0),
      feedback: 'sub-section feedback',
    }));
  }
  return ex;
}

export async function callGeminiPerQuestion({ images, questions, modelAnswerImages, subject, program, semester, studentName, apiKey }) {
  if (!apiKey) throw new Error('Gemini API key not set');
  const parts = [];
  if (modelAnswerImages && modelAnswerImages.length > 0) {
    modelAnswerImages.forEach(im => parts.push({ inline_data: { mime_type: im.mime, data: im.b64 } }));
    parts.push({ text: '─── MODEL ANSWER SHEETS ABOVE | STUDENT ANSWER SHEET BELOW ───' });
  }
  images.forEach(im => parts.push({ inline_data: { mime_type: im.mime, data: im.b64 } }));

  const totalMax = questions.reduce((s, q) => s + qMax(q), 0);
  const qList = questions.map(buildQBlock).join('\n\n');
  const exampleResp = JSON.stringify(questions.map(buildQExample));

  parts.push({ text: `You are an expert teacher grading a student's handwritten answer sheet.
Student: ${studentName || 'Unknown'}
Subject: ${subject || 'General'}
Program: ${program || ''}
Semester: ${semester || ''}
Total Maximum Marks: ${totalMax}

EXAM QUESTIONS — evaluate each question and each sub-section SEPARATELY:
${qList}

Instructions:
1. Identify each written answer by question number (and sub-section label where applicable).
2. Evaluate each question and sub-section INDEPENDENTLY using its stated rubric.
3. Award marks NOT exceeding each question's / sub-section's stated maximum.
4. If a question/sub-section answer is absent, award 0.
5. For questions WITH sub-sections: marksAwarded = sum of sub-section marks.
6. totalMarksAwarded = sum of all question marksAwarded.
7. Keep transcription concise — one sentence per question, max 200 words total.

IMPORTANT: Output scores FIRST so they are never cut off by token limits.
Return ONLY raw JSON (no markdown, no code fences):
{"questions":${exampleResp},"totalMarksAwarded":${totalMax},"totalMaxMarks":${totalMax},"grade":"A","percentage":70,"strengths":["s1","s2"],"improvements":["i1"],"detailedFeedback":"overall feedback","transcription":"brief summary"}` });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1, maxOutputTokens: 65536 } }) }
  );
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  if (!d.candidates?.length) throw new Error('Gemini returned no response');
  const raw = d.candidates[0].content.parts.map(p => p.text || '').join('');
  let result;
  try { result = safeParseJSON(raw); } catch (e) { throw new Error(e.message); }

  if (Array.isArray(result.questions)) {
    result.questions = result.questions.map(q => {
      const def = questions.find(dq => dq.questionNo === q.questionNo);
      if (!def) return q;
      const hasSS = def.subSections && def.subSections.length > 0;
      if (hasSS && Array.isArray(q.subSections) && q.subSections.length > 0) {
        const enfSS = q.subSections.map(ss => {
          const ssDef = def.subSections.find(d => d.label === ss.label);
          const cap = ssDef ? parseInt(ssDef.maxMarks) : parseInt(ss.maxMarks || 0);
          return { ...ss, marksAwarded: Math.min(Math.max(0, ss.marksAwarded || 0), cap), maxMarks: cap };
        });
        const ssTotal = enfSS.reduce((s, ss) => s + ss.marksAwarded, 0);
        return { ...q, subSections: enfSS, marksAwarded: ssTotal, maxMarks: qMax(def) };
      }
      const cap = qMax(def);
      return { ...q, marksAwarded: Math.min(Math.max(0, q.marksAwarded || 0), cap), maxMarks: cap };
    });
    const total = result.questions.reduce((s, q) => s + (q.marksAwarded || 0), 0);
    const pct = totalMax > 0 ? Math.round((total / totalMax) * 100) : 0;
    result.totalMarksAwarded = total;
    result.totalMaxMarks = totalMax;
    result.percentage = pct;
    result.grade = computeGrade(pct);
  }
  return result;
}
