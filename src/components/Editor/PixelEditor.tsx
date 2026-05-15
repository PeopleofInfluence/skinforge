"use client";

import { useRef, useEffect, useCallback } from "react";
import { usePixelEditor } from "@/hooks/usePixelEditor";
import { SKIN_WIDTH, SKIN_HEIGHT } from "@/lib/minecraft-skin";
import type { EditorState } from "@/types";

interface PixelEditorProps {
  editorState: EditorState;
  onColorPick: (color: string) => void;
  onPixelsChange: (imageData: ImageData) => void;
  externalImageData?: ImageData | null;
  onUndoRef?: (fn: () => void) => void;
  onRedoRef?: (fn: () => void) => void;
  onUndoStateChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export function PixelEditor({
  editorState,
  onColorPick,
  onPixelsChange,
  externalImageData,
  onUndoRef,
  onRedoRef,
  onUndoStateChange,
}: PixelEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    imageData,
    setImageData,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    undo,
    redo,
    canUndo,
    canRedo,
  } = usePixelEditor({
    canvasRef,
    editorState,
    onColorPick,
    onPixelsChange,
  });

  // Expose undo/redo via refs so parent can call them
  useEffect(() => {
    onUndoRef?.(undo);
    onRedoRef?.(redo);
  }, [undo, redo, onUndoRef, onRedoRef]);

  // Notify parent when undo/redo availability changes
  useEffect(() => {
    onUndoStateChange?.(canUndo, canRedo);
  }, [canUndo, canRedo, onUndoStateChange]);

  // Load external image data when it changes (from AI gen / upload)
  useEffect(() => {
    if (externalImageData) {
      setImageData(externalImageData);
    }
  }, [externalImageData, setImageData]);

  // Note: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z are handled by the global listener in
  // SkinForgeApp so they work in all view modes (2D, 3D paint, split, etc.).
  // The app-level handler calls undoFnRef / redoFnRef which point to the undo/redo
  // functions below, so no duplicate listener is needed here.

  // Prevent context menu on canvas
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => e.preventDefault(),
    []
  );

  const canvasSize = editorState.zoom * SKIN_WIDTH;

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full overflow-auto"
    >
      <div className="relative checkerboard" style={{ width: canvasSize, height: canvasSize }}>
        <canvas
          ref={canvasRef}
          width={SKIN_WIDTH}
          height={SKIN_HEIGHT}
          style={{
            width: canvasSize,
            height: canvasSize,
            imageRendering: "pixelated",
            cursor:
              editorState.tool === "eyedropper"
                ? "crosshair"
                : editorState.tool === "fill"
                ? "cell"
                : "crosshair",
          }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onContextMenu={handleContextMenu}
        />
      </div>
    </div>
  );
}
