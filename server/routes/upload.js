

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const { getDailyUsage, incrementDailyUsage } = require("../database/database");

const router = express.Router();

const DAILY_UPLOAD_LIMIT = parseInt(process.env.DAILY_UPLOAD_LIMIT || "4", 10);
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10);

const ALLOWED_TYPES = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const uploadsFolder = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, { recursive: true });
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsFolder),
  filename: (req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname);
    const safeName = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error("UNSUPPORTED_FILE_TYPE"));
    }
  },
});

router.get("/usage", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(400).json({ error: "Missing user identifier." });
    }

    const used = await getDailyUsage(userId);
    res.json({
      used,
      limit: DAILY_UPLOAD_LIMIT,
      remaining: Math.max(0, DAILY_UPLOAD_LIMIT - used),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not check usage." });
  }
});


router.post("/upload", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    try {
      const userId = req.headers["x-user-id"];
      if (!userId) {
        return res.status(400).json({ error: "Missing user identifier." });
      }


      if (err) {
        if (err.message === "UNSUPPORTED_FILE_TYPE") {
          return res.status(400).json({
            error:
              "This file type isn't supported. Please upload a PDF, JPG, JPEG, PNG, or WEBP file.",
          });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: `Your file is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`,
          });
        }
        console.error(err);
        return res.status(400).json({ error: "Could not process the upload." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file was uploaded." });
      }


      const used = await getDailyUsage(userId);
      if (used >= DAILY_UPLOAD_LIMIT) {

        fs.unlink(req.file.path, () => {});
        return res.status(429).json({
          error: `You've reached today's ${DAILY_UPLOAD_LIMIT}-upload limit. Come back tomorrow and keep studying! ❤️`,
        });
      }

      await incrementDailyUsage(userId);

      res.json({
        fileId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (innerErr) {
      console.error(innerErr);
      res.status(500).json({ error: "Something went wrong during upload." });
    }
  });
});

module.exports = router;
