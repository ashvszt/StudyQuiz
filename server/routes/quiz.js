// ==========================================
// routes/quiz.js
// ==========================================
// Handles turning an uploaded file into a quiz, fetching a quiz by id,
// and saving the student's result once they finish playing.

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const { extractTextFromPDF } = require("../services/textExtractor");
const { extractTextFromImage } = require("../services/ocr");
const { generateQuiz } = require("../services/aiGenerator");
const {
  saveQuiz,
  getQuizById,
  saveQuizResult,
  getQuizHistoryForUser,
} = require("../database/database");

const router = express.Router();
const uploadsFolder = path.join(__dirname, "..", "uploads");

// POST /api/generate-quiz - extract text + call AI to build the quiz
router.post("/generate-quiz", async (req, res) => {
  const { fileId, originalName } = req.body;
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(400).json({ error: "Missing user identifier." });
  }

  if (!fileId) {
    return res.status(400).json({ error: "Missing fileId." });
  }

  // Prevent path traversal: only allow filenames we generated ourselves
  // (hex string + known extension), never a raw user-supplied path.
  const safePattern = /^[a-f0-9]{32}\.(pdf|jpg|jpeg|png|webp)$/i;
  if (!safePattern.test(fileId)) {
    return res.status(400).json({ error: "Invalid file reference." });
  }

  const filePath = path.join(uploadsFolder, fileId);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Uploaded file was not found." });
  }

  try {
    const ext = path.extname(fileId).toLowerCase();
    let extractedText = "";

    if (ext === ".pdf") {
      const result = await extractTextFromPDF(filePath);
      extractedText = result.text;
    } else {
      extractedText = await extractTextFromImage(filePath);
    }

    if (!extractedText || extractedText.trim().length < 30) {
      return res.status(422).json({
        error:
          "We couldn't find enough text in this file. Try uploading a clearer image or a text-based PDF.",
      });
    }

    // ONE AI request generates all 20 questions + explanations up front,
    // so gameplay afterward never needs to call the AI again.
    const quiz = await generateQuiz(extractedText);

    const quizId = crypto.randomBytes(8).toString("hex");
    await saveQuiz({
      id: quizId,
      user_id: userId,
      title: quiz.title,
      source_filename: originalName || fileId,
      questions: quiz.questions,
    });

    res.json({ quizId, title: quiz.title, questionCount: quiz.questions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "We couldn't generate your quiz. Please try again.",
    });
  } finally {
    // Delete the uploaded file whether generation succeeded or
    // failed — a student's file should never be left sitting on the
    // server just because the AI request errored out.
    fs.unlink(filePath, () => {});
  }
});

// GET /api/quiz/:id - fetch a generated quiz to play
router.get("/quiz/:id", async (req, res) => {
  try {
    const quiz = await getQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found." });
    }
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load the quiz." });
  }
});

// POST /api/quiz/:id/result - save the student's score after playing
router.post("/quiz/:id/result", async (req, res) => {
  try {
    const { score, correct, wrong } = req.body;
    if (typeof score !== "number") {
      return res.status(400).json({ error: "Missing or invalid score." });
    }
    await saveQuizResult(
      req.params.id,
      score,
      typeof correct === "number" ? correct : null,
      typeof wrong === "number" ? wrong : null
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save your result." });
  }
});

// GET /api/history - a student's past completed quizzes (most recent
// first), used for the "Previous Reviews" page and to let Libris
// reference a student's earlier scores.
router.get("/history", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(400).json({ error: "Missing user identifier." });
    }

    const excludeQuizId = req.query.excludeQuizId || undefined;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

    const history = await getQuizHistoryForUser(userId, { excludeQuizId, limit });
    res.json({ history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load your quiz history." });
  }
});

module.exports = router;
