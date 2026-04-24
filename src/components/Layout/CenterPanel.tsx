"use client";

import { useState } from "react";
import { PixelEditor } from "@/components/Editor/PixelEditor";
import { SkinPreview3D } from "@/components/Preview/SkinPreview3D";
import { SkinPainter3D } from "@/components/Preview/SkinPainter3D";
import type { EditorState, BodyType, AnimationType } from "@/types";

interface CenterPanelProps {
  editorState: EditorState;
  onColorPick: (color: string) => void;
  onPixelsChange: (imageData: ImageData) => void;
  externalImageData?: ImageData | null;
  onUndoRef?: (fn: () => void) => void;
  onRedoRef?: (fn: () => void) => void;
  previewImageData: ImageData | null;
  bodyType: BodyType;
}

type ViewMode = "editor" | "preview" | "split" | "paint3d";

export function CenterPanel({
  editorState,
  onColorPick,
  onPixelsChange,
  externalImageData,
  onUndoRef,
  onRedoRef,
  previewImageData,
  bodyType,
}: CenterPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [animation, setAnimation] = useState<AnimationType>("idle");
  const [rotating, setRotating] = useState(true);

  const [brushSize, setBrushSize] = useState(1);

  const modes: { id: ViewMode; label: string }[] = [
    { id: "editor", label: "2D Edit" },
    { id: "split", label: "Split" },
    { id: "preview", label: "3D View" },
    { id: "paint3d", label: "🖌️ 3D Paint" },
  ];

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-forge-border bg-forge-panel shrink-0">
        {/* View mode toggles */}
        <div className="flex bg-forge-bg rounded-md p-0.5">
          {modes.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === id
                  ? "bg-forge-accent text-white"
                  : "text-forge-text-muted hover:text-forge-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Preview controls */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="flex items-center gap-2">
            <select
              value={animation}
              onChange={(e) => setAnimation(e.target.value as AnimationType)}
              className="forge-input text-xs py-1 w-auto"
            >
              <option value="idle">Idle</option>
              <option value="walk">Walk</option>
              <option value="run">Run</option>
            </select>
            <button
              onClick={() => setRotating(!rotating)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                rotating ? "bg-forge-accent/20 text-forge-accent" : "text-forge-text-muted hover:text-forge-text"
              }`}
              title="Toggle auto-rotate"
            >
              <RotateIcon />
            </button>
          </div>
        )}

        {/* 3D Paint controls */}
        {viewMode === "paint3d" && (
          <div className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded-sm border-2 border-forge-border shrink-0"
              style={{ backgroundColor: editorState.color }}
              title="Current colour"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-forge-text-muted">Brush</span>
              {[1, 2, 3].map((size) => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
                    brushSize === size
                      ? "bg-forge-accent text-white"
                      : "bg-forge-border text-forge-text-muted hover:text-forge-text"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-1 min-h-0">
        {/* Pixel editor */}
        {(viewMode === "editor" || viewMode === "split") && (
          <div
            className={`flex-1 min-w-0 overflow-hidden ${
              viewMode === "split" ? "border-r border-forge-border" : ""
            }`}
          >
            <PixelEditor
              editorState={editorState}
              onColorPick={onColorPick}
              onPixelsChange={onPixelsChange}
              externalImageData={externalImageData}
              onUndoRef={onUndoRef}
              onRedoRef={onRedoRef}
            />
          </div>
        )}

        {/* 3D Preview */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div
            className={`${
              viewMode === "split" ? "w-56 shrink-0" : "flex-1"
            } bg-forge-bg flex items-center justify-center p-4`}
          >
            <SkinPreview3D
              imageData={previewImageData}
              bodyType={bodyType}
              animation={animation}
              rotating={rotating}
            />
          </div>
        )}

        {/* 3D Paint mode */}
        {viewMode === "paint3d" && (
          <div className="flex-1 min-w-0 h-full">
            <SkinPainter3D
              imageData={previewImageData}
              bodyType={bodyType}
              color={editorState.color}
              brushSize={brushSize}
              onPixelsPaint={onPixelsChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function RotateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
  );
}
