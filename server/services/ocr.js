// ==========================================
// ocr.js
// ==========================================
// This service reads text out of images (like a photo of handwritten
// or printed notes) using Tesseract.js, a free OCR (Optical Character
// Recognition) library.

const Tesseract = require("tesseract.js");


async function extractTextFromImage(filePath) {
  const result = await Tesseract.recognize(filePath, "eng", {
 
    logger: () => {},
  });

  return (result.data.text || "").trim();
}

module.exports = { extractTextFromImage };
