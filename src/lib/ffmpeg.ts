import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import os from "os";

/**
 * Resolve FFmpeg binary path at runtime.
 * The ffmpeg-static import is broken under Next.js Turbopack because the
 * bundler rewrites the path to something like "\ROOT\node_modules\...".
 * Instead, we locate the binary ourselves.
 */
function resolveFfmpegPath(): string {
  // 1. Check node_modules relative to project root
  const platform = process.platform;
  const binaryName = platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const staticPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", binaryName);
  if (fs.existsSync(staticPath)) return staticPath;

  // 2. Fallback: rely on ffmpeg being on system PATH
  return "ffmpeg";
}

ffmpeg.setFfmpegPath(resolveFfmpegPath());

/**
 * Extracts frames from a video file at the specified FPS rate.
 * Returns the directory containing extracted frames and the frame count.
 */
export async function extractFrames(
  videoPath: string,
  fps: number = 2
): Promise<{ framesDir: string; frameCount: number }> {
  const framesDir = path.join(
    os.tmpdir(),
    `samay-frames-${Date.now()}`
  );
  fs.mkdirSync(framesDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([`-vf fps=${fps}`, "-q:v 2"])
      .output(path.join(framesDir, "frame-%04d.png"))
      .on("end", () => {
        const files = fs.readdirSync(framesDir).filter((f) => f.endsWith(".png"));
        resolve({ framesDir, frameCount: files.length });
      })
      .on("error", (err) => {
        reject(new Error(`Frame extraction failed: ${err.message}`));
      })
      .run();
  });
}

/**
 * Reassembles processed frames into a video file.
 */
export async function assembleVideo(
  framesDir: string,
  outputPath: string,
  fps: number = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(framesDir, "frame-%04d.png"))
      .inputOptions([`-framerate ${fps}`])
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-crf 23",
        "-preset fast",
      ])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err) => {
        reject(new Error(`Video assembly failed: ${err.message}`));
      })
      .run();
  });
}

/**
 * Gets video metadata (duration, resolution, etc.)
 */
export async function getVideoInfo(
  videoPath: string
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      resolve({
        duration: metadata.format.duration ?? 0,
        width: videoStream?.width ?? 0,
        height: videoStream?.height ?? 0,
      });
    });
  });
}

/**
 * Cleans up temporary directories.
 */
export function cleanupDir(dirPath: string): void {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {
    console.warn(`Failed to cleanup directory: ${dirPath}`);
  }
}
