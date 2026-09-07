// ==========================================
// chatbot.js
// ==========================================
// Injects the floating "Libris" chat widget into every page that
// loads this script. Builds its own DOM (so no HTML needs to be
// duplicated across pages), and talks to POST /api/chatbot.
//
// Other page scripts (quiz.js, main.js, upload.js, result.js) can
// set window.StudyQuizContext = {...} with live data (score,
// progress, daily upload count, etc.) so Libris can answer questions
// like "what's my score?" grounded in real data instead of guessing.

const LIBRIS_HISTORY_KEY = "studyquiz_libris_history";
const LIBRIS_MAX_HISTORY_TURNS = 6;

let librisHistory = [];
let librisOpen = false;
let librisSending = false;

window.StudyQuizContext = window.StudyQuizContext || {};

function loadLibrisHistory() {
  try {
    const raw = sessionStorage.getItem(LIBRIS_HISTORY_KEY);
    librisHistory = raw ? JSON.parse(raw) : [];
  } catch (err) {
    librisHistory = [];
  }
}

function saveLibrisHistory() {
  try {
    sessionStorage.setItem(LIBRIS_HISTORY_KEY, JSON.stringify(librisHistory));
  } catch (err) {
    // Non-fatal — chat just won't remember across page loads.
  }
}

function buildLibrisWidget() {
  // ---------- Floating launcher button ----------
  const launcher = document.createElement("button");
  launcher.id = "libris-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open Libris chat");
  launcher.innerHTML = "✾";
  document.body.appendChild(launcher);

  // ---------- Chat panel ----------
  const panel = document.createElement("div");
  panel.id = "libris-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="libris-header">
      <span class="libris-header-title">✾ Libris</span>
      <button class="libris-close-btn" id="libris-close-btn" aria-label="Close chat">✕</button>
    </div>
    <div id="libris-messages"></div>
    <div class="libris-input-row">
      <input type="text" id="libris-input" placeholder="Ask Libris something..." maxlength="500" />
      <button id="libris-send-btn" aria-label="Send message">➤</button>
    </div>
  `;
  document.body.appendChild(panel);

  const closeBtn = document.getElementById("libris-close-btn");
  const input = document.getElementById("libris-input");
  const sendBtn = document.getElementById("libris-send-btn");

  launcher.addEventListener("click", () => setLibrisOpen(!librisOpen));
  closeBtn.addEventListener("click", () => setLibrisOpen(false));

  sendBtn.addEventListener("click", sendLibrisMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendLibrisMessage();
  });

  // Replay any messages from this browser session.
  librisHistory.forEach((turn) => {
    appendLibrisMessage(turn.role === "user" ? "user" : "bot", turn.text);
  });

  if (librisHistory.length === 0) {
    appendLibrisMessage(
      "bot",
      "Hi! I'm Libris ✾ Ask me how StudyQuiz works, about your current score, or a quick study question!"
    );
  }
}

function setLibrisOpen(open) {
  librisOpen = open;
  const panel = document.getElementById("libris-panel");
  panel.hidden = !open;
  if (open) {
    document.getElementById("libris-input").focus();
    scrollLibrisToBottom();
  }
}

function appendLibrisMessage(role, text, extraClass) {
  const messagesEl = document.getElementById("libris-messages");
  const msg = document.createElement("div");
  msg.className = `libris-msg ${role}${extraClass ? " " + extraClass : ""}`;
  msg.textContent = text;
  messagesEl.appendChild(msg);
  scrollLibrisToBottom();
  return msg;
}

function scrollLibrisToBottom() {
  const messagesEl = document.getElementById("libris-messages");
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendLibrisMessage() {
  if (librisSending) return;

  const input = document.getElementById("libris-input");
  const sendBtn = document.getElementById("libris-send-btn");
  const message = input.value.trim();
  if (!message) return;

  // Build the history to send BEFORE adding this new message to it —
  // otherwise the current message ends up duplicated (once in
  // "history", once in "message"), which Gemini rejects with a 400
  // because it creates two consecutive "user" turns in a row.
  const historyForRequest = librisHistory
    .slice(-LIBRIS_MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role === "user" ? "user" : "model",
      text: turn.text,
    }));

  appendLibrisMessage("user", message);
  librisHistory.push({ role: "user", text: message });
  input.value = "";

  librisSending = true;
  sendBtn.disabled = true;
  const typingMsg = appendLibrisMessage("bot", "Libris is typing...", "typing");

  try {
    const res = await apiFetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: historyForRequest,
        // Live app data set by whichever page script is active
        // (score, progress, streak, daily upload count, etc.)
        context: window.StudyQuizContext || {},
      }),
    });
    const data = await res.json();

    typingMsg.remove();

    if (!res.ok) {
      throw new Error(data.error || "Libris couldn't respond right now.");
    }

    appendLibrisMessage("bot", data.reply);
    librisHistory.push({ role: "model", text: data.reply });
    saveLibrisHistory();
  } catch (err) {
    typingMsg.remove();
    appendLibrisMessage("bot", err.message || "Libris couldn't respond right now.", "error-msg");
  } finally {
    librisSending = false;
    sendBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadLibrisHistory();
  buildLibrisWidget();
});