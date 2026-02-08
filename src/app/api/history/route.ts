import { NextResponse } from "next/server";
import { getConversionHistory } from "@/lib/supabase";
import { getAllJobs } from "@/lib/queue";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Try Supabase first
    const dbHistory = await getConversionHistory();

    // Merge with in-memory jobs so recent conversions always appear
    const inMemoryJobs = getAllJobs().map((job) => ({
      id: job.conversionId,
      status: job.status,
      frame_count: job.totalFrames,
      processed_frames: job.processedFrames,
      created_at: new Date().toISOString(),
    }));

    // De-duplicate: prefer Supabase records when both exist
    const dbIds = new Set(dbHistory.map((r) => r.id));
    const merged = [
      ...dbHistory,
      ...inMemoryJobs.filter((j) => !dbIds.has(j.id)),
    ];

    return NextResponse.json({ history: merged });
  } catch (err) {
    console.error("History fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
