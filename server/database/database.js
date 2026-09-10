// ==========================================
// database.js
// ==========================================
// This file sets up our SQLite database and provides
// simple helper functions to read/write data.
// SQLite stores everything in one file: server/data/studyquiz.db

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Make sure the data folder exists
const dataFolder = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

const dbPath = path.join(dataFolder, "studyquiz.db");
const db = new sqlite3.Database(dbPath);

// Create our tables if they don't already exist
db.serialize(() => {
  // Quiz table: stores generated quizzes
  db.run(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      source_filename TEXT,
      created_at TEXT,
      question_count INTEGER,
      questions_json TEXT,
      score INTEGER,
      correct INTEGER,
      wrong INTEGER,
      completed_at TEXT
    )
  `);

  // Usage table: tracks how many uploads each user has made today
  db.run(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_identifier TEXT,
      upload_date TEXT,
      upload_count INTEGER,
      UNIQUE(user_identifier, upload_date)
    )
  `);

  // ---- Lightweight migration ----
  // Older copies of this app created the `quizzes` table without the
  // user_id/correct/wrong/completed_at columns. Add them if missing so
  // existing local databases don't break when the app is updated.
  db.all("PRAGMA table_info(quizzes)", (err, columns) => {
    if (err) return console.error("Could not inspect quizzes table:", err);
    const existing = new Set(columns.map((c) => c.name));
    const wanted = {
      user_id: "TEXT",
      correct: "INTEGER",
      wrong: "INTEGER",
      completed_at: "TEXT",
    };
    Object.entries(wanted).forEach(([name, type]) => {
      if (!existing.has(name)) {
        db.run(`ALTER TABLE quizzes ADD COLUMN ${name} ${type}`, (alterErr) => {
          if (alterErr) console.error(`Could not add column ${name}:`, alterErr);
        });
      }
    });
  });
});

// ---------- Usage helper functions ----------

// Returns today's date as a simple string like "2026-09-04"
function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

// Get how many uploads this user has made today
function getDailyUsage(userId) {
  const today = getTodayString();
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT upload_count FROM usage WHERE user_identifier = ? AND upload_date = ?",
      [userId, today],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.upload_count : 0);
      }
    );
  });
}

// Increase this user's upload count for today by 1
function incrementDailyUsage(userId) {
  const today = getTodayString();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO usage (user_identifier, upload_date, upload_count)
       VALUES (?, ?, 1)
       ON CONFLICT(user_identifier, upload_date)
       DO UPDATE SET upload_count = upload_count + 1`,
      [userId, today],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// ---------- Quiz helper functions ----------

// Save a newly generated quiz
function saveQuiz(quiz) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO quizzes (id, user_id, title, source_filename, created_at, question_count, questions_json, score, correct, wrong, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quiz.id,
        quiz.user_id || null,
        quiz.title,
        quiz.source_filename,
        new Date().toISOString(),
        quiz.questions.length,
        JSON.stringify(quiz.questions),
        null,
        null,
        null,
        null,
      ],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// Fetch a quiz by its id
function getQuizById(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM quizzes WHERE id = ?", [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      resolve({
        id: row.id,
        title: row.title,
        source_filename: row.source_filename,
        created_at: row.created_at,
        question_count: row.question_count,
        questions: JSON.parse(row.questions_json),
        score: row.score,
      });
    });
  });
}

// Save the result (score + correct/wrong counts) for a finished quiz
function saveQuizResult(id, score, correct, wrong) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE quizzes SET score = ?, correct = ?, wrong = ?, completed_at = ? WHERE id = ?",
      [score, correct, wrong, new Date().toISOString(), id],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// Get a student's past completed quizzes (most recent first), so we
// can show a review history and let Libris reference previous scores.
// `excludeQuizId` optionally skips a specific quiz (e.g. the one the
// student is currently playing/just finished).
function getQuizHistoryForUser(userId, { excludeQuizId, limit } = {}) {
  const conditions = ["user_id = ?", "score IS NOT NULL"];
  const params = [userId];

  if (excludeQuizId) {
    conditions.push("id != ?");
    params.push(excludeQuizId);
  }

  let sql = `
    SELECT id, title, question_count, score, correct, wrong, completed_at
    FROM quizzes
    WHERE ${conditions.join(" AND ")}
    ORDER BY completed_at DESC
  `;

  if (limit) {
    sql += " LIMIT ?";
    params.push(limit);
  }

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(
        (rows || []).map((row) => ({
          quizId: row.id,
          title: row.title,
          questionCount: row.question_count,
          score: row.score,
          correct: row.correct,
          wrong: row.wrong,
          accuracy:
            row.correct != null && row.wrong != null && row.correct + row.wrong > 0
              ? Math.round((row.correct / (row.correct + row.wrong)) * 100)
              : null,
          completedAt: row.completed_at,
        }))
      );
    });
  });
}

// Deletes one quiz from a student's history. Scoped to userId so a
// student can only ever delete their own quiz, never someone else's
// by guessing an id.
function deleteQuiz(quizId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM quizzes WHERE id = ? AND user_id = ?",
      [quizId, userId],
      function (err) {
        if (err) return reject(err);
        // this.changes is how many rows were actually deleted (0 or 1)
        resolve(this.changes > 0);
      }
    );
  });
}

module.exports = {
  db,
  getDailyUsage,
  incrementDailyUsage,
  saveQuiz,
  getQuizById,
  deleteQuiz,
  saveQuizResult,
  getQuizHistoryForUser,
};
