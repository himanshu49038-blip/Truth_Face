import {
  ApiResponseSchema,
  type ApiResponse,
  type Answer,
  type RequestInput,
  type SourceAssessment,
  type Verdict,
} from "./schemas";
import {
  createSession,
  getSession,
  updateSession,
  type ClaimContext,
  type Session,
} from "./sessions";
import {
  checkClaim,
  analyzeClaim,
  generateQuestions,
  synthesizeEvidence,
} from "./steps";
import { searchEvidence } from "./search";

const MAX_CLARIFICATION_ROUNDS = 2; // stops the "still ambiguous?" loop

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ---------- entry point ---------- */

export async function runFactCheck(input: RequestInput): Promise<ApiResponse> {
  let session: Session;

  console.log("\n========================================================");
  if (input.sessionId) {
    console.log(`[PIPELINE] 🔄 Resuming Session: ${input.sessionId}`);
    console.log(`[PIPELINE] 📥 Received ${input.answers?.length ?? 0} clarification answers`);

    /* Steps 10 -> 5: resume after the user answered the MCQs */
    const found = await getSession(input.sessionId);
    if (!found) throw new HttpError(404, "Session not found.");
    if (found.status !== "awaiting_clarification" || !found.pending_questions) {
      throw new HttpError(409, "This session is not waiting for answers.");
    }
    const context = mergeAnswers(found, input.answers ?? []);
    session = {
      ...found,
      claim_context: context,
      clarification_round: found.clarification_round + 1,
      pending_questions: null,
      status: "in_progress",
    };
    await updateSession(session.id, {
      claim_context: context,
      clarification_round: session.clarification_round,
      pending_questions: null,
      status: "in_progress",
    });
  } else {
    console.log(`[PIPELINE] 🚀 New Request: "${input.text}"`);

    /* Steps 1-2: new request */
    session = await createSession(input.text!);
    console.log(`[PIPELINE] 💾 Created Supabase Session ID: ${session.id}`);

    console.log(`[PIPELINE] 🔍 [Step 1: Intake] Evaluating claim checkability & safety...`);
    const intake = await checkClaim(input.text!);

    if (intake.injection_detected || !intake.checkable) {
      console.log(`[PIPELINE] ❌ Claim Rejected: ${intake.reason || "Prompt injection detected"}`);
      return finish(
        session,
        {
          verdict: "REJECTED",
          claim: "",
          confidence: 1,
          explanation: intake.injection_detected
            ? "The text contains instructions aimed at the system rather than a factual claim."
            : intake.reason,
          sources: [],
          clarification_questions: null,
        },
        "rejected"
      );
    }

    console.log(`[PIPELINE] ✅ Normalized Claim: "${intake.claim}"`);
    session.claim_context = { claim: intake.claim, details: [] };
    await updateSession(session.id, { claim_context: session.claim_context });
  }

  return analyze(session);
}

/* ---------- steps 3-4/6, then plausibility, search, verdict ---------- */

