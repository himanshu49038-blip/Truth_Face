import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RequestSchema } from "@/lib/schemas";
import { runFactCheck, HttpError } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 120; // the pipeline makes several LLM + search calls

export async function POST(req: Request) {
  // 1. Master Kill-Switch: Instant pause for the entire API
  if (process.env.PAUSE_API === "true") {
    return NextResponse.json(
      { error: "Verification service is currently paused by the administrator." },
      { status: 503 }
    );
  }

  // 2. Optional Private Access Key: Restrict usage to only authorized users
  const requiredKey = process.env.APP_ACCESS_KEY?.trim();
  if (requiredKey) {
    const providedKey = req.headers.get("x-access-key")?.trim();
    if (providedKey !== requiredKey) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing access key." },
        { status: 401 }
      );
    }
  }

  try {
    const body = RequestSchema.parse(await req.json());
    const result = await runFactCheck(body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.flatten() },
        { status: 400 }
      );
    }
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("fact-check error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
