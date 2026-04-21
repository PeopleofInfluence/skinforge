"use client";

import { useState, useRef, useCallback } from "react";
import { loadSkinImageData } from "@/lib/minecraft-skin";

interface SkinMergerProps {
  onMergeComplete: (imageData: ImageData) => void;
}

export function SkinMerger({ onMergeComplete }: SkinMergerProps) {
  const [skinAData, setSkinAData] = useState<ImageData | null>(null);
  const [skinBData, setSkinBData] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileARef = useRef<HTMLInputElement>(null);
  const fileBRef = useRef<HTMLInputElement>(null);

  const handleFileLoad = useCallback(
    async (file: File, slot: "A" | "B") => {
      try {
        const data = await loadSkinImageData(file);
        if (slot === "A") setSkinAData(data);
        else setSkinBData(data);
        setError(null);
      } catch {
        setError(`Failed to load skin ${slot}.`);
      }
    },
    []
  );

  const handleMerge = useCallback(async () => {
    if (!skinAData || !skinBData) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/merge-skins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pixelsA: Array.from(skinAData.data),
          pixelsB: Array.from(skinBData.data),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Merge failed.");

      const pixels = new Uint8ClampedArray(data.pixels);
      const merged = new ImageData(pixels, 64, 64);
      onMergeComplete(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [skinAData, skinBData, onMergeComplete]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Skin A */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-forge-text-muted">Outfit from</label>
          <div
            className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
              skinAData
                ? "border-forge-success/60 bg-forge-success/5"
                : "border-forge-border hover:border-forge-accent/40"
            }`}
            onClick={() => fileARef.current?.click()}
          >
            <input
              ref={fileARef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileLoad(f, "A");
              }}
            />
            {skinAData ? (
              <span className="text-xs text-forge-success">✓ Loaded</span>
            ) : (
              <span className="text-xs text-forge-text-muted">Skin A</span>
            )}
          </div>
        </div>

        {/* Skin B */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-forge-text-muted">Face from</label>
          <div
            className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
              skinBData
                ? "border-forge-success/60 bg-forge-success/5"
                : "border-forge-border hover:border-forge-accent/40"
            }`}
            onClick={() => fileBRef.current?.click()}
          >
            <input
              ref={fileBRef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileLoad(f, "B");
              }}
            />
            {skinBData ? (
              <span className="text-xs text-forge-success">✓ Loaded</span>
            ) : (
              <span className="text-xs text-forge-text-muted">Skin B</span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-forge-text-muted text-center">
        Outfit + arms + legs from A · Face from B
      </p>

      <button
        onClick={handleMerge}
        disabled={!skinAData || !skinBData || loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Spinner /> Merging…</>
        ) : (
          <><MergeIcon /> Merge Skins</>
        )}
      </button>

      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
function MergeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}
