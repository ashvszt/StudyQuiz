// ==========================================
// routes/donation.js
// ==========================================
// StudyQuiz has NO paid features. This route only tells the frontend
// which local payment methods (GCash / Maya) the site owner has
// configured, so the donation page can show the right QR codes and
// account details. If nothing is configured, the frontend shows a
// "coming soon" message instead.

const express = require("express");
const router = express.Router();

// GET /api/donation-info - returns configured GCash/Maya donation details
router.get("/donation-info", (req, res) => {
  const gcashName = (process.env.GCASH_NAME || "").trim();
  const gcashNumber = (process.env.GCASH_NUMBER || "").trim();
  const mayaName = (process.env.MAYA_NAME || "").trim();
  const mayaNumber = (process.env.MAYA_NUMBER || "").trim();

  res.json({
    gcash:
      gcashName || gcashNumber
        ? { name: gcashName || null, number: gcashNumber || null, qr: "images/gcash-qr.png" }
        : null,
    maya:
      mayaName || mayaNumber
        ? { name: mayaName || null, number: mayaNumber || null, qr: "images/maya-qr.png" }
        : null,
  });
});

module.exports = router;
