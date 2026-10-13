import { setApiPaused, isApiPaused, SYSTEM_CONFIG_ID } from "../lib/remote-control";
import { supabase } from "../lib/supabase";

async function main() {
  const action = process.argv[2]?.toLowerCase();

  if (action === "pause") {
    console.log("⏳ Pausing TruthFace API across all deployments...");
    await setApiPaused(true);
    console.log("🛑 API is now PAUSED! No requests will consume your Gemini or Tavily credits.");
  } else if (action === "resume" || action === "unpause") {
    console.log("⏳ Resuming TruthFace API across all deployments...");
    await setApiPaused(false);
    console.log("🟢 API is now ACTIVE! Live users can verify claims again.");
  } else if (action === "status") {
    const { paused } = await isApiPaused();
    const { data } = await supabase
      .from("fact_check_sessions")
      .select("final_result, updated_at")
      .eq("id", SYSTEM_CONFIG_ID)
      .maybeSingle();

    const updatedAt = (data?.final_result as any)?.updated_at || data?.updated_at || "N/A";
    console.log("\n=================================");
    console.log(`📡 TruthFace API Status: ${paused ? "🛑 PAUSED" : "🟢 ACTIVE"}`);
    console.log(`🕒 Last Updated: ${updatedAt}`);
    console.log("=================================\n");
  } else {
    console.log(`
TruthFace Terminal Remote Control
----------------------------------
Usage:
  npm run api:pause    - Instantly pause the live API (blocks all calls)
  npm run api:resume   - Unpause and reactivate the live API
  npm run api:status   - Check current live API status
    `);
  }
}

main().catch((err) => {
  console.error("❌ Control command failed:", err.message);
  process.exit(1);
});
