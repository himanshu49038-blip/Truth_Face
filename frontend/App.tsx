"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { ClaimChecker } from "./components/ClaimChecker";
import { Dashboard } from "./components/Dashboard";
import type { SessionHistoryItem, TabType, ThemeMode } from "./types";
import type { ApiResponse } from "@/lib/schemas";

export function App() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [activeTab, setActiveTab] = useState<TabType>("checker");

  // History state
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Preload claim from dashboard selection
  const [prefilledClaim, setPrefilledClaim] = useState<string>("");
  const [prefilledResult, setPrefilledResult] = useState<ApiResponse | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tf_theme") as ThemeMode | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("tf_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/history?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Automatically refresh records whenever the user clicks to view Dashboard
  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchHistory();
    }
  }, [activeTab]);

  const handleSelectFromDashboard = (rawText: string, finalResult?: any) => {
    setPrefilledClaim(rawText);
    setPrefilledResult(finalResult ?? null);
    setActiveTab("checker");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === "checker" ? (
          <ClaimChecker
            onSuccess={fetchHistory}
            initialClaim={prefilledClaim}
            initialResult={prefilledResult}
          />
        ) : (
          <Dashboard
            history={history}
            loading={loadingHistory}
            onRefresh={fetchHistory}
            onSelectClaim={handleSelectFromDashboard}
          />
        )}
      </main>
    </div>
  );
}
