import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RequestSchema } from "@/lib/schemas";
import { runFactCheck, HttpError } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 120; // the pipeline makes several LLM + search calls

export async function POST(req: Request) {
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
