import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import rateLimit from "express-rate-limit";
import path from "path";
import os from "os";
import fs from "fs";
import { createConversion, getConversion, getConversionHistory, updateConversion } from "../src/lib/supabase";
import { enqueueConversion, getJobStatus, getAllJobs } from "../src/lib/queue";

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());

// Rate limiter for upload endpoint
const uploadLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 10, // max 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(os.tmpdir(), "samay-uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `upload-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "video/mp4" || file.originalname.endsWith(".mp4")) {
      cb(null, true);
    } else {
      cb(new Error("Only .mp4 files are supported"));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Upload video
app.post("/api/upload", uploadLimiter, upload.single("video"), async (req, res) => {
  try {
    let videoPath: string;

    if (req.file) {
      videoPath = req.file.path;
    } else if (req.body.url) {
      // Download from URL
      const response = await fetch(req.body.url);
      if (!response.ok) {
        res.status(400).json({ error: "Failed to download video from URL" });
        return;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      videoPath = path.join(os.tmpdir(), "samay-uploads", `download-${Date.now()}.mp4`);
      fs.writeFileSync(videoPath, buffer);
    } else {
      res.status(400).json({ error: "No video file or URL provided" });
      return;
    }

    const record = await createConversion({ status: "pending" });
    const conversionId = record?.id ?? `local-${Date.now()}`;

    await enqueueConversion(conversionId, videoPath);

    res.json({
      conversionId,
      status: "pending",
      message: "Video uploaded. Processing started.",
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to process upload" });
  }
});

// Get conversion status
app.get("/api/status", async (req, res) => {
  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: "Missing conversion ID" });
    return;
  }

  const job = getJobStatus(id);
  if (job) {
    res.json({
      conversionId: job.conversionId,
      status: job.status,
      progress: job.progress,
      totalFrames: job.totalFrames,
      processedFrames: job.processedFrames,
    });
    return;
  }

  const record = await getConversion(id);
  if (record) {
    res.json({
      conversionId: record.id,
      status: record.status,
      resultUrl: record.result_url,
      errorMessage: record.error_message,
    });
    return;
  }

  res.status(404).json({ error: "Conversion not found" });
});

// Get conversion history
app.get("/api/history", async (_req, res) => {
  try {
    const history = await getConversionHistory();
    res.json({ history });
  } catch {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// List all active jobs
app.get("/api/jobs", (_req, res) => {
  res.json({ jobs: getAllJobs() });
});

app.listen(PORT, () => {
  console.log(`Samay Express server running on http://localhost:${PORT}`);
});

export default app;
