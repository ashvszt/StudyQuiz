// ==========================================
// textExtractor.js
// ==========================================


const fs = require("fs");
const pdfParse = require("pdf-parse");


async function extractTextFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const extractedText = (pdfData.text || "").trim();

  if (extractedText.length > 50) {
    return { text: extractedText, usedOCR: false };
  }


  return { text: extractedText, usedOCR: false, lowText: true };
}

module.exports = { extractTextFromPDF };
