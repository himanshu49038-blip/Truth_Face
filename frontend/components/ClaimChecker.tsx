"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Info,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Globe,
  ExternalLink,
} from "lucide-react";
import type { ApiResponse, Question } from "@/lib/schemas";

type Props = {
  onSuccess: () => void;
  initialClaim?: string;
  initialResult?: ApiResponse | null;
};

export function ClaimChecker({ onSuccess, initialClaim = "", initialResult = null }: Props) {
  const [claimText, setClaimText] = useState(initialClaim);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(initialResult);

  // Clarification MCQ states
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittingAnswers, setSubmittingAnswers] = useState(false);

  useEffect(() => {
    if (initialClaim) setClaimText(initialClaim);
    if (initialResult) setResult(initialResult);
  }, [initialClaim, initialResult]);

  // Loading animation step timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      let current = 0;
      timer = setInterval(() => {
        if (current < 4) {
          current++;
          setLoadingStep(current);
        }
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const handleCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!claimText.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers({});

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s safety timeout

      const getHeaders = () => {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const savedKey = typeof window !== "undefined" ? localStorage.getItem("tf_access_key") : null;
        if (savedKey) headers["x-access-key"] = savedKey;
        return headers;
      };

      const res = await fetch("/api/fact-check", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ text: claimText.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          const userKey = window.prompt("This TruthFace deployment requires an access code. Please enter your secret key:");
          if (userKey) {
            localStorage.setItem("tf_access_key", userKey.trim());
            setError("Access code saved. Click 'Check Claim' again to verify.");
            return;
          }
        }
        throw new Error(data.error || "Failed to process fact-check request.");
      }

      setResult(data);
      onSuccess();
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("The verification request timed out. Please try a more specific statement or try again.");
      } else {
        setError(err.message || "An unexpected error occurred during verification.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClarificationSubmit = async () => {
    if (!result?.session_id || submittingAnswers) return;

    setSubmittingAnswers(true);
    setError(null);

    try {
      const formattedAnswers = Object.entries(answers).map(([qid, sel]) => ({
        question_id: qid,
        selected: sel,
      }));

      const savedKey = typeof window !== "undefined" ? localStorage.getItem("tf_access_key") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (savedKey) headers["x-access-key"] = savedKey;

      const res = await fetch("/api/fact-check", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId: result.session_id,
          answers: formattedAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit clarification answers.");
      }

      setResult(data);
      setAnswers({});
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to resume check.");
    } finally {
      setSubmittingAnswers(false);
    }
  };

  const sampleClaims = [
    "Water boils at 100 degrees Celsius at sea level.",
    "The Eiffel Tower is located in Berlin.",
    "A triangle with four sides exists.",
    "Did Netflix raise its standard subscription price in 2025?",
  ];

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "TRUE":
        return {
          bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          label: "VERIFIED TRUE",
        };
      case "FALSE":
        return {
          bg: "bg-rose-500/10 text-rose-500 border-rose-500/30",
          icon: <XCircle className="w-5 h-5 text-rose-500" />,
          label: "FALSE CLAIM",
        };
      case "MISLEADING":
        return {
          bg: "bg-amber-500/10 text-amber-500 border-amber-500/30",
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          label: "MISLEADING",
        };
      case "UNVERIFIABLE":
        return {
          bg: "bg-slate-500/10 text-slate-400 border-slate-500/30",
          icon: <HelpCircle className="w-5 h-5 text-slate-400" />,
          label: "UNVERIFIABLE",
        };
      case "NEEDS_CLARIFICATION":
        return {
          bg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
          icon: <Info className="w-5 h-5 text-sky-400" />,
          label: "NEEDS CLARIFICATION",
        };
      case "REJECTED":
      default:
        return {
          bg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
          icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
          label: "REJECTED / NOT CHECKABLE",
        };
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="text-center space-y-3 py-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Autonomous AI{" "}
          <span className="bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 bg-clip-text text-transparent">
            Fact Verification
          </span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          Cross-references claims & factual questions with real-time web sources, assesses credibility, and generates transparent citations.
        </p>
      </div>

      {/* Claim Submission Card */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800">
        <form onSubmit={handleCheck} className="space-y-4">
          <div>
            <label
              htmlFor="claim-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2"
            >
              Enter any statement, claim, or factual question to verify
            </label>
            <textarea
              id="claim-input"
              rows={3}
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              placeholder="e.g. Water boils at 100°C at sea level, or Is the Eiffel Tower in Berlin?..."
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 text-sm sm:text-base resize-none transition-all"
            />
            <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
              <span>{claimText.length} / 2000 characters</span>
              <span>Accepts statements and factual questions</span>
            </div>
          </div>

          {/* Sample Pills */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Try an example:
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleClaims.map((claim, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setClaimText(claim)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-all text-left"
                >
                  {claim}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            {claimText && (
              <button
                type="button"
                onClick={() => {
                  setClaimText("");
                  setResult(null);
                  setError(null);
                }}
                className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !claimText.trim()}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-600 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Claim...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Check Claim</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-start space-x-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Verification Notice</h4>
            <p className="mt-0.5 text-rose-600 dark:text-rose-400">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Steps Visualizer */}
      {loading && (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-sky-500 animate-spin" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                Running Verification Pipeline
              </span>
            </div>
            <span className="text-xs text-slate-400">Step {loadingStep + 1} of 5</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((loadingStep + 1) / 5) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            {[
              "1. Extracting factual proposition & checking safety...",
              "2. Checking specificity, plausibility & building queries in parallel...",
              "3. Querying live web sources via Tavily...",
              "4. Evaluating source credibility & evidence stance...",
              "5. Synthesizing final verdict and confidence score...",
            ][loadingStep]}
          </p>
        </div>
      )}

      {/* Clarification Needed View */}
      {result && result.verdict === "NEEDS_CLARIFICATION" && result.clarification_questions && (
        <div className="bg-sky-500/5 dark:bg-sky-950/20 border border-sky-500/30 rounded-2xl p-6 space-y-6">
          <div className="flex items-start space-x-3">
            <Info className="w-6 h-6 text-sky-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-sky-600 dark:text-sky-400">
                Clarification Needed
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {result.explanation || "Please answer the following to help pin down the exact claim:"}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {result.clarification_questions.map((q: Question) => (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{q.question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, i) => (
                    <label
                      key={i}
                      className={`flex items-center space-x-2.5 p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                        answers[q.id] === opt
                          ? "bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400 font-medium"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleClarificationSubmit}
              disabled={submittingAnswers || Object.keys(answers).length === 0}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 transition-all shadow-md shadow-sky-600/20"
            >
              {submittingAnswers ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Answers...</span>
                </>
              ) : (
                <>
                  <span>Submit Answers & Verify</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Verified Result Card */}
      {result && result.verdict !== "NEEDS_CLARIFICATION" && (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden space-y-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-xl border flex items-center gap-2 ${getVerdictBadge(result.verdict).bg}`}>
                {getVerdictBadge(result.verdict).icon}
                <span className="font-extrabold tracking-wide text-sm">
                  {getVerdictBadge(result.verdict).label}
                </span>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                Confidence Score
              </div>
              <div className="flex items-center sm:justify-end gap-2 mt-1">
                <div className="w-28 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.round(result.confidence * 100)}%` }}
                  />
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {Math.round(result.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>

          {result.claim && (
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Normalized Verified Claim
              </span>
              <p className="text-slate-800 dark:text-slate-200 font-medium text-base">
                &ldquo;{result.claim}&rdquo;
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Analysis & Explanation
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
              {result.explanation}
            </p>
          </div>

          {/* Verified Web Sources Section */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-500" />
                Verified Source Websites ({result.sources?.length || 0})
              </h3>
            </div>

            {result.sources && result.sources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.sources.map((src, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-sky-500/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 line-clamp-2">
                          {src.title || "Web Source"}
                        </h4>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 p-1 rounded-md hover:bg-sky-500/10 shrink-0"
                          title="Open Website"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sky-600 dark:text-sky-400 hover:underline break-all block"
                      >
                        {src.url}
                      </a>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                        {src.note}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          src.credibility === "high"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : src.credibility === "medium"
                            ? "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        Credibility: {src.credibility}
                      </span>

                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          src.stance === "supports"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : src.stance === "refutes"
                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        Stance: {src.stance}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                No external web sources were needed or retrieved for this verification.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