async function analyze(session: Session): Promise<ApiResponse> {
  const { claim, details } = session.claim_context;

  console.log(`[PIPELINE] ⚡ [Step 2: Analysis] Evaluating claim specificity, plausibility & generating search queries...`);
  const analysis = await analyzeClaim(claim, details);

  // Steps 3-4 (first pass) / 6 (after answers): enough identifying details?
  if (!analysis.enough_details && session.clarification_round < MAX_CLARIFICATION_ROUNDS) {
    console.log(`[PIPELINE] ❓ Ambiguity detected. Generating clarification questions for user...`);
    const questions = await generateQuestions(claim, details, analysis.missing_details);
    await updateSession(session.id, {
      status: "awaiting_clarification",
      pending_questions: questions,
    });
    console.log(`[PIPELINE] ⏸️ Session paused for ${questions.length} clarifying questions.`);
    return ApiResponseSchema.parse({
      session_id: session.id,
      verdict: "NEEDS_CLARIFICATION",
      claim,
      confidence: 0,
      explanation: "More details are needed before this claim can be checked.",
      sources: [],
      clarification_questions: questions,
    });
  }

  // Plausibility checks -> FALSE explanation shortcut for logical impossibilities
  if (analysis.logically_impossible) {
    console.log(`[PIPELINE] 🚫 Claim is logically/physically impossible: ${analysis.impossible_explanation}`);
    return finish(
      session,
      {
        verdict: "FALSE",
        claim,
        confidence: 0.95,
        explanation: analysis.impossible_explanation || "This statement is logically or physically impossible by definition.",
        sources: [],
        clarification_questions: null,
      },
      "completed"
    );
  }

  const queries = analysis.queries.length > 0 ? analysis.queries : [claim];
  console.log(`[PIPELINE] 🔎 Generated ${queries.length} Web Queries:`);
  queries.forEach((q, i) => console.log(`           ${i + 1}. "${q}"`));

  console.log(`[PIPELINE] 🌐 [Step 3: Web Search] Querying live web evidence via Tavily...`);
  const evidence = await searchEvidence(queries);
  console.log(`[PIPELINE] 📄 Found ${evidence.length} unique sources across the web.`);

  if (evidence.length === 0) {
    console.log(`[PIPELINE] ⚠️ No usable web evidence found.`);
    return finish(
      session,
      {
        verdict: "UNVERIFIABLE",
        claim,
        confidence: 0.1,
        explanation: "No usable evidence could be found for this claim.",
        sources: [],
        clarification_questions: null,
      },
      "completed"
    );
  }

  console.log(`[PIPELINE] 🎯 [Step 4: Evidence Synthesis & Verdict] Evaluating sources and reaching verdict...`);
  const synthesis = await synthesizeEvidence(claim, details, evidence);

  const cleanUrl = (u: string) =>
    u.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
  const byCleanUrl = new Map(evidence.map((e) => [cleanUrl(e.url), e]));

  const assessments = synthesis.assessments
    .map((a) => {
      const match = byCleanUrl.get(cleanUrl(a.url));
      return match ? { ...a, url: match.url } : null;
    })
    .filter((a): a is SourceAssessment => Boolean(a));

  const validAssessments =
    assessments.length > 0
      ? assessments
      : synthesis.assessments.slice(0, evidence.length).map((a, i) => ({
          ...a,
          url: evidence[i].url,
        }));

  const confidence = computeConfidence(synthesis.verdict, validAssessments);

  console.log(`[PIPELINE] 🏁 Verdict: ${synthesis.verdict} (Confidence: ${Math.round(confidence * 100)}%)`);
  console.log(`[PIPELINE] 📝 Explanation: ${synthesis.explanation}`);
  console.log("========================================================\n");

  const byUrl = new Map(evidence.map((e) => [e.url, e]));

  return finish(
    session,
    {
      verdict: synthesis.verdict,
      claim,
      confidence,
      explanation: synthesis.explanation,
      sources: validAssessments.map((a) => ({
        title: byUrl.get(a.url)?.title || a.url,
        url: a.url,
        credibility: a.credibility,
        stance: a.stance,
        note: a.note,
      })),
      clarification_questions: null,
    },
    "completed"
  );
}

/* ---------- helpers ---------- */

/** Step 5: fold the user's MCQ answers into the claim context (plain code, no LLM). */
function mergeAnswers(session: Session, answers: Answer[]): ClaimContext {
  const lines = (session.pending_questions ?? []).flatMap((q) => {
    const a = answers.find((x) => x.question_id === q.id);
    if (!a || a.selected === "Not sure") return [];
    return [`${q.question} -> ${a.selected}`];
  });
  return {
    claim: session.claim_context.claim,
    details: [...session.claim_context.details, ...lines],
  };
}

/** Step 12: confidence from source weights and volume, not from the model's own guess. */
function computeConfidence(
  verdict: Verdict,
  assessments: SourceAssessment[]
): number {
  const weight = { high: 3, medium: 2, low: 1 } as const;
  let support = 0;
  let refute = 0;
  for (const a of assessments) {
    if (a.stance === "supports") support += weight[a.credibility];
    if (a.stance === "refutes") refute += weight[a.credibility];
  }
  const total = support + refute;
  if (total === 0) return 0.2;

  const ratio =
    verdict === "TRUE" ? support / total : verdict === "FALSE" ? refute / total : 0.5;
  const volume = Math.min(1, total / 9); // 9 = roughly three high-credibility sources
  return Math.round(ratio * (0.5 + 0.5 * volume) * 100) / 100;
}

/** Steps 14-15: validate the final JSON with Zod, persist it, return it. */
async function finish(
  session: Session,
  result: Omit<ApiResponse, "session_id">,
  status: "completed" | "rejected"
): Promise<ApiResponse> {
  const validated = ApiResponseSchema.parse({ session_id: session.id, ...result });
  await updateSession(session.id, { status, final_result: validated });
  return validated;
}
