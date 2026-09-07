// ==========================================
// routes/chatbot.js
// ==========================================
// Handles chat messages sent to Libris, the floating assistant.
// A tighter rate limit is applied here on top of the global API
// limiter, since a chat box can be spammed more easily than the
// upload/quiz flow.

const express = require("express");
const rateLimit = require("express-rate-limit");
const { askLibris } = require("../services/chatbotAI");

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 messages per minute per IP
  message: { error: "You're sending messages too fast. Please slow down a bit." },
});

// POST /api/chatbot - send a message to Libris, get a reply back
router.post("/chatbot", chatLimiter, async (req, res) => {
  try {
    const { message, history, context } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Please type a message first." });
    }

    if (message.length > 500) {
      return res
        .status(400)
        .json({ error: "That message is too long. Keep it under 500 characters." });
    }

    // context is optional live app data (score, progress, etc.) —
    // only accept it if it's a plain object, never trust it blindly.
    const safeContext =
      context && typeof context === "object" && !Array.isArray(context) ? context : null;

    const reply = await askLibris(message.trim(), history, safeContext);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Libris is having trouble responding right now. Please try again.",
    });
  }
});

module.exports = router;