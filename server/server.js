// ==========================================
// server.js
// ==========================================
// This is the entry point of our backend. It sets up Express,
// connects our routes, and serves the frontend files.

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");

const uploadRoutes = require("./routes/upload");
const quizRoutes = require("./routes/quiz");
const donationRoutes = require("./routes/donation");
const chatbotRoutes = require("./routes/chatbot");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------

// Allow the frontend to talk to this backend.
// (They're served from the same origin here, but CORS is configured
// in case the frontend is ever hosted separately.)
app.use(cors());

// Parse incoming JSON request bodies (for routes like saving a score).
app.use(express.json());

// Basic rate limiting to prevent abuse of the API.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
  message: { error: "Too many requests. Please slow down and try again." },
});
app.use("/api/", apiLimiter);

// ---------- API Routes ----------
app.use("/api", uploadRoutes);
app.use("/api", quizRoutes);
app.use("/api", donationRoutes);
app.use("/api", chatbotRoutes);

// ---------- Serve the frontend ----------
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

// Fallback: send index.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ---------- Generic error handler ----------
// Catches anything that slipped past individual route error handling.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end." });
});

app.listen(PORT, () => {
  console.log(` StudyQuiz server http://localhost:${PORT}`);
});
