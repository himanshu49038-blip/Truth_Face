import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import type { z } from "zod";

// Dynamic model selection with working model default
export function getModel() {
  const modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  return google(modelName);
}

/** One structured LLM call. Output is guaranteed to match `schema`. */
export async function ask<T extends z.ZodTypeAny>(opts: {
  system: string;
  prompt: string;
  schema: T;
}): Promise<z.infer<T>> {
  const model = getModel();
  const { object } = await generateObject({
    model,
    schema: opts.schema,
    system: opts.system,
    prompt: opts.prompt,
    temperature: 0,
  });
  return object as z.infer<T>;
}
