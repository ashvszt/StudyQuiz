const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dataFolder = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

const dbPath = path.join(dataFolder, "studyquiz.db");
const db = new sqlite3.Database(dbPath);


db.serialize(() => {

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

 
  db.run(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_identifier TEXT,
      upload_date TEXT,
      upload_count INTEGER,
      UNIQUE(user_identifier, upload_date)
    )
  `);


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


function getTodayString() {
  return new Date().toISOString().split("T")[0];
}


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


function deleteQuiz(quizId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM quizzes WHERE id = ? AND user_id = ?",
      [quizId, userId],
      function (err) {
        if (err) return reject(err);

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
