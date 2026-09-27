// ==========================================
// server.js
// ==========================================


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


app.use(cors());

app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200, 
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
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end." });
});

app.listen(PORT, () => {
  console.log(` StudyQuiz server http://localhost:${PORT}`);
});
