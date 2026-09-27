
const express = require("express");
const rateLimit = require("express-rate-limit");
const { askLibris } = require("../services/chatbotAI");

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "You're sending messages too fast. Please slow down a bit." },
});


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
