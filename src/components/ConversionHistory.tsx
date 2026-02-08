"use client";

import { useEffect, useState } from "react";

interface HistoryItem {
  id: string;
  status: string;
  original_url?: string;
  result_url?: string;
  created_at?: string;
  frame_count?: number;
}

export default function ConversionHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/history");
        const data = await res.json();
        setHistory(data.history ?? []);
      } catch {
        // Silently handle history fetch errors
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="text-center text-white/30 py-8">
        Loading history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center text-white/30 py-8">
        No conversions yet. Upload a video to get started!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <div
          key={item.id}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-white/80 text-sm font-mono">
              {item.id.slice(0, 8)}...
            </p>
            <p className="text-white/40 text-xs">
              {item.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : "Unknown date"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                item.status === "completed"
                  ? "bg-green-500/20 text-green-300"
                  : item.status === "failed"
                    ? "bg-red-500/20 text-red-300"
                    : item.status === "processing"
                      ? "bg-yellow-500/20 text-yellow-300"
                      : "bg-white/10 text-white/50"
              }`}
            >
              {item.status}
            </span>
            {item.result_url && (
              <a
                href={item.result_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
