"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  Database,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Info,
  ShieldCheck,
  Clock,
} from "lucide-react";
import type { SessionHistoryItem } from "../types";

type Props = {
  history: SessionHistoryItem[];
  loading: boolean;
  onRefresh: () => void;
  onSelectClaim: (text: string, finalResult?: any) => void;
};

export function Dashboard({ history, loading, onRefresh, onSelectClaim }: Props) {
  const [filter, setFilter] = useState("ALL");

  const totalChecks = history.length;
  const trueChecks = history.filter((h) => h.final_result?.verdict === "TRUE").length;
  const falseChecks = history.filter((h) => h.final_result?.verdict === "FALSE").length;
  const misleadingChecks = history.filter((h) => h.final_result?.verdict === "MISLEADING").length;

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "TRUE":
        return {
          bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
          label: "TRUE",
        };
      case "FALSE":
        return {
          bg: "bg-rose-500/10 text-rose-500 border-rose-500/30",
          icon: <XCircle className="w-4 h-4 text-rose-500" />,
          label: "FALSE",
        };
      case "MISLEADING":
        return {
          bg: "bg-amber-500/10 text-amber-500 border-amber-500/30",
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
          label: "MISLEADING",
        };
      case "UNVERIFIABLE":
        return {
          bg: "bg-slate-500/10 text-slate-400 border-slate-500/30",
          icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
          label: "UNVERIFIABLE",
        };
      case "NEEDS_CLARIFICATION":
        return {
          bg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
          icon: <Info className="w-4 h-4 text-sky-400" />,
          label: "NEEDS CLARIFICATION",
        };
      case "IN_PROGRESS":
      case "IN PROGRESS":
        return {
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          icon: <Clock className="w-4 h-4 text-blue-400" />,
          label: "IN PROGRESS",
        };
      case "REJECTED":
      default:
        return {
          bg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
          icon: <ShieldCheck className="w-4 h-4 text-purple-400" />,
          label: "REJECTED",
        };
    }
  };

  const filteredHistory = history.filter((item) => {
    if (filter === "ALL") return true;
    const v =
      item.final_result?.verdict ||
      (item.status === "awaiting_clarification" ? "NEEDS_CLARIFICATION" : item.status.toUpperCase());
    return v === filter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Verification Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Persistent database history across all statements verified via Supabase
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-fit shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Total Checks</span>
          <p className="text-2xl font-black mt-1 text-slate-900 dark:text-slate-100">{totalChecks}</p>
        </div>
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-emerald-500">Verified True</span>
          <p className="text-2xl font-black mt-1 text-emerald-500">{trueChecks}</p>
        </div>
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-rose-500">Verified False</span>
          <p className="text-2xl font-black mt-1 text-rose-500">{falseChecks}</p>
        </div>
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-amber-500">Misleading</span>
          <p className="text-2xl font-black mt-1 text-amber-500">{misleadingChecks}</p>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {["ALL", "TRUE", "FALSE", "MISLEADING", "UNVERIFIABLE", "NEEDS_CLARIFICATION", "REJECTED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === f
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* History Cards List */}
      <div className="space-y-3">
        {filteredHistory.map((item) => {
          const finalVerdict =
            item.final_result?.verdict ||
            (item.status === "awaiting_clarification" ? "NEEDS_CLARIFICATION" : item.status.toUpperCase());
          const badge = getVerdictBadge(finalVerdict);

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-[#0f172a] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 ${badge.bg}`}>
                    {badge.icon}
                    {badge.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>

                {item.final_result?.confidence !== undefined && (
                  <span className="text-xs font-semibold text-slate-500">
                    Confidence: {Math.round(item.final_result.confidence * 100)}%
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs uppercase text-slate-400 font-semibold">User Claim</span>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {item.raw_text}
                </p>
              </div>

              {item.final_result?.explanation && (
                <div>
                  <span className="text-xs uppercase text-slate-400 font-semibold">Summary</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {item.final_result.explanation}
                  </p>
                </div>
              )}

              {/* Source Web links */}
              {item.final_result?.sources && item.final_result.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Citations:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.final_result.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 bg-sky-500/5 px-2 py-1 rounded-md border border-sky-500/10"
                      >
                        <span className="max-w-[220px] truncate">{src.title || src.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => onSelectClaim(item.raw_text, item.final_result)}
                  className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                >
                  <span>Open in Checker</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {history.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            <Database className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
            <p>No checks recorded in Supabase yet.</p>
            <p className="text-xs mt-1">Submit your first statement in the &ldquo;Verify Claim&rdquo; tab!</p>
          </div>
        )}
      </div>
    </div>
  );
}
