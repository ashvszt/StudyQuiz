# 📚 StudyQuiz

StudyQuiz is a **free** web app that turns your own reviewers, notes, PDFs,
and pictures into interactive AI-generated quiz games. Upload your
material, let AI create the questions, and study by playing!

There is **no subscription**, **no premium tier**, and **no paid
features**. The only way to support the project is a voluntary donation.

---

## 1. What the project does

1. You upload a PDF or a photo of your notes.
2. The backend extracts the text (using `pdf-parse` for PDFs, or
   `tesseract.js` OCR for images).
3. The extracted text is sent to an AI model, which generates a
   20-question quiz (questions, choices, correct answers, and
   explanations) based **only** on your material.
4. You play the quiz in the browser — no extra AI calls happen during
   gameplay, since everything was generated up front.
5. You see your final score, accuracy, and best streak.

Everyone gets **4 free uploads per day**. The limit resets automatically
at midnight and applies equally to every visitor — there's no way to pay
for more.

---

## 2. Technologies used

**Frontend:** HTML5, CSS3, Vanilla JavaScript (no frameworks)
**Backend:** Node.js, Express.js
**Database:** SQLite (a single local file, no server setup needed)
**Text extraction:** `pdf-parse` (PDFs), `tesseract.js` (image OCR)
**AI:** Configurable via environment variables (defaults to the
Anthropic API)

---


## 3. How the project works (folder overview)

```
studyquiz/
├── frontend/          → all HTML/CSS/JS the browser loads
│   ├── index.html     → homepage
│   ├── upload.html    → upload + drag-and-drop page
│   ├── quiz.html      → quiz gameplay page
│   ├── result.html    → final score page
│   └── about.html     → about + donation page
│
├── server/
│   ├── server.js      → starts Express, wires up routes
│   ├── routes/        → API endpoints (upload, quiz, donation)
│   ├── services/      → text extraction, OCR, AI generation
│   ├── database/      → SQLite setup + helper functions
│   └── uploads/        → temporary storage for uploaded files
│
├── .env.example        → template for your environment variables
└── package.json
```

The general flow:

```
Upload (PDF/image)
      ↓
Text extraction (pdf-parse) or OCR (tesseract.js)
      ↓
ONE AI request → 20 questions + explanations
      ↓
Quiz is saved to SQLite and played entirely in the browser
      ↓
Result is saved back to SQLite
```



Happy studying! 📚🎮
