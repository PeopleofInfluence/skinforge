"use client";

import { useState, useRef, useCallback } from "react";
import { loadSkinImageData } from "@/lib/minecraft-skin";

interface SkinMergerProps {
  onMergeComplete: (imageData: ImageData) => void;
}

type Source = "A" | "B";

interface PartDef {
  id: string;
  label: string;
  emoji: string;
  rects: { x: number; y: number; w: number; h: number }[];
}

// Each entry lists the full bounding box(es) of that body region in the
// Minecraft 64×64 UV texture, covering all faces (front, back, sides,
// top, bottom) for that part.
const PARTS: PartDef[] = [
  {
    id: "head",
    label: "Head",
    emoji: "🗣️",
    rects: [{ x: 0, y: 0, w: 32, h: 16 }],          // head inner all faces
  },
  {
    id: "hat",
    label: "Hat / Helm",
    emoji: "🎩",
    rects: [{ x: 32, y: 0, w: 32, h: 16 }],          // head outer all faces
  },
  {
    id: "body",
    label: "Body",
    emoji: "👕",
    rects: [{ x: 16, y: 16, w: 24, h: 16 }],         // body inner all faces
  },
  {
    id: "jacket",
    label: "Jacket",
    emoji: "🧥",
    rects: [{ x: 16, y: 32, w: 16, h: 16 }],         // body outer all faces
  },
  {
    id: "arms",
    label: "Arms",
    emoji: "💪",
    rects: [
      { x: 40, y: 16, w: 16, h: 16 },                // right arm inner
      { x: 32, y: 48, w: 16, h: 16 },                // left arm inner
    ],
  },
  {
    id: "sleeves",
    label: "Sleeves",
    emoji: "🦺",
    rects: [
      { x: 40, y: 32, w: 16, h: 16 },                // right sleeve outer
      { x: 48, y: 48, w: 16, h: 16 },                // left sleeve outer
    ],
  },
  {
    id: "legs",
    label: "Legs",
    emoji: "🦵",
    rects: [
      { x: 0,  y: 16, w: 16, h: 16 },                // right leg inner
      { x: 16, y: 48, w: 16, h: 16 },                // left leg inner
    ],
  },
  {
    id: "pants",
    label: "Pants",
    emoji: "👖",
    rects: [
      { x: 0, y: 32, w: 16, h: 16 },                 // right leg outer
      { x: 0, y: 48, w: 16, h: 16 },                 // left leg outer
    ],
  },
];

function copyRects(
  src: ImageData,
  dst: Uint8ClampedArray,
  rects: { x: number; y: number; w: number; h: number }[]
) {
  const W = 64;
  for (const r of rects) {
    for (let y = r.y; y < r.y + r.h && y < 64; y++) {
      for (let x = r.x; x < r.x + r.w && x < 64; x++) {
        const idx = (y * W + x) * 4;
        dst[idx]     = src.data[idx];
        dst[idx + 1] = src.data[idx + 1];
        dst[idx + 2] = src.data[idx + 2];
        dst[idx + 3] = src.data[idx + 3];
      }
    }
  }
}

