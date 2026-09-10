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
  deleteQuiz,
} = require("../database/database");

const router = express.Router();
const uploadsFolder = path.join(__dirname, "..", "uploads");


router.post("/generate-quiz", async (req, res) => {
  const { fileId, originalName } = req.body;
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(400).json({ error: "Missing user identifier." });
  }

  if (!fileId) {
    return res.status(400).json({ error: "Missing fileId." });
  }


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
   
    fs.unlink(filePath, () => {});
  }
});


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

router.delete("/history/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(400).json({ error: "Missing user identifier." });
    }

    const deleted = await deleteQuiz(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete this quiz." });
  }
});

module.exports = router;
