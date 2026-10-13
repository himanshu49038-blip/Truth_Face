import { supabase } from "./supabase";
import type { Question } from "./schemas";

export type ClaimContext = { claim: string; details: string[] };

export type Session = {
  id: string;
  raw_text: string;
  status: "in_progress" | "awaiting_clarification" | "completed" | "rejected";
  clarification_round: number;
  claim_context: ClaimContext;
  pending_questions: Question[] | null;
  final_result: unknown | null;
};

const TABLE = "fact_check_sessions";

export async function createSession(rawText: string): Promise<Session> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ raw_text: rawText })
    .select()
    .single();
  if (error) throw new Error(`createSession failed: ${error.message}`);
  return data as Session;
}

export async function getSession(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getSession failed: ${error.message}`);
  return (data as Session) ?? null;
}

export async function updateSession(
  id: string,
  patch: Partial<Omit<Session, "id" | "raw_text">>
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`updateSession failed: ${error.message}`);
}
