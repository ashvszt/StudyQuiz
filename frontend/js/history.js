///history//

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
    <div class="history-card-footer">
      <button class="history-delete-btn" type="button">Delete</button>
    </div>
  `;
  
  const deleteBtn = card.querySelector(".history-delete-btn");
  deleteBtn.addEventListener("click", () => handleDelete(entry.quizId, card, deleteBtn));

  return card;
}

async function handleDelete(quizId, cardEl, deleteBtn) {
  const confirmed = window.confirm("Delete this quiz from your history? This can't be undone.");
  if (!confirmed) return;

  deleteBtn.disabled = true;
  deleteBtn.textContent = "Deleting...";

  try {
    const res = await apiFetch(`/api/history/${encodeURIComponent(quizId)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Could not delete this quiz.");
    }

    cardEl.remove();

    // Show the empty state if that was the last card.
    if (historyListEl.children.length === 0) {
      historyEmpty.hidden = false;
    }
  } catch (err) {
    deleteBtn.disabled = false;
    deleteBtn.textContent = "Delete";
    alert(err.message || "Could not delete this quiz. Please try again.");
  }
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