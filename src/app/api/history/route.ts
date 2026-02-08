import { NextResponse } from "next/server";
import { getConversionHistory } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const history = await getConversionHistory();
    return NextResponse.json({ history });
  } catch (err) {
    console.error("History fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
