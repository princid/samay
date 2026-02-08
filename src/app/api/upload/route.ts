import { NextRequest, NextResponse } from "next/server";
import { createConversion } from "@/lib/supabase";
import { enqueueConversion } from "@/lib/queue";
import fs from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "video/*,application/octet-stream,text/html,application/xhtml+xml;q=0.9,*/*;q=0.7",
};

/**
 * Attempt to resolve a webpage URL to a direct video file URL by
 * inspecting og:video meta tags, <video>/<source> elements, and .mp4 links.
 */
async function resolveVideoUrl(
  url: string
): Promise<{ videoUrl: string | null; error?: string }> {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    redirect: "follow",
  });

  if (!response.ok) {
    return {
      videoUrl: null,
      error: `Failed to fetch URL (HTTP ${response.status}). Please provide a direct link to a video file.`,
    };
  }

  const contentType = response.headers.get("content-type") ?? "";

  // Already a video — the original URL is fine
  if (
    contentType.startsWith("video/") ||
    contentType === "application/octet-stream"
  ) {
    return { videoUrl: url };
  }

  // HTML page — try to extract a direct video link
  if (contentType.includes("text/html")) {
    const html = await response.text();

    // 1. og:video / og:video:url meta tags
    const ogMatch =
      html.match(
        /<meta[^>]+property=["']og:video(?::url)?["'][^>]+content=["']([^"']+)["']/i
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?::url)?["']/i
      );
    if (ogMatch?.[1]) {
      return { videoUrl: ogMatch[1] };
    }

    // 2. <video src="..."> or <source src="...">
    const videoSrcMatch =
      html.match(/<video[^>]*\ssrc=["']([^"']+\.mp4[^"']*)["']/i) ??
      html.match(/<source[^>]+src=["']([^"']+\.mp4[^"']*)["']/i);
    if (videoSrcMatch?.[1]) {
      return { videoUrl: videoSrcMatch[1] };
    }

    // 3. Any .mp4 URL found in the page
    const mp4Match = html.match(
      /["'](https?:\/\/[^"'\s]+\.mp4(?:\?[^"'\s]*)?)["']/i
    );
    if (mp4Match?.[1]) {
      return { videoUrl: mp4Match[1] };
    }

    return {
      videoUrl: null,
      error:
        "Could not find a downloadable video at this URL. " +
        "Try right-clicking the video on the site, selecting " +
        '"Copy video address", and pasting that direct link instead.',
    };
  }

  return {
    videoUrl: null,
    error: `The URL returned unexpected content (${contentType}). Please provide a direct link to a .mp4 video file.`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let videoPath: string;
    let originalUrl: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("video") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No video file provided" },
          { status: 400 }
        );
      }

      if (!file.name.toLowerCase().endsWith(".mp4") && file.type !== "video/mp4") {
        return NextResponse.json(
          { error: "Only .mp4 files are supported" },
          { status: 400 }
        );
      }

      // Save file to temp directory
      const tempDir = path.join(os.tmpdir(), "samay-uploads");
      fs.mkdirSync(tempDir, { recursive: true });
      videoPath = path.join(tempDir, `upload-${Date.now()}.mp4`);

      const bytes = await file.arrayBuffer();
      fs.writeFileSync(videoPath, Buffer.from(bytes));
    } else {
      // Handle URL submission
      const body = await request.json();
      const { url } = body;

      if (!url || typeof url !== "string") {
        return NextResponse.json(
          { error: "No video URL provided" },
          { status: 400 }
        );
      }

      originalUrl = url;

      // Resolve the URL — may follow through an HTML page to find the video
      const resolved = await resolveVideoUrl(url);
      if (!resolved.videoUrl) {
        return NextResponse.json(
          { error: resolved.error ?? "Failed to download video from URL" },
          { status: 400 }
        );
      }

      // Download the actual video file
      const tempDir = path.join(os.tmpdir(), "samay-uploads");
      fs.mkdirSync(tempDir, { recursive: true });
      videoPath = path.join(tempDir, `download-${Date.now()}.mp4`);

      const videoResponse = await fetch(resolved.videoUrl, {
        headers: FETCH_HEADERS,
        redirect: "follow",
      });
      if (!videoResponse.ok) {
        return NextResponse.json(
          {
            error: `Found a video link but failed to download it (HTTP ${videoResponse.status}). Try downloading the file manually and uploading it instead.`,
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await videoResponse.arrayBuffer());
      fs.writeFileSync(videoPath, buffer);
    }

    // Create a conversion record in Supabase
    const record = await createConversion({
      status: "pending",
      original_url: originalUrl,
    });

    const conversionId = record?.id ?? `local-${Date.now()}`;

    // Enqueue for processing
    await enqueueConversion(conversionId, videoPath);

    return NextResponse.json({
      conversionId,
      status: "pending",
      message: "Video uploaded successfully. Processing started.",
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
