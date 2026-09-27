

const AI_API_KEY = process.env.AI_API_KEY;

const AI_MODEL = process.env.AI_MODEL || "gemini-3.5-flash-lite";
const QUESTION_COUNT = 20;

const IDENTIFICATION_COUNT = 5;
const MULTIPLE_CHOICE_COUNT = QUESTION_COUNT - IDENTIFICATION_COUNT;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, maxRetries = 3, baseDelay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.ok) return response;

    const errText = await response.text();


    if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt - 1); 
      console.warn(
        `[AI] Provider busy (${response.status}). Retrying in ${delay / 1000}s (Attempt ${attempt}/${maxRetries})...`
      );
      await sleep(delay);
      continue;
    }

    throw new Error(`AI request failed: ${response.status} ${errText}`);
  }
}

function buildPrompt(studyText) {
  return `You are an educational quiz generator.

Create a quiz based ONLY on the provided study material below.
Do not introduce facts that are not supported by the study material.
Create clear questions appropriate for students.

Generate exactly ${QUESTION_COUNT} questions total:
- ${MULTIPLE_CHOICE_COUNT} questions of type "multiple_choice"
- ${IDENTIFICATION_COUNT} questions of type "identification" (short factual
  answer the student has to type themselves, such as a term, name, date, or
  short phrase from the material — NOT a yes/no or true/false question)

Every question, regardless of type, must have:
- type: either "multiple_choice" or "identification"
- question: the question text
- explanation: a short explanation of why the answer is correct

A "multiple_choice" question must ALSO have:
- choices: an array of exactly 4 answer choices (strings)
- correctAnswer: the index (0-3) of the correct choice

An "identification" question must ALSO have:
- answer: the single best short correct answer (a word or short phrase)
- acceptableAnswers: an array of other spellings/phrasings/synonyms that
  should also be marked correct (can be an empty array if there aren't any)

Avoid ambiguous questions. Avoid duplicate questions. Keep identification
answers short (a few words at most) so they're easy for a student to type.

Return ONLY valid JSON in this exact shape, with no extra text, no markdown
fences, and no commentary:

{
  "title": "Short quiz title based on the material",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "string",
      "choices": ["string", "string", "string", "string"],
      "correctAnswer": 0,
      "explanation": "string"
    },
    {
      "type": "identification",
      "question": "string",
      "answer": "string",
      "acceptableAnswers": ["string"],
      "explanation": "string"
    }
  ]
}

STUDY MATERIAL:
"""
${studyText}
"""`;
}

async function generateQuiz(studyText) {
  if (!AI_API_KEY) {
    throw new Error(
      "AI_API_KEY is not configured. Please set it in your .env file. " +
        "Get a free key at https://aistudio.google.com/apikey"
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`;

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": AI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: buildPrompt(studyText) }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 16000,
      },
    }),
  });

  const data = await response.json();


  const rawText = (
    data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || ""
  ).trim();

  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error("The AI did not return valid JSON. Please try again.");
  }

  return shuffleChoices(validateQuiz(parsed));
}

// Randomly reshuffle each multiple-choice question's.

function shuffleChoices(quiz) {
  quiz.questions.forEach((q) => {
    if (q.type !== "multiple_choice") return;

    const correctText = q.choices[q.correctAnswer];

  
    for (let i = q.choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q.choices[i], q.choices[j]] = [q.choices[j], q.choices[i]];
    }

    q.correctAnswer = q.choices.indexOf(correctText);
  });

  return quiz;
}

// Makes sure the AI's response
function validateQuiz(quiz) {
  if (!quiz || typeof quiz !== "object") {
    throw new Error("AI response was empty or malformed.");
  }
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new Error("AI response did not contain any questions.");
  }

  const normalizedQuestions = quiz.questions.map((q) => {
    if (typeof q.question !== "string" || !q.question.trim()) {
      throw new Error("A question is missing its text.");
    }
    if (typeof q.explanation !== "string" || !q.explanation.trim()) {
      throw new Error("A question is missing its explanation.");
    }

 
    let type = q.type === "identification" ? "identification" : "multiple_choice";
    if (!q.type && !Array.isArray(q.choices) && typeof q.answer === "string") {
      type = "identification";
    }

    if (type === "identification") {
      if (typeof q.answer !== "string" || !q.answer.trim()) {
        throw new Error("An identification question is missing its answer.");
      }
      const acceptableAnswers = Array.isArray(q.acceptableAnswers)
        ? q.acceptableAnswers.filter((a) => typeof a === "string" && a.trim())
        : [];

      return {
        type: "identification",
        question: q.question,
        answer: q.answer.trim(),
        acceptableAnswers,
        explanation: q.explanation,
      };
    }


    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      throw new Error("A question does not have exactly 4 choices.");
    }
    if (
      typeof q.correctAnswer !== "number" ||
      q.correctAnswer < 0 ||
      q.correctAnswer > 3
    ) {
      throw new Error("A question has an invalid correct answer index.");
    }

    return {
      type: "multiple_choice",
      question: q.question,
      choices: q.choices,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    };
  });

  return {
    title: typeof quiz.title === "string" && quiz.title.trim()
      ? quiz.title.trim()
      : "Your Quiz",
    questions: normalizedQuestions,
  };
}

module.exports = { generateQuiz };
