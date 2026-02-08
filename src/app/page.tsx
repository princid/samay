"use client";

import { useState } from "react";
import UploadZone from "@/components/UploadZone";
import ProcessingStatus from "@/components/ProcessingStatus";
import ConversionHistory from "@/components/ConversionHistory";

export default function Home() {
  const [conversionId, setConversionId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadStart = (id: string) => {
    setConversionId(id);
    setResultUrl(null);
    setError(null);
  };

  const handleComplete = (url: string) => {
    setResultUrl(url);
  };

  const handleError = (message: string) => {
    setError(message);
  };

  const handleReset = () => {
    setConversionId(null);
    setResultUrl(null);
    setError(null);
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-pink-900/20 blur-[120px]" />
        <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] rounded-full bg-indigo-900/10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-xl">✦</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Samay
              </h1>
              <p className="text-xs text-white/40">
                AI Video-to-Anime Converter
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/30 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>System Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Transform Videos into Anime
          </h2>
          <p className="text-white/50 max-w-lg mx-auto">
            Upload an MP4 video or paste a URL. Our AI will convert each frame
            into beautiful anime-style artwork.
          </p>
        </div>

        {/* Upload / Processing / Result */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 mb-8">
          {!conversionId && <UploadZone onUploadStart={handleUploadStart} />}

          {conversionId && !resultUrl && !error && (
            <ProcessingStatus
              conversionId={conversionId}
              onComplete={handleComplete}
              onError={handleError}
            />
          )}

          {resultUrl && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Conversion Complete!
                </h3>
                <p className="text-white/50 text-sm">
                  Your anime-style video is ready for download.
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <a
                  href={resultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium text-white hover:from-purple-500 hover:to-pink-500 transition-all duration-300 inline-flex items-center gap-2"
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
                  Download Video
                </a>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 border border-white/10 rounded-xl font-medium text-white/70 hover:text-white hover:border-white/20 transition-all duration-300"
                >
                  Convert Another
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Conversion Failed
                </h3>
                <p className="text-red-300/70 text-sm">{error}</p>
              </div>
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-white/10 rounded-xl font-medium text-white/70 hover:text-white hover:border-white/20 transition-all duration-300"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Conversion History */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white/80 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Recent Conversions
          </h3>
          <ConversionHistory />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-white/20 text-sm">
          <p>Samay — AI Video-to-Anime Converter • Built with Next.js, Hugging Face &amp; FFmpeg</p>
        </div>
      </footer>
    </main>
  );
}
