import type { ApiResponse, Question } from "@/lib/schemas";

export type SessionHistoryItem = {
  id: string;
  raw_text: string;
  status: string;
  clarification_round: number;
  claim_context: { claim: string; details: string[] };
  final_result: ApiResponse | null;
  created_at: string;
};

export type ThemeMode = "dark" | "light";

export type TabType = "checker" | "dashboard";
