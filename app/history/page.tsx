"use client";

import { useEffect, useState } from "react";

interface AnalysisResult {
  animalType: string;
  healthScore: number;
  healthStatus: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
  observations: string[];
  concerns: string[];
  recommendations: string[];
  summary: string;
}

interface HistoryEntry {
  id: number;
  timestamp: string;
  imagePreview: string | null;
  analysis: AnalysisResult;
}

const STATUS_COLORS: Record<string, string> = {
  Excellent: "text-emerald-600 bg-emerald-50 border-emerald-200",
  Good: "text-green-600 bg-green-50 border-green-200",
  Fair: "text-yellow-600 bg-yellow-50 border-yellow-200",
  Poor: "text-orange-600 bg-orange-50 border-orange-200",
  Critical: "text-red-600 bg-red-50 border-red-200",
};

const SCORE_BAR_COLORS: Record<string, string> = {
  Excellent: "bg-emerald-500",
  Good: "bg-green-500",
  Fair: "bg-yellow-500",
  Poor: "bg-orange-500",
  Critical: "bg-red-500",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " at " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("vetHistory");
      if (raw) setEntries(JSON.parse(raw));
    } catch {
      // corrupted storage
    }
  }, []);

  const deleteEntry = (id: number) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    localStorage.setItem("vetHistory", JSON.stringify(updated));
    if (selected?.id === id) setSelected(null);
  };

  const clearAll = () => {
    setEntries([]);
    setSelected(null);
    localStorage.removeItem("vetHistory");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AI Vet Doctor" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Vet Doctor</h1>
              <p className="text-xs text-gray-500">Smart Care. Healthier Pets.</p>
            </div>
          </div>
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            New Analysis
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analysis History</h2>
            <p className="text-sm text-gray-500 mt-1">
              {mounted ? `${entries.length} record${entries.length !== 1 ? "s" : ""}` : "Loading…"}
            </p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {!mounted ? null : entries.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <div className="text-6xl mb-4">🐾</div>
            <p className="text-lg font-medium">No analyses yet</p>
            <p className="text-sm mt-1">Your past results will appear here.</p>
            <a
              href="/"
              className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition-colors"
            >
              Analyze a pet
            </a>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* List */}
            <div className="w-72 shrink-0 space-y-3">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all shadow-sm ${
                    selected?.id === entry.id
                      ? "border-teal-400 bg-teal-50"
                      : "border-gray-100 bg-white hover:border-teal-200 hover:bg-teal-50/30"
                  }`}
                >
                  <div className="flex gap-3 items-center">
                    {entry.imagePreview ? (
                      <img
                        src={entry.imagePreview}
                        alt={entry.analysis.animalType}
                        className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                        🐾
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{entry.analysis.animalType}</p>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[entry.analysis.healthStatus] || "text-gray-600 bg-gray-50 border-gray-200"}`}>
                        {entry.analysis.healthStatus}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(entry.timestamp)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Detail */}
            <div className="flex-1 min-w-0">
              {!selected ? (
                <div className="h-full flex items-center justify-center text-gray-400 bg-white rounded-2xl border border-gray-100 py-20">
                  <p className="text-sm">Select a record to view details</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selected.analysis.animalType}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(selected.timestamp)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${STATUS_COLORS[selected.analysis.healthStatus] || "text-gray-600 bg-gray-50 border-gray-200"}`}>
                        {selected.analysis.healthStatus}
                      </span>
                      <button
                        onClick={() => deleteEntry(selected.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {selected.imagePreview && (
                    <img
                      src={selected.imagePreview}
                      alt={selected.analysis.animalType}
                      className="w-full max-h-52 object-contain rounded-xl bg-gray-50"
                    />
                  )}

                  {/* Score */}
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Health Score</p>
                      <span className="text-2xl font-bold text-gray-900">
                        {selected.analysis.healthScore}
                        <span className="text-sm font-normal text-gray-400">/10</span>
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${SCORE_BAR_COLORS[selected.analysis.healthStatus] || "bg-gray-400"}`}
                        style={{ width: `${selected.analysis.healthScore * 10}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">{selected.analysis.summary}</p>

                  {selected.analysis.observations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Observations</p>
                      <ul className="space-y-1.5">
                        {selected.analysis.observations.map((o, i) => (
                          <li key={i} className="text-sm text-gray-600 flex gap-2">
                            <span className="text-blue-400 shrink-0">•</span>{o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selected.analysis.concerns.length > 0 && (
                    <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">Concerns</p>
                      <ul className="space-y-1.5">
                        {selected.analysis.concerns.map((c, i) => (
                          <li key={i} className="text-sm text-orange-700 flex gap-2">
                            <span className="shrink-0">•</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selected.analysis.recommendations.length > 0 && (
                    <div className="bg-teal-50 rounded-xl border border-teal-100 p-4">
                      <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">Recommendations</p>
                      <ul className="space-y-1.5">
                        {selected.analysis.recommendations.map((r, i) => (
                          <li key={i} className="text-sm text-teal-700 flex gap-2">
                            <span className="shrink-0 font-bold">{i + 1}.</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
