"use client";

import { useEffect, useState } from "react";

interface StatusResponse {
  conversionId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  totalFrames: number;
  processedFrames: number;
  resultUrl?: string;
  errorMessage?: string;
}

interface ProcessingStatusProps {
  conversionId: string;
  onComplete: (resultUrl: string) => void;
  onError: (message: string) => void;
}

export default function ProcessingStatus({
  conversionId,
  onComplete,
  onError,
}: ProcessingStatusProps) {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/status?id=${conversionId}`);
        const data: StatusResponse = await res.json();
        setStatus(data);

        if (data.status === "completed" && data.resultUrl) {
          onComplete(data.resultUrl);
          clearInterval(interval);
        } else if (data.status === "failed") {
          onError(data.errorMessage ?? "Processing failed");
          clearInterval(interval);
        }
      } catch {
        // Continue polling on network errors
      }
    };

    pollStatus();
    interval = setInterval(pollStatus, 2000);

    return () => clearInterval(interval);
  }, [conversionId, onComplete, onError]);

  const progress = status?.progress ?? 0;
  const statusText =
    status?.status === "pending"
      ? "Queued — waiting to start..."
      : status?.status === "processing"
        ? `Processing frames (${status.processedFrames}/${status.totalFrames})...`
        : status?.status === "completed"
          ? "Complete!"
          : status?.status === "failed"
            ? "Failed"
            : "Initializing...";

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Conversion Status</h3>
        <span
          className={`text-xs font-mono px-3 py-1 rounded-full ${
            status?.status === "completed"
              ? "bg-green-500/20 text-green-300"
              : status?.status === "failed"
                ? "bg-red-500/20 text-red-300"
                : "bg-purple-500/20 text-purple-300"
          }`}
        >
          {status?.status ?? "pending"}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-white/50">
          <span>{statusText}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Animated dots for processing state */}
      {(status?.status === "pending" || status?.status === "processing") && (
        <div className="flex justify-center gap-1 pt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
