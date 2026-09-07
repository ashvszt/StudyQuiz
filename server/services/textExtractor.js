// ==========================================
// textExtractor.js
// ==========================================
// This service extracts plain text from PDF files.
// If the PDF has little/no selectable text (likely a scanned document),
// we fall back to OCR using the ocr.js service.

const fs = require("fs");
const pdfParse = require("pdf-parse");

// Extract text from a PDF file.
// Returns { text, usedOCR }
async function extractTextFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const extractedText = (pdfData.text || "").trim();

  // If we got a reasonable amount of text, the PDF has selectable text.
  if (extractedText.length > 50) {
    return { text: extractedText, usedOCR: false };
  }

  // Otherwise, the PDF is probably scanned images.
  // A full OCR-from-PDF pipeline would render each page as an image first.
  // For this student-level MVP, we let the caller know so it can show
  // a friendly "not enough text found" message instead of crashing.
  return { text: extractedText, usedOCR: false, lowText: true };
}

module.exports = { extractTextFromPDF };
