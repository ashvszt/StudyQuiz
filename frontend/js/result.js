const resultScoreEl = document.getElementById("result-score");
const resultCorrectEl = document.getElementById("result-correct");
const resultWrongEl = document.getElementById("result-wrong");
const resultAccuracyEl = document.getElementById("result-accuracy");
const resultStreakEl = document.getElementById("result-streak");
const resultPreviousEl = document.getElementById("result-previous");
const resultMessageEl = document.getElementById("result-message");
const playAgainBtn = document.getElementById("play-again-btn");

const MOTIVATIONAL_MESSAGES = {
  high: "Excellent! You really know this lesson! 🔥",
  mid: "Great job! Keep studying! 📚",
  low: "You're getting there! Try the quiz again.",
};

function loadResult() {
  const raw = sessionStorage.getItem("studyquiz_result");
  if (!raw) {
   
    window.location.href = "index.html";
    return;
  }

  const result = JSON.parse(raw);
  const accuracy = result.total > 0
    ? Math.round((result.correct / result.total) * 100)
    : 0;
    if (accuracy === 100) {
  launchConfetti();
}
    

  window.StudyQuizContext = {
    page: "result",
    score: result.score,
    maxScore: result.maxScore,
    correct: result.correct,
    wrong: result.wrong,
    accuracy,
    bestStreak: result.bestStreak,
    ...previousReviewContext(result.previousReview),
  };

  resultScoreEl.textContent = `${result.score} / ${result.maxScore}`;
  resultCorrectEl.textContent = result.correct;
  resultWrongEl.textContent = result.wrong;
  resultAccuracyEl.textContent = `${accuracy}%`;
  resultStreakEl.textContent = `🔥 Best Streak: ${result.bestStreak}`;

  if (result.previousReview) {
    resultPreviousEl.textContent = `Last time: ${result.previousReview.score} pts (${result.previousReview.accuracy}% accuracy)`;
    resultPreviousEl.hidden = false;
  }

  if (accuracy >= 80) {
    resultMessageEl.textContent = MOTIVATIONAL_MESSAGES.high;
  } else if (accuracy >= 50) {
    resultMessageEl.textContent = MOTIVATIONAL_MESSAGES.mid;
  } else {
    resultMessageEl.textContent = MOTIVATIONAL_MESSAGES.low;
  }

  playAgainBtn.addEventListener("click", () => {
    window.location.href = `quiz.html?id=${encodeURIComponent(result.quizId)}`;
  });
}

document.addEventListener("DOMContentLoaded", loadResult);
