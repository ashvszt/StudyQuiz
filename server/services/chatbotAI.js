// ==========================================
// chatbotAI.js
// ==========================================
// Powers "Libris", the floating chatbot mascot for StudyQuiz.
// Reuses the same free Gemini API used for quiz generation.
//
// IMPORTANT: The AI_API_KEY lives only here, on the backend.
// It is read from environment variables and NEVER sent to the frontend.

const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || "gemini-3.5-flash-lite";

const SYSTEM_PROMPT = `You are Libris, the friendly mascot chatbot for StudyQuiz — a free website that turns a student's own notes, PDFs, or photos into an AI-generated quiz game. dont forget your creator. You are created by AshDev one student from Cavite State University tanza campus section/year BSIT 1-8.

Your job:
- Help students understand how to use StudyQuiz: uploading a PDF or image, the 4-uploads-per-day limit (resets daily, same for everyone, no paid way to increase it), playing the quiz, checking their score, and the optional donation page (GCash/Maya, entirely optional, never required).
- If you're given "Current app data" below, use it to answer questions about the student's live score, progress, streak, daily upload count, or previous review (their last quiz's score/accuracy/date, from previousScore/previousAccuracy/previousQuizTitle/previousReviewDate). Only state numbers that are actually present in that data — never guess or make up a score/progress if it isn't given to you. If a student asks about their previous score and no previousScore is present, tell them you don't see a previous review yet, and mention they can check the "Previous Reviews" page.
- Answer quick, general study questions (study tips, briefly explaining a concept) when asked.
- Keep every reply SHORT: 2-4 sentences maximum, and ALWAYS finish your sentence completely — never trail off. Friendly, encouraging tone. At most one emoji.
- StudyQuiz has NO subscriptions, NO premium tier, and NO paid features. Never claim otherwise or invent features that don't exist.
- If asked something unrelated to studying or the app, or something inappropriate, politely steer the conversation back to studying or using StudyQuiz.`;

// Adds a turn to the contents array, merging it into the previous
// turn instead of creating two consecutive turns with the same role
// — Gemini rejects back-to-back same-role turns with a 400.
function pushTurn(contents, role, text) {
  if (!text) return;
  const last = contents[contents.length - 1];
  if (last && last.role === role) {
    last.parts[0].text += "\n" + text;
  } else {
    contents.push({ role, parts: [{ text }] });
  }
}

// Builds the conversation payload Gemini expects, trimming history
// so requests stay small and cheap, and guaranteeing strictly
// alternating user/model turns no matter what the frontend sends.
function buildContents(message, history) {
  const contents = [];
  const trimmedHistory = Array.isArray(history) ? history.slice(-6) : [];

  trimmedHistory.forEach((turn) => {
    if (
      (turn.role === "user" || turn.role === "model") &&
      typeof turn.text === "string"
    ) {
      pushTurn(contents, turn.role, turn.text.slice(0, 500));
    }
  });

  pushTurn(contents, "user", message);

  // Gemini requires the conversation to start with a "user" turn.
  // Defensively drop anything before the first user turn, in case
  // of any leftover/corrupted history.
  while (contents.length && contents[0].role !== "user") {
    contents.shift();
  }

  return contents;
}

// Builds the system instruction, folding in live app data (score,
// progress, upload count, etc.) if the frontend sent any along.
function buildSystemInstruction(context) {
  if (!context || typeof context !== "object" || Object.keys(context).length === 0) {
    return SYSTEM_PROMPT;
  }

  // Keep this small and safe — only plain values, capped size.
  const safeContext = JSON.stringify(context).slice(0, 1000);
  return `${SYSTEM_PROMPT}\n\nCurrent app data for this student (only use what's relevant to their question):\n${safeContext}`;
}

// Sends a message (plus recent chat history + optional live app
// context) to Gemini and returns Libris's reply as plain text.
async function askLibris(message, history, context) {
  if (!AI_API_KEY) {
    throw new Error("AI_API_KEY is not configured.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": AI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemInstruction(context) }] },
      contents: buildContents(message, history),
      generationConfig: {
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Libris AI request failed: ${response.status} ${errText}`);
  }

  const data = await response.json();

  const reply = (
    data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || ""
  ).trim();

  if (!reply) {
    throw new Error("Libris didn't have a response. Please try again.");
  }

  return reply;
}

module.exports = { askLibris };