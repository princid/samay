"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface UploadZoneProps {
  onUploadStart: (conversionId: string) => void;
}

export default function UploadZone({ onUploadStart }: UploadZoneProps) {
  const [url, setUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (!file.name.toLowerCase().endsWith(".mp4")) {
        setError("Only .mp4 files are supported.");
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("video", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");

        onUploadStart(data.conversionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadStart]
  );

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;

    setError(null);
    setIsUploading(true);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      onUploadStart(data.conversionId);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/mp4": [".mp4"] },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="space-y-6">
      {/* Drag & Drop Zone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-purple-400 bg-purple-500/10"
            : "border-white/20 hover:border-white/40 bg-white/5"
        } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-lg font-medium text-white/90">
              {isDragActive
                ? "Drop your video here..."
                : "Drag & drop an .mp4 video"}
            </p>
            <p className="text-sm text-white/50 mt-1">
              or click to browse files
            </p>
          </div>
        </div>
      </div>

      {/* URL Input */}
      <div className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Or paste a public video URL..."
          disabled={isUploading}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
        />
        <button
          onClick={handleUrlSubmit}
          disabled={isUploading || !url.trim()}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium text-white hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          Convert
        </button>
      </div>

      {/* Loading State */}
      {isUploading && (
        <div className="flex items-center justify-center gap-3 text-purple-300">
          <svg
            className="animate-spin w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Uploading video...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
