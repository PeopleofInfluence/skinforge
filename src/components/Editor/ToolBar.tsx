"use client";

import { useState } from "react";
import type { Tool } from "@/types";

interface ToolBarProps {
  activeTool: Tool;
  onSelectTool: (tool: Tool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  fillTolerance: number;
  onFillToleranceChange: (t: number) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  symmetry: boolean;
  onToggleSymmetry: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
  onExport: () => void;
  onFixDarkSides: () => void;
}

const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
  { id: "pencil", label: "Pencil (P)", icon: <PencilIcon /> },
  { id: "eraser", label: "Eraser (E)", icon: <EraserIcon /> },
  { id: "fill", label: "Fill (F)", icon: <FillIcon /> },
  { id: "eyedropper", label: "Eyedropper (I)", icon: <EyedropperIcon /> },
  { id: "brighten", label: "Brighten (B)", icon: <BrightenIcon /> },
  { id: "darken", label: "Darken (D)", icon: <DarkenIcon /> },
  { id: "select", label: "Select (S)", icon: <SelectIcon /> },
];

const BRUSH_TOOLS: Tool[] = ["pencil", "eraser", "brighten", "darken"];

export function ToolBar({
  activeTool,
  onSelectTool,
  brushSize,
  onBrushSizeChange,
  fillTolerance,
  onFillToleranceChange,
  zoom,
  onZoomIn,
  onZoomOut,
  showGrid,
  onToggleGrid,
  symmetry,
  onToggleSymmetry,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
  onExport,
  onFixDarkSides,
}: ToolBarProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleClearClick = () => {
    if (confirmClear) { onClear(); setConfirmClear(false); }
    else { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); }
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Drawing tools */}
      <div className="flex flex-col gap-0.5">
        {TOOLS.map(({ id, label, icon }) => (
          <button
            key={id}
            title={label}
            onClick={() => onSelectTool(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
              activeTool === id
                ? "bg-forge-accent text-white"
                : "text-forge-text-muted hover:text-forge-text hover:bg-forge-border"
            }`}
          >
            {icon}
            <span>{label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* Brush size — only shown for stroke tools */}
      {BRUSH_TOOLS.includes(activeTool) && (
        <div className="mt-1">
          <span className="text-xs text-forge-text-muted px-1">Size</span>
          <div className="flex gap-0.5 mt-0.5">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => onBrushSizeChange(s)}
                title={`Brush size ${s}px`}
                className={`flex-1 py-1 rounded text-xs font-bold transition-colors ${
                  brushSize === s
                    ? "bg-forge-accent text-white"
                    : "bg-forge-border text-forge-text-muted hover:text-forge-text"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fill tolerance — only shown for fill tool */}
      {activeTool === "fill" && (
        <div className="mt-1 px-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-forge-text-muted">Tolerance</span>
            <span className="text-xs text-forge-text-muted">{fillTolerance}</span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={fillTolerance}
            onChange={(e) => onFillToleranceChange(Number(e.target.value))}
            className="w-full accent-forge-accent h-1"
            title="Fill tolerance — higher = match more colours"
          />
        </div>
      )}

      <div className="border-t border-forge-border my-1" />

      {/* Undo / Redo */}
      <div className="flex gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs text-forge-text-muted hover:text-forge-text hover:bg-forge-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <UndoIcon />
          <span>Undo</span>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs text-forge-text-muted hover:text-forge-text hover:bg-forge-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <RedoIcon />
          <span>Redo</span>
        </button>
      </div>

      <div className="border-t border-forge-border my-1" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomOut}
          className="btn-ghost text-xs px-2 py-1"
          title="Zoom out"
        >
          −
        </button>
        <span className="flex-1 text-center text-xs text-forge-text-muted">
          {zoom}×
        </span>
        <button
          onClick={onZoomIn}
          className="btn-ghost text-xs px-2 py-1"
          title="Zoom in"
        >
          +
        </button>
      </div>

      {/* Grid toggle */}
      <button
        onClick={onToggleGrid}
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${
          showGrid
            ? "text-forge-accent bg-forge-accent/10"
            : "text-forge-text-muted hover:text-forge-text hover:bg-forge-border"
        }`}
      >
        <GridIcon />
        <span>Grid</span>
      </button>

      {/* Symmetry toggle */}
      <button
        onClick={onToggleSymmetry}
        title="Mirror painting horizontally across the skin"
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${
          symmetry
            ? "text-forge-accent bg-forge-accent/10"
            : "text-forge-text-muted hover:text-forge-text hover:bg-forge-border"
        }`}
      >
        <SymmetryIcon />
        <span>Symmetry</span>
      </button>

      <div className="border-t border-forge-border my-1" />

      {/* Fix dark sides */}
      <button
        onClick={onFixDarkSides}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-yellow-400 hover:bg-yellow-900/20 transition-colors"
        title="Spread colours into black side/back faces"
      >
        <WandIcon />
        <span>Fix Dark Sides</span>
      </button>

      <div className="border-t border-forge-border my-1" />

      {/* Danger zone */}
      <button
        onClick={handleClearClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${
          confirmClear
            ? "bg-red-500 text-white"
            : "text-red-400 hover:bg-red-900/20"
        }`}
        title={confirmClear ? "Click again to confirm" : "Clear canvas"}
      >
        <TrashIcon />
        <span>{confirmClear ? "Sure?" : "Clear"}</span>
      </button>

      <button
        onClick={onExport}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-forge-success hover:bg-green-900/20 transition-colors"
        title="Export skin PNG"
      >
        <DownloadIcon />
        <span>Export</span>
      </button>

      <div className="border-t border-forge-border my-1" />

      {/* Help */}
      <button
        onClick={() => setShowHelp(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-forge-text-muted hover:text-forge-text hover:bg-forge-border transition-colors"
        title="Keyboard shortcuts"
      >
        <HelpIcon />
        <span>Shortcuts</span>
      </button>

      {/* Shortcuts overlay */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setShowHelp(false)}
        >
          <div className="bg-forge-panel border border-forge-border rounded-xl shadow-2xl p-5 w-72" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-forge-text">Keyboard Shortcuts</h3>
              <button onClick={() => setShowHelp(false)} className="text-forge-text-muted hover:text-forge-text text-lg leading-none">×</button>
            </div>
            <div className="flex flex-col gap-1">
              {[
                ["P", "Pencil"],
                ["E", "Eraser"],
                ["F", "Fill"],
                ["I", "Eyedropper"],
                ["B", "Brighten"],
                ["D", "Darken"],
                ["S", "Select"],
                ["Ctrl+Z", "Undo"],
                ["Ctrl+Y / Ctrl+Shift+Z", "Redo"],
                ["+ / −", "Zoom in / out"],
                ["G", "Toggle grid"],
                ["— With Select tool —", ""],
                ["Ctrl+C", "Copy selection"],
                ["Ctrl+X", "Cut selection"],
                ["Ctrl+V", "Paste"],
                ["Delete", "Erase selection"],
              ].map(([key, label]) =>
                label === "" ? (
                  <div key={key} className="pt-2 pb-0.5">
                    <span className="text-xs font-semibold text-forge-text-muted uppercase tracking-wider">{key}</span>
                  </div>
                ) : (
                  <div key={key} className="flex items-center justify-between py-1 border-b border-forge-border/40 last:border-0">
                    <span className="text-xs text-forge-text-muted">{label}</span>
                    <kbd className="text-xs bg-forge-border px-1.5 py-0.5 rounded font-mono text-forge-text">{key}</kbd>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon components
function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function EraserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 20H7L3 16l10-10 7 7-3 3" /><path d="M6.0001 11L13 18" />
    </svg>
  );
}
function FillIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 11V21H5V11" /><path d="M21 7H3L12 2l9 5z" /><line x1="12" y1="12" x2="12" y2="21" />
    </svg>
  );
}
function EyedropperIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8Z" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" /><path d="M3 13C5 7.5 10 4 16 4a9 9 0 0 1 0 18" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" /><path d="M21 13C19 7.5 14 4 8 4a9 9 0 0 0 0 18" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function WandIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 4-1 1" /><path d="m18 1-1 1" /><path d="M21 7h-1" /><path d="M15.5 2.5 3 15l6 6 12.5-12.5-6-6Z" /><path d="m6 15 3 3" />
    </svg>
  );
}
function BrightenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function DarkenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function SelectIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="1" strokeDasharray="4 2" />
    </svg>
  );
}
function SymmetryIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="3" x2="12" y2="21" />
      <path d="M5 8l-3 4 3 4" />
      <path d="M19 8l3 4-3 4" />
      <line x1="2" y1="12" x2="10" y2="12" />
      <line x1="14" y1="12" x2="22" y2="12" />
    </svg>
  );
}
