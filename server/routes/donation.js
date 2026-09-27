

const express = require("express");
const router = express.Router();


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
