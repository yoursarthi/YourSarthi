'use strict';

const SYSTEM_TUTOR = `You are a precise AI tutor. Your job is to help students understand their course material.

STRICT RULES:
1. Answer ONLY from the provided course material excerpts below.
2. If the answer is not found in the context, respond with exactly: "This topic is not covered in the uploaded course material."
3. Never use outside knowledge, make assumptions, or hallucinate.
4. Be clear, structured, and educational in your responses.
5. Use bullet points or numbered steps where appropriate.`;

/**
 * Build the RAG prompt for a student doubt.
 */
function buildRAGPrompt(contextChunks, question, sessionHistory = []) {
  const context = contextChunks
    .map((c, i) => `[Excerpt ${i + 1}]\n${c.chunkText}`)
    .join('\n\n---\n\n');

  const history = sessionHistory.slice(-8).map(m =>
    `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`
  ).join('\n');

  return {
    systemInstruction: SYSTEM_TUTOR,
    prompt: `COURSE MATERIAL EXCERPTS:
${context}

${history ? `RECENT CONVERSATION:\n${history}\n\n` : ''}STUDENT QUESTION:
${question}

Provide a clear, grounded answer based ONLY on the course material above.`,
  };
}

/**
 * Build quiz generation prompt.
 */
function buildQuizPrompt(context, topic, count) {
  return `You are an academic quiz generator. Generate exactly ${count} multiple-choice questions based ONLY on the following course material.

COURSE MATERIAL:
${context.slice(0, 7000)}

TOPIC: "${topic}"

STRICT RULES:
- Use ONLY information from the course material above.
- Each question must have exactly 4 options labeled A, B, C, D.
- answer field must be the letter of the correct option (A, B, C, or D).
- Include a brief explanation referencing the material.

Return ONLY a valid JSON array, no markdown, no other text:
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A","explanation":"..."}]`;
}

/**
 * Build flashcard generation prompt.
 */
function buildFlashcardPrompt(context, topic, count) {
  return `You are a study material generator. Create exactly ${count} flashcards based ONLY on the following course material.

COURSE MATERIAL:
${context.slice(0, 6000)}

TOPIC: "${topic}"

Make the front a concise question or term, the back a clear definition or answer from the material.

Return ONLY a valid JSON array, no markdown, no other text:
[{"front":"Term or question","back":"Definition or explanation from the material"}]`;
}

/**
 * Build viva question generation prompt.
 */
function buildVivaPrompt(context, topic, count) {
  return `You are an examiner preparing oral exam (viva) questions. Generate exactly ${count} viva questions with detailed model answers based ONLY on the following course material.

COURSE MATERIAL:
${context.slice(0, 7000)}

TOPIC: "${topic}"

Questions should test deep understanding. Answers should be comprehensive and exam-ready.

Return ONLY a valid JSON array:
[{"question":"...","answer":"detailed model answer from the material","difficulty":"easy|medium|hard"}]`;
}

/**
 * Build notes/summary generation prompt.
 */
function buildSummaryPrompt(context, topic) {
  return `Summarize the following course material into clear, structured study notes on the topic: "${topic}".

COURSE MATERIAL:
${context.slice(0, 8000)}

Create:
1. A brief overview (2-3 sentences)
2. Key concepts as bullet points
3. Important definitions
4. Key formulas or processes (if any)
5. A one-paragraph revision summary

Use ONLY the provided material. Do not add outside information.`;
}

module.exports = {
  buildRAGPrompt,
  buildQuizPrompt,
  buildFlashcardPrompt,
  buildVivaPrompt,
  buildSummaryPrompt,
  SYSTEM_TUTOR,
};
