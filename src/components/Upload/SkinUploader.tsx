"use client";

import { useState, useRef, useCallback, useId } from "react";
import { loadSkinImageData } from "@/lib/minecraft-skin";
import type { BodyType } from "@/types";

interface SkinUploaderProps {
  bodyType: BodyType;
  onSkinLoaded: (imageData: ImageData) => void;
}

export function SkinUploader({ bodyType, onSkinLoaded }: SkinUploaderProps) {
  const [remixPrompt, setRemixPrompt] = useState("");
  const [uploadedData, setUploadedData] = useState<ImageData | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [remixing, setRemixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please upload a PNG image.");
        return;
      }
      setError(null);
      try {
        const imageData = await loadSkinImageData(file);
        setUploadedData(imageData);

        // Convert to base64 for remix
        const reader = new FileReader();
        reader.onload = (e) => setUploadedBase64(e.target!.result as string);
        reader.readAsDataURL(file);

        onSkinLoaded(imageData);
      } catch {
        setError("Failed to load skin. Make sure it is a 64×64 PNG.");
      }
    },
    [onSkinLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemix = useCallback(async () => {
    if (!uploadedBase64 || !remixPrompt.trim() || remixing) return;
    setRemixing(true);
    setError(null);

    try {
      const res = await fetch("/api/remix-skin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: remixPrompt.trim(),
          imageBase64: uploadedBase64,
          bodyType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Remix failed.");

      const imageData = await loadSkinImageData(data.imageUrl);
      onSkinLoaded(imageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRemixing(false);
    }
  }, [uploadedBase64, remixPrompt, bodyType, remixing, onSkinLoaded]);

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-forge-accent bg-forge-accent/10"
            : "border-forge-border hover:border-forge-accent/50"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {uploadedData ? (
          <div className="flex flex-col items-center gap-1">
            <CheckIcon />
            <span className="text-xs text-forge-success">Skin loaded!</span>
            <span className="text-xs text-forge-text-muted">Click to replace</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <UploadIcon />
            <span className="text-xs text-forge-text">Drop or click to upload</span>
            <span className="text-xs text-forge-text-muted">64×64 PNG skin</span>
          </div>
        )}
      </div>

      {/* Remix section */}
      {uploadedBase64 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-forge-text-muted uppercase tracking-wide">
            Remix this skin
          </label>
          <textarea
            value={remixPrompt}
            onChange={(e) => setRemixPrompt(e.target.value)}
            placeholder="e.g. Make this look like a Viking..."
            rows={2}
            className="forge-input resize-none text-sm"
            disabled={remixing}
          />
          <button
            onClick={handleRemix}
            disabled={remixing || !remixPrompt.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {remixing ? (
              <><Spinner /> Remixing…</>
            ) : (
              <><RemixIcon /> Remix with AI</>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-forge-text-muted">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forge-success">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
function RemixIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
