import { z } from "zod";

export const VerdictEnum = z.enum([
  "TRUE",
  "FALSE",
  "MISLEADING",
  "UNVERIFIABLE",
  "NEEDS_CLARIFICATION",
  "REJECTED",
]);
export type Verdict = z.infer<typeof VerdictEnum>;

/* ---------- LLM step outputs ---------- */

// Steps 2 + security check
export const IntakeSchema = z.object({
  checkable: z.boolean(),
  claim: z.string(), // normalized one-sentence claim ("" if not checkable)
  reason: z.string(),
  injection_detected: z.boolean(),
});

// Steps 3-4 / 6
export const SpecificitySchema = z.object({
  enough_details: z.boolean(),
  missing_details: z.array(z.string()),
});

// Step 7
export const QuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
});
export type Question = z.infer<typeof QuestionSchema>;
export const QuestionsSchema = z.object({ questions: z.array(QuestionSchema) });

// Plausibility checks
export const PlausibilitySchema = z.object({
  logically_impossible: z.boolean(),
  explanation: z.string(),
});

// Step 9
export const QueriesSchema = z.object({ queries: z.array(z.string()) });

// Unified fast pre-search analysis schema (specificity + plausibility + queries)
export const ClaimAnalysisSchema = z.object({
  enough_details: z.boolean(),
  missing_details: z.array(z.string()),
  logically_impossible: z.boolean(),
  impossible_explanation: z.string(),
  queries: z.array(z.string()),
});

// Step 11
export const SourceAssessmentSchema = z.object({
  url: z.string(),
  credibility: z.enum(["high", "medium", "low"]),
  stance: z.enum(["supports", "refutes", "neutral"]),
  note: z.string(),
});
export type SourceAssessment = z.infer<typeof SourceAssessmentSchema>;
export const AssessmentsSchema = z.object({
  assessments: z.array(SourceAssessmentSchema),
});

// Unified fast evidence evaluation & verdict schema
export const EvidenceSynthesisSchema = z.object({
  assessments: z.array(SourceAssessmentSchema),
  verdict: z.enum(["TRUE", "FALSE", "MISLEADING", "UNVERIFIABLE"]),
  explanation: z.string(),
});

// Step 12
export const DecisionSchema = z.object({
  verdict: z.enum(["TRUE", "FALSE", "MISLEADING", "UNVERIFIABLE"]),
  explanation: z.string(),
});

/* ---------- Final API response (validated in step 14) ---------- */

export const SourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  credibility: z.enum(["high", "medium", "low"]),
  stance: z.enum(["supports", "refutes", "neutral"]),
  note: z.string(),
});

export const ApiResponseSchema = z.object({
  session_id: z.string(),
  verdict: VerdictEnum,
  claim: z.string(),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  sources: z.array(SourceSchema),
  clarification_questions: z.array(QuestionSchema).nullable(),
});
export type ApiResponse = z.infer<typeof ApiResponseSchema>;

/* ---------- Incoming request ---------- */

export const AnswerSchema = z.object({
  question_id: z.string(),
  selected: z.string(),
});
export type Answer = z.infer<typeof AnswerSchema>;

export const RequestSchema = z
  .object({
    text: z.string().trim().min(1).max(2000).optional(),
    sessionId: z.string().uuid().optional(),
    answers: z.array(AnswerSchema).optional(),
  })
  .refine((b) => !!b.sessionId ? !!b.answers?.length : !!b.text, {
    message: "Send { text } for a new check, or { sessionId, answers } to resume.",
  });
export type RequestInput = z.infer<typeof RequestSchema>;
