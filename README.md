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

## 3. How to install Node.js

Download and install Node.js (version 18 or newer) from
[https://nodejs.org](https://nodejs.org). This also installs `npm`,
which we use to install dependencies.

Check it worked by running:

```bash
node -v
npm -v
```

---

## 4. How to install dependencies

From the project's root folder, run:

```bash
npm install
```

This reads `package.json` and downloads everything the project needs
(Express, Multer, SQLite, Tesseract.js, etc.) into a `node_modules`
folder.

---

## 5. How to configure `.env`

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` in a text editor and fill in your own values:

   ```
   PORT=3000
   AI_API_KEY=your_api_key_here
   AI_MODEL=your_model_here
   DONATION_LINK=
   DAILY_UPLOAD_LIMIT=4
   MAX_FILE_SIZE_MB=10
   ```

3. **Never commit your real `.env` file to GitHub.** It's already
   listed in `.gitignore` so Git will ignore it automatically.

---

## 6. How to start the server

```bash
npm start
```

Then open your browser to:

```
http://localhost:3000
```

---

## 7. How the project works (folder overview)

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

---

## 8. How to change the AI provider

All AI logic lives in `server/services/aiGenerator.js`. It currently
calls the Anthropic API (`https://api.anthropic.com/v1/messages`).

To use a different provider:

1. Update the `fetch()` call's URL, headers, and request body to match
   your chosen provider's API.
2. Keep the same strict prompt instructions (only use the uploaded
   material, return valid JSON, etc.) so the quiz stays reliable.
3. Update `AI_MODEL` in your `.env` file to match the new provider's
   model name.

The rest of the app (routes, database, frontend) doesn't need to
change, since it only cares about the final validated quiz JSON.

---

## 9. How to configure donations

StudyQuiz has no paid features — donations are entirely optional.

1. Get a link from any donation platform you like (Ko-fi, PayPal,
   GCash, Buy Me a Coffee, etc.).
2. Paste it into `.env` as `DONATION_LINK=https://your-link-here`.
3. If you leave `DONATION_LINK` empty, the donation buttons on the
   About page will simply show "Donation support coming soon ❤️"
   instead of a broken link.

---

## Future ideas (not built yet)

This MVP focuses on the core flow: upload → extract → generate →
play → result. The project is structured so these could be added
later without a rewrite: user accounts, quiz history, leaderboards,
multiplayer, difficulty selection, XP/achievements, and more.

Happy studying! 📚🎮
