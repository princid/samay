import { NextRequest, NextResponse } from "next/server";
import { getJobStatus } from "@/lib/queue";
import { getConversion } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversionId = searchParams.get("id");

  if (!conversionId) {
    return NextResponse.json(
      { error: "Missing conversion ID" },
      { status: 400 }
    );
  }

  // Check in-memory queue first (real-time progress)
  const job = getJobStatus(conversionId);
  if (job) {
    return NextResponse.json({
      conversionId: job.conversionId,
      status: job.status,
      phase: job.phase,
      progress: job.progress,
      totalFrames: job.totalFrames,
      processedFrames: job.processedFrames,
      resultUrl: job.resultUrl,
    });
  }

  // Fallback to Supabase record
  const record = await getConversion(conversionId);
  if (record) {
    const progress =
      record.status === "completed"
        ? 100
        : record.frame_count && record.processed_frames
          ? Math.round((record.processed_frames / record.frame_count) * 100)
          : 0;

    return NextResponse.json({
      conversionId: record.id,
      status: record.status,
      progress,
      totalFrames: record.frame_count ?? 0,
      processedFrames: record.processed_frames ?? 0,
      resultUrl: record.result_url,
      errorMessage: record.error_message,
    });
  }

  return NextResponse.json(
    { error: "Conversion not found" },
    { status: 404 }
  );
}
