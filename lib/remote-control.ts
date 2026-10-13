import { supabase } from "./supabase";

export const SYSTEM_CONFIG_ID = "00000000-0000-0000-0000-000000000000";

let cachedStatus: { isPaused: boolean; timestamp: number } | null = null;
const CACHE_TTL_MS = 3000; // 3-second cache for lightning-fast responses

/**
 * Checks if the API is paused either via environment variable OR terminal command
 */
export async function isApiPaused(): Promise<{ paused: boolean; reason?: string }> {
  // 1. Static env override
  if (process.env.PAUSE_API === "true") {
    return { paused: true, reason: "Paused via PAUSE_API environment variable" };
  }

  // 2. Short in-memory cache
  const now = Date.now();
  if (cachedStatus && now - cachedStatus.timestamp < CACHE_TTL_MS) {
    return { paused: cachedStatus.isPaused };
  }

  try {
    const { data } = await supabase
      .from("fact_check_sessions")
      .select("final_result")
      .eq("id", SYSTEM_CONFIG_ID)
      .maybeSingle();

    const isPaused = Boolean((data?.final_result as any)?.is_paused);
    cachedStatus = { isPaused, timestamp: now };
    return { paused: isPaused };
  } catch (err) {
    console.error("Error reading remote API control status:", err);
    return { paused: false };
  }
}

/**
 * Updates the pause state from the terminal CLI
 */
export async function setApiPaused(paused: boolean): Promise<void> {
  const { error } = await supabase.from("fact_check_sessions").upsert({
    id: SYSTEM_CONFIG_ID,
    raw_text: "__system_config__",
    status: "completed",
    final_result: {
      is_paused: paused,
      updated_at: new Date().toISOString(),
    },
  });

  if (error) {
    throw new Error(`Failed to update API status: ${error.message}`);
  }

  cachedStatus = { isPaused: paused, timestamp: Date.now() };
}
