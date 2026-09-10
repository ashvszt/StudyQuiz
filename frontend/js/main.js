
function getUserId() {
  let userId = localStorage.getItem("userId");
  if (!userId) {
    userId = "user_" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem("userId", userId);
  }
  return userId;
}

async function apiFetch(url, options = {}) {
  const headers = Object.assign(
    { "X-User-Id": getUserId() },
    options.headers || {}
  );
  return fetch(url, Object.assign({}, options, { headers }));
}


async function fetchQuizHistory({ excludeQuizId, limit } = {}) {
  try {
    const params = new URLSearchParams();
    if (excludeQuizId) params.set("excludeQuizId", excludeQuizId);
    if (limit) params.set("limit", limit);
    const qs = params.toString();
    const res = await apiFetch(`/api/history${qs ? `?${qs}` : ""}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.history) ? data.history : [];
  } catch (err) {
    return [];
  }
}


function previousReviewContext(entry) {
  if (!entry) return {};
  return {
    previousQuizTitle: entry.title,
    previousScore: entry.score,
    previousCorrect: entry.correct,
    previousWrong: entry.wrong,
    previousAccuracy: entry.accuracy,
    previousReviewDate: entry.completedAt,
  };
}


async function loadUsageWidget() {
  const bar = document.getElementById("usage-bar");
  const text = document.getElementById("usage-text");
  if (!bar || !text) return;

  try {
    const res = await apiFetch("/api/usage");
    const data = await res.json();
    const percent = Math.min(100, (data.used / data.limit) * 100);
    bar.style.width = percent + "%";
    text.textContent = `${data.used} / ${data.limit} used`;

    const history = await fetchQuizHistory({ limit: 1 });

    window.StudyQuizContext = {
      page: "home",
      dailyUploadsUsed: data.used,
      dailyUploadsLimit: data.limit,
      dailyUploadsRemaining: data.remaining,
      ...previousReviewContext(history[0]),
    };
  } catch (err) {
    text.textContent = "Could not load usage.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadUsageWidget();
});
