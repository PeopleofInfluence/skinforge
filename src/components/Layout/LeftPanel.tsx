"use client";

import { useState } from "react";
import { ToolBar } from "@/components/Editor/ToolBar";
import { ColorPicker } from "@/components/Editor/ColorPicker";
import { LayerPanel } from "@/components/Editor/LayerPanel";
import type { EditorState, Tool, LayerName } from "@/types";

interface LeftPanelProps {
  editorState: EditorState;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onLayerSelect: (name: LayerName) => void;
  onToggleLayerVisibility: (name: LayerName) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleGrid: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
  onExport: () => void;
}

type Tab = "tools" | "colour" | "layers";

export function LeftPanel({
  editorState,
  onToolChange,
  onColorChange,
  onLayerSelect,
  onToggleLayerVisibility,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
  onExport,
}: LeftPanelProps) {
  const [tab, setTab] = useState<Tab>("tools");

  const tabs: { id: Tab; label: string }[] = [
    { id: "tools", label: "Tools" },
    { id: "colour", label: "Colour" },
    { id: "layers", label: "Layers" },
  ];

  return (
    <div className="flex flex-col h-full bg-forge-panel border-r border-forge-border w-52 shrink-0">
      {/* Tab bar */}
      <div className="flex border-b border-forge-border">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === id
                ? "text-forge-text border-b-2 border-forge-accent"
                : "text-forge-text-muted hover:text-forge-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "tools" && (
          <ToolBar
            activeTool={editorState.tool}
            onSelectTool={onToolChange}
            zoom={editorState.zoom}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            showGrid={editorState.showGrid}
            onToggleGrid={onToggleGrid}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onClear={onClear}
            onExport={onExport}
          />
        )}
        {tab === "colour" && (
          <ColorPicker color={editorState.color} onChange={onColorChange} />
        )}
        {tab === "layers" && (
          <LayerPanel
            activeLayer={editorState.activeLayer}
            layers={editorState.layers}
            onSelectLayer={onLayerSelect}
            onToggleVisibility={onToggleLayerVisibility}
          />
        )}
      </div>
    </div>
  );
}
