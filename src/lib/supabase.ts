import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
      );
    }
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

export interface ConversionRecord {
  id?: string;
  status: "pending" | "processing" | "completed" | "failed";
  original_url?: string;
  result_url?: string;
  created_at?: string;
  updated_at?: string;
  error_message?: string;
  frame_count?: number;
  processed_frames?: number;
}

export async function createConversion(
  data: Partial<ConversionRecord>
): Promise<ConversionRecord | null> {
  const { data: record, error } = await getSupabase()
    .from("conversions")
    .insert({ ...data, status: data.status ?? "pending" })
    .select()
    .single();
  if (error) {
    console.error("Supabase insert error:", error);
    return null;
  }
  return record;
}

export async function updateConversion(
  id: string,
  data: Partial<ConversionRecord>
): Promise<ConversionRecord | null> {
  const { data: record, error } = await getSupabase()
    .from("conversions")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Supabase update error:", error);
    return null;
  }
  return record;
}

export async function getConversion(
  id: string
): Promise<ConversionRecord | null> {
  const { data: record, error } = await getSupabase()
    .from("conversions")
    .select()
    .eq("id", id)
    .single();
  if (error) return null;
  return record;
}

export async function getConversionHistory(): Promise<ConversionRecord[]> {
  const { data, error } = await getSupabase()
    .from("conversions")
    .select()
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return data ?? [];
}
