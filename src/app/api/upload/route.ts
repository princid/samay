import { NextRequest, NextResponse } from "next/server";
import { createConversion } from "@/lib/supabase";
import { enqueueConversion } from "@/lib/queue";
import fs from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";

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

      if (!file.name.endsWith(".mp4") && file.type !== "video/mp4") {
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

      // Download video from URL
      const tempDir = path.join(os.tmpdir(), "samay-uploads");
      fs.mkdirSync(tempDir, { recursive: true });
      videoPath = path.join(tempDir, `download-${Date.now()}.mp4`);
      originalUrl = url;

      const response = await fetch(url);
      if (!response.ok) {
        return NextResponse.json(
          { error: "Failed to download video from URL" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
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