export function SkinMerger({ onMergeComplete }: SkinMergerProps) {
  const [skinA, setSkinA] = useState<ImageData | null>(null);
  const [skinB, setSkinB] = useState<ImageData | null>(null);
  const [previewA, setPreviewA] = useState<string | null>(null);
  const [previewB, setPreviewB] = useState<string | null>(null);
  const [sources, setSources] = useState<Record<string, Source>>(
    () => Object.fromEntries(PARTS.map((p) => [p.id, "A" as Source]))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merged, setMerged] = useState(false);

  const fileARef = useRef<HTMLInputElement>(null);
  const fileBRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(async (file: File, slot: "A" | "B") => {
    try {
      const data = await loadSkinImageData(file);
      const canvas = document.createElement("canvas");
      canvas.width = 64; canvas.height = 64;
      canvas.getContext("2d")!.putImageData(data, 0, 0);
      const url = canvas.toDataURL("image/png");
      if (slot === "A") { setSkinA(data); setPreviewA(url); }
      else              { setSkinB(data); setPreviewB(url); }
      setError(null);
      setMerged(false);
    } catch {
      setError(`Failed to load skin ${slot}.`);
    }
  }, []);

  const toggleSource = (partId: string) => {
    setSources((prev) => ({ ...prev, [partId]: prev[partId] === "A" ? "B" : "A" }));
    setMerged(false);
  };

  const setAllFrom = (src: Source) => {
    setSources(Object.fromEntries(PARTS.map((p) => [p.id, src])));
    setMerged(false);
  };

  const handleMerge = useCallback(() => {
    if (!skinA || !skinB) return;
    setLoading(true);
    setError(null);
    try {
      // Start with a copy of Skin A as the base
      const result = new Uint8ClampedArray(skinA.data);
      for (const part of PARTS) {
        const src = sources[part.id] === "B" ? skinB : skinA;
        copyRects(src, result, part.rects);
      }
      onMergeComplete(new ImageData(result, 64, 64));
      setMerged(true);
      setTimeout(() => setMerged(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setLoading(false);
    }
  }, [skinA, skinB, sources, onMergeComplete]);

  return (
    <div className="flex flex-col gap-3">
      {/* ── Skin upload slots ── */}
      <div className="grid grid-cols-2 gap-2">
        <SkinSlot
          label="Skin A"
          accentColor="blue"
          preview={previewA}
          onClick={() => fileARef.current?.click()}
        />
        <SkinSlot
          label="Skin B"
          accentColor="purple"
          preview={previewB}
          onClick={() => fileBRef.current?.click()}
        />
        <input
          ref={fileARef} type="file" accept="image/png" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f, "A"); e.target.value = ""; }}
        />
        <input
          ref={fileBRef} type="file" accept="image/png" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f, "B"); e.target.value = ""; }}
        />
      </div>

      {/* ── Part source selector ── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-forge-text-muted uppercase tracking-wide font-semibold">
            Parts — click to switch source
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setAllFrom("A")}
              className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
            >
              All A
            </button>
            <button
              onClick={() => setAllFrom("B")}
              className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
            >
              All B
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {PARTS.map((part) => (
            <PartToggle
              key={part.id}
              part={part}
              source={sources[part.id]}
              onToggle={() => toggleSource(part.id)}
            />
          ))}
        </div>

        <p className="text-xs text-forge-text-muted text-center pt-0.5">
          🔵 A &nbsp;·&nbsp; 🟣 B — mix and match any combination
        </p>
      </div>

      {/* ── Merge button ── */}
      <button
        onClick={handleMerge}
        disabled={!skinA || !skinB || loading}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <><Spinner /> Merging…</>
        ) : merged ? (
          <><CheckIcon /> Merged!</>
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

// ── Sub-components ──────────────────────────────────────────────────────────

function SkinSlot({
  label,
  accentColor,
  preview,
  onClick,
}: {
  label: string;
  accentColor: "blue" | "purple";
  preview: string | null;
  onClick: () => void;
}) {
  const ring  = accentColor === "blue"   ? "border-blue-500/50"   : "border-purple-500/50";
  const bg    = accentColor === "blue"   ? "bg-blue-500/5"        : "bg-purple-500/5";
  const badge = accentColor === "blue"   ? "text-blue-300"        : "text-purple-300";

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 border-2 border-dashed rounded-xl p-2.5 cursor-pointer transition-all hover:opacity-80 select-none ${
        preview ? `${ring} ${bg}` : "border-forge-border hover:border-forge-accent/40"
      }`}
    >
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={label}
            className="w-14 h-14 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
          <span className={`text-xs font-bold ${badge}`}>{label} ✓</span>
        </>
      ) : (
        <>
          <div className="w-14 h-14 flex items-center justify-center text-forge-text-muted text-3xl opacity-40">
            +
          </div>
          <span className="text-xs text-forge-text-muted">{label}</span>
        </>
      )}
    </div>
  );
}

function PartToggle({
  part,
  source,
  onToggle,
}: {
  part: PartDef;
  source: Source;
  onToggle: () => void;
}) {
  const isA = source === "A";
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-forge-border bg-forge-bg/40 hover:border-forge-accent/40 hover:bg-forge-border/20 transition-all text-left"
    >
      <span className="text-base leading-none">{part.emoji}</span>
      <span className="text-xs text-forge-text flex-1 font-medium">{part.label}</span>
      <span
        className={`text-xs font-bold px-1.5 py-0.5 rounded transition-colors ${
          isA
            ? "bg-blue-500/25 text-blue-300"
            : "bg-purple-500/25 text-purple-300"
        }`}
      >
        {source}
      </span>
    </button>
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
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
