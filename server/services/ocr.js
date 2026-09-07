// ==========================================
// ocr.js
// ==========================================
// This service reads text out of images (like a photo of handwritten
// or printed notes) using Tesseract.js, a free OCR (Optical Character
// Recognition) library.

const Tesseract = require("tesseract.js");

// Extract text from an image file.
// Returns the extracted text as a plain string.
async function extractTextFromImage(filePath) {
  const result = await Tesseract.recognize(filePath, "eng", {
    // logger can be used to report OCR progress, but we keep this
    // simple for the MVP. A student could wire this up to a
    // websocket or polling endpoint to show a live progress bar.
    logger: () => {},
  });

  return (result.data.text || "").trim();
}

module.exports = { extractTextFromImage };
