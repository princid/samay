import { updateConversion } from "./supabase";
import { extractFrames, assembleVideo, cleanupDir } from "./ffmpeg";
import { processFrameToAnime, processFrameSimple } from "./huggingface";
import { uploadToCloudinary } from "./cloudinary";
import fs from "fs";
import path from "path";
import os from "os";

/** Frames per second used for extraction and assembly */
const DEFAULT_FPS = 2;

interface QueueJob {
  id: string;
  videoPath: string;
  conversionId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  totalFrames: number;
  processedFrames: number;
}

/** In-memory job queue for tracking processing status */
const jobs: Map<string, QueueJob> = new Map();

export function getJobStatus(conversionId: string): QueueJob | undefined {
  return jobs.get(conversionId);
}

export function getAllJobs(): QueueJob[] {
  return Array.from(jobs.values());
}

/**
 * Enqueue a video for anime-style processing.
 * Runs asynchronously — caller should poll status via getJobStatus.
 */
export async function enqueueConversion(
  conversionId: string,
  videoPath: string
): Promise<void> {
  const job: QueueJob = {
    id: conversionId,
    videoPath,
    conversionId,
    status: "pending",
    progress: 0,
    totalFrames: 0,
    processedFrames: 0,
  };
  jobs.set(conversionId, job);

  // Start processing in background (don't await)
  processVideo(job).catch((err) => {
    console.error(`Processing failed for ${conversionId}:`, err);
    job.status = "failed";
    updateConversion(conversionId, {
      status: "failed",
      error_message: err instanceof Error ? err.message : "Unknown error",
    });
  });
}

async function processVideo(job: QueueJob): Promise<void> {
  job.status = "processing";
  await updateConversion(job.conversionId, { status: "processing" });

  let framesDir = "";
  let processedDir = "";

  try {
    // Step 1: Extract frames
    const result = await extractFrames(job.videoPath, DEFAULT_FPS);
    framesDir = result.framesDir;
    job.totalFrames = result.frameCount;

    await updateConversion(job.conversionId, {
      frame_count: result.frameCount,
    });

    // Step 2: Process each frame through AI
    processedDir = path.join(os.tmpdir(), `samay-processed-${Date.now()}`);
    fs.mkdirSync(processedDir, { recursive: true });

    const frameFiles = fs
      .readdirSync(framesDir)
      .filter((f) => f.endsWith(".png"))
      .sort();

    for (let i = 0; i < frameFiles.length; i++) {
      const framePath = path.join(framesDir, frameFiles[i]);
      const frameBuffer = fs.readFileSync(framePath);

      let processedBuffer: Buffer;
      try {
        processedBuffer = await processFrameToAnime(frameBuffer);
      } catch {
        // Fallback to simpler model
        processedBuffer = await processFrameSimple(frameBuffer);
      }

      const outputFramePath = path.join(processedDir, frameFiles[i]);
      fs.writeFileSync(outputFramePath, processedBuffer);

      job.processedFrames = i + 1;
      job.progress = Math.round(((i + 1) / frameFiles.length) * 100);

      await updateConversion(job.conversionId, {
        processed_frames: i + 1,
      });
    }

    // Step 3: Reassemble video
    const outputPath = path.join(
      os.tmpdir(),
      `samay-output-${Date.now()}.mp4`
    );
    await assembleVideo(processedDir, outputPath, DEFAULT_FPS);

    // Step 4: Upload result to Cloudinary
    const { url } = await uploadToCloudinary(outputPath);

    // Step 5: Update status to completed
    job.status = "completed";
    job.progress = 100;
    await updateConversion(job.conversionId, {
      status: "completed",
      result_url: url,
    });

    // Cleanup temporary files
    cleanupDir(framesDir);
    cleanupDir(processedDir);
    try {
      fs.unlinkSync(outputPath);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(job.videoPath);
    } catch {
      /* ignore */
    }
  } catch (err) {
    job.status = "failed";
    await updateConversion(job.conversionId, {
      status: "failed",
      error_message: err instanceof Error ? err.message : "Processing failed",
    });

    // Cleanup on failure
    if (framesDir) cleanupDir(framesDir);
    if (processedDir) cleanupDir(processedDir);

    throw err;
  }
}
