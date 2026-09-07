// ==========================================
// history.js
// ==========================================
// Renders the "Previous Reviews" page: every quiz this student has
// completed, most recent first, with their score and accuracy.

const historyLoading = document.getElementById("history-loading");
const historyEmpty = document.getElementById("history-empty");
const historyListEl = document.getElementById("history-list");

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }) + " · " + date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderHistoryCard(entry) {
  const card = document.createElement("div");
  card.className = "card history-card";

  const accuracyText = entry.accuracy != null ? `${entry.accuracy}%` : "—";

  card.innerHTML = `
    <div class="history-card-header">
      <h2 class="history-card-title">${entry.title}</h2>
      <span class="history-card-date">${formatDate(entry.completedAt)}</span>
    </div>
    <div class="history-card-stats">
      <div>
        <span class="stat-value">${entry.score}</span>
        <span class="stat-label">Score</span>
      </div>
      <div>
        <span class="stat-value">${entry.correct ?? "—"}</span>
        <span class="stat-label">Correct</span>
      </div>
      <div>
        <span class="stat-value">${entry.wrong ?? "—"}</span>
        <span class="stat-label">Wrong</span>
      </div>
      <div>
        <span class="stat-value">${accuracyText}</span>
        <span class="stat-label">Accuracy</span>
      </div>
    </div>
    <a class="btn btn-secondary btn-block" href="quiz.html?id=${encodeURIComponent(entry.quizId)}">Retake this Quiz</a>
  `;

  return card;
}

async function loadHistory() {
  const history = await fetchQuizHistory();

  historyLoading.hidden = true;

  if (history.length === 0) {
    historyEmpty.hidden = false;
    window.StudyQuizContext = { page: "history", reviewCount: 0 };
    return;
  }

  history.forEach((entry) => {
    historyListEl.appendChild(renderHistoryCard(entry));
  });

  // Let Libris reference the student's review history if asked.
  window.StudyQuizContext = {
    page: "history",
    reviewCount: history.length,
    ...previousReviewContext(history[0]),
  };
}

document.addEventListener("DOMContentLoaded", loadHistory);
