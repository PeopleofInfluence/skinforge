"use client";

import type { Tool } from "@/types";

interface ToolBarProps {
  activeTool: Tool;
  onSelectTool: (tool: Tool) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
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
];

export function ToolBar({
  activeTool,
  onSelectTool,
  zoom,
  onZoomIn,
  onZoomOut,
  showGrid,
  onToggleGrid,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
  onExport,
  onFixDarkSides,
}: ToolBarProps) {
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
        onClick={onClear}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-red-400 hover:bg-red-900/20 transition-colors"
        title="Clear canvas"
      >
        <TrashIcon />
        <span>Clear</span>
      </button>

      <button
        onClick={onExport}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-forge-success hover:bg-green-900/20 transition-colors"
        title="Export skin PNG"
      >
        <DownloadIcon />
        <span>Export</span>
      </button>
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
