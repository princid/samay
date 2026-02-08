import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _supabaseDisabled = false;

/**
 * Returns the Supabase client, or null when credentials are missing.
 * Once a connection/table error is detected the client is permanently
 * disabled for this process so we stop spamming the console.
 */
export function getSupabase(): SupabaseClient | null {
  if (_supabaseDisabled) return null;

  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!supabaseUrl || !supabaseKey) {
      console.info(
        "Supabase credentials not configured — running with in-memory storage only."
      );
      _supabaseDisabled = true;
      return null;
    }
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

/** Disable Supabase after a fatal schema/connection error */
function disableOnSchemaError(error: { code?: string; message?: string }) {
  if (error?.code === "PGRST205" || error?.message?.includes("schema cache")) {
    console.warn(
      'Supabase table "conversions" does not exist — switching to in-memory storage. ' +
        "Create the table in your Supabase dashboard to persist history across restarts."
    );
    _supabaseDisabled = true;
  }
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
  const sb = getSupabase();
  if (!sb) return null;

  const { data: record, error } = await sb
    .from("conversions")
    .insert({ ...data, status: data.status ?? "pending" })
    .select()
    .single();
  if (error) {
    disableOnSchemaError(error);
    return null;
  }
  return record;
}

export async function updateConversion(
  id: string,
  data: Partial<ConversionRecord>
): Promise<ConversionRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: record, error } = await sb
    .from("conversions")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    disableOnSchemaError(error);
    return null;
  }
  return record;
}

export async function getConversion(
  id: string
): Promise<ConversionRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: record, error } = await sb
    .from("conversions")
    .select()
    .eq("id", id)
    .single();
  if (error) {
    disableOnSchemaError(error);
    return null;
  }
  return record;
}

export async function getConversionHistory(): Promise<ConversionRecord[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("conversions")
    .select()
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    disableOnSchemaError(error);
    return [];
  }
  return data ?? [];
}
