"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  MutableRefObject,
} from "react";
import {
  hexToRgba,
  floodFill,
  rgbaToHex,
  SKIN_WIDTH,
  SKIN_HEIGHT,
  createBlankSkin,
} from "@/lib/minecraft-skin";
import type { Tool, EditorState } from "@/types";

interface UsePixelEditorOptions {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  editorState: EditorState;
  onColorPick?: (color: string) => void;
  onPixelsChange?: (imageData: ImageData) => void;
}

function cloneImageData(data: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
}

export function usePixelEditor({
  canvasRef,
  editorState,
  onColorPick,
  onPixelsChange,
}: UsePixelEditorOptions) {
  const [imageData, setImageDataState] = useState<ImageData>(createBlankSkin());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const futureRef = useRef<ImageData[]>([]);

  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const clipboardRef = useRef<{ data: Uint8ClampedArray; w: number; h: number; ox: number; oy: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Keep refs to current values — avoids ALL stale closure issues
  const imageDataRef = useRef<ImageData>(imageData);
  const editorStateRef = useRef<EditorState>(editorState);
  const onColorPickRef = useRef(onColorPick);
  const onPixelsChangeRef = useRef(onPixelsChange);

  useEffect(() => { imageDataRef.current = imageData; }, [imageData]);
  // Sync immediately — don't wait for next effect flush
  editorStateRef.current = editorState;
  useEffect(() => { onColorPickRef.current = onColorPick; }, [onColorPick]);
  useEffect(() => { onPixelsChangeRef.current = onPixelsChange; }, [onPixelsChange]);

  const setImageData = useCallback((data: ImageData) => {
    imageDataRef.current = data;
    setImageDataState(data);
  }, []);

  // Commit current state to undo history before a change
  const commitHistory = useCallback(() => {
    historyRef.current.push(cloneImageData(imageDataRef.current));
    if (historyRef.current.length > 50) historyRef.current.shift();
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  // Draw imageData to canvas
  const render = useCallback(
    (data: ImageData) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, SKIN_WIDTH, SKIN_HEIGHT);
      ctx.putImageData(data, 0, 0);

      const { showGrid, zoom } = editorStateRef.current;
      if (showGrid && zoom >= 4) {
        // 1 CSS pixel grid lines regardless of zoom level
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1 / zoom;
        for (let x = 0; x <= SKIN_WIDTH; x++) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SKIN_HEIGHT); ctx.stroke();
        }
        for (let y = 0; y <= SKIN_HEIGHT; y++) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SKIN_WIDTH, y); ctx.stroke();
        }
      }

      // Selection overlay — drawn on top of grid
      const sel = selectionRectRef.current;
      if (sel && sel.w > 0 && sel.h > 0) {
        ctx.save();
        ctx.lineWidth = 1.5 / zoom;
        // White dashes
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.setLineDash([3 / zoom, 2 / zoom]);
        ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
        // Black dashes offset to create marching-ants effect
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineDashOffset = 5 / zoom;
        ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
        ctx.setLineDash([]);
        ctx.restore();
      }
    },
    [canvasRef]
  );

  useEffect(() => { render(imageData); }, [imageData, render]);

  // Re-render when grid/zoom changes without changing imageData
  useEffect(() => {
    render(imageDataRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorState.showGrid, editorState.zoom]);

  // Re-render when selection rect changes
  useEffect(() => {
    render(imageDataRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionRect]);

  // Clear selection when switching away from select tool
  useEffect(() => {
    if (editorState.tool !== "select") {
      selectionRectRef.current = null;
      selectionStartRef.current = null;
      setSelectionRect(null);
    }
  }, [editorState.tool]);

  const getPixelCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = SKIN_WIDTH / rect.width;
      const scaleY = SKIN_HEIGHT / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      if (x < 0 || x >= SKIN_WIDTH || y < 0 || y >= SKIN_HEIGHT) return null;
      return { x, y };
    },
    [canvasRef]
  );

  const paintPixel = useCallback(
    (data: ImageData, x: number, y: number, tool: Tool, color: string, brushSize: number): ImageData => {
      const newData = cloneImageData(data);
      const [r, g, b, a] = hexToRgba(color);

      // Paint a square of brushSize × brushSize pixels, offset so cursor is top-left corner
      // (matches Photoshop / most editors: brush grows down-right from cursor for even sizes,
      //  centred for odd sizes)
      const half = Math.floor((brushSize - 1) / 2);
      for (let dy = -half; dy < brushSize - half; dy++) {
        for (let dx = -half; dx < brushSize - half; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px < 0 || px >= SKIN_WIDTH || py < 0 || py >= SKIN_HEIGHT) continue;
          const idx = (py * SKIN_WIDTH + px) * 4;

          if (tool === "eraser") {
            newData.data[idx] = 0;
            newData.data[idx + 1] = 0;
            newData.data[idx + 2] = 0;
            newData.data[idx + 3] = 0;
          } else if (tool === "pencil") {
            newData.data[idx] = r;
            newData.data[idx + 1] = g;
            newData.data[idx + 2] = b;
            newData.data[idx + 3] = a;
          } else if (tool === "brighten") {
            if (newData.data[idx + 3] > 0) {
              newData.data[idx]     = Math.min(255, Math.round(newData.data[idx] * 1.25));
              newData.data[idx + 1] = Math.min(255, Math.round(newData.data[idx + 1] * 1.25));
              newData.data[idx + 2] = Math.min(255, Math.round(newData.data[idx + 2] * 1.25));
            }
          } else if (tool === "darken") {
            if (newData.data[idx + 3] > 0) {
              newData.data[idx]     = Math.round(newData.data[idx] * 0.75);
              newData.data[idx + 1] = Math.round(newData.data[idx + 1] * 0.75);
              newData.data[idx + 2] = Math.round(newData.data[idx + 2] * 0.75);
            }
          }
        }
      }
      return newData;
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getPixelCoords(e);
      if (!pos) return;

      // Always read tool/color from ref — never stale
      const { tool, color } = editorStateRef.current;

      if (tool === "select") {
        selectionStartRef.current = pos;
        selectionRectRef.current = null;
        setSelectionRect(null);
        isDrawing.current = true;
        return;
      }

      if (tool === "eyedropper") {
        const current = imageDataRef.current;
        const idx = (pos.y * SKIN_WIDTH + pos.x) * 4;
        const hex = rgbaToHex(
          current.data[idx],
          current.data[idx + 1],
          current.data[idx + 2]
        );
        onColorPickRef.current?.(hex);
        return;
      }

      if (tool === "fill") {
        commitHistory();
        const [r, g, b, a] = hexToRgba(color);
        const filled = floodFill(
          imageDataRef.current,
          pos.x, pos.y,
          [r, g, b, a],
          editorStateRef.current.fillTolerance
        );
        setImageData(filled);
        onPixelsChangeRef.current?.(filled);
        return;
      }

      // Pencil, eraser, brighten, darken — start stroke
      commitHistory();
      isDrawing.current = true;
      lastPos.current = pos;
      const bs = editorStateRef.current.brushSize;
      let updated = paintPixel(imageDataRef.current, pos.x, pos.y, tool, color, bs);
      if (editorStateRef.current.symmetry) {
        updated = paintPixel(updated, SKIN_WIDTH - 1 - pos.x, pos.y, tool, color, bs);
      }
      setImageData(updated);
      onPixelsChangeRef.current?.(updated);
    },
    [commitHistory, getPixelCoords, paintPixel, setImageData]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      const pos = getPixelCoords(e);
      if (!pos) return;

      const { tool, color } = editorStateRef.current;

      if (tool === "select" && isDrawing.current && selectionStartRef.current) {
        const start = selectionStartRef.current;
        const x = Math.min(start.x, pos.x);
        const y = Math.min(start.y, pos.y);
        const w = Math.abs(pos.x - start.x) + 1;
        const h = Math.abs(pos.y - start.y) + 1;
        const rect = { x, y, w, h };
        selectionRectRef.current = rect;
        setSelectionRect(rect);
        return;
      }

      if (
        tool === "pencil" ||
        tool === "eraser" ||
        tool === "brighten" ||
        tool === "darken"
      ) {
        const last = lastPos.current ?? pos;
        const dx = pos.x - last.x;
        const dy = pos.y - last.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);

        let current = imageDataRef.current;
        const bs = editorStateRef.current.brushSize;
        const sym = editorStateRef.current.symmetry;
        for (let i = 0; i <= steps; i++) {
          const ix = Math.round(last.x + (dx * i) / steps);
          const iy = Math.round(last.y + (dy * i) / steps);
          current = paintPixel(current, ix, iy, tool, color, bs);
          if (sym) {
            current = paintPixel(current, SKIN_WIDTH - 1 - ix, iy, tool, color, bs);
          }
        }
        lastPos.current = pos;
        setImageData(current);
        onPixelsChangeRef.current?.(current);
      }
    },
    [getPixelCoords, paintPixel, setImageData]
  );

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) {
      futureRef.current.push(cloneImageData(imageDataRef.current));
      setImageData(prev);
      onPixelsChangeRef.current?.(prev);
      setCanUndo(historyRef.current.length > 0);
      setCanRedo(true);
    }
  }, [setImageData]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (next) {
      historyRef.current.push(cloneImageData(imageDataRef.current));
      setImageData(next);
      onPixelsChangeRef.current?.(next);
      setCanUndo(true);
      setCanRedo(futureRef.current.length > 0);
    }
  }, [setImageData]);

  const loadImageData = useCallback(
    (data: ImageData) => {
      historyRef.current = [];
      futureRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      setImageData(cloneImageData(data));
      onPixelsChangeRef.current?.(data);
    },
    [setImageData]
  );

  const copySelection = useCallback(() => {
    const sel = selectionRectRef.current;
    if (!sel) return;
    const src = imageDataRef.current;
    const pixels = new Uint8ClampedArray(sel.w * sel.h * 4);
    for (let row = 0; row < sel.h; row++) {
      for (let col = 0; col < sel.w; col++) {
        const srcIdx = ((sel.y + row) * SKIN_WIDTH + (sel.x + col)) * 4;
        const dstIdx = (row * sel.w + col) * 4;
        pixels[dstIdx]     = src.data[srcIdx];
        pixels[dstIdx + 1] = src.data[srcIdx + 1];
        pixels[dstIdx + 2] = src.data[srcIdx + 2];
        pixels[dstIdx + 3] = src.data[srcIdx + 3];
      }
    }
    clipboardRef.current = { data: pixels, w: sel.w, h: sel.h, ox: sel.x, oy: sel.y };
  }, []);

  const deleteSelection = useCallback(() => {
    const sel = selectionRectRef.current;
    if (!sel) return;
    commitHistory();
    const newData = cloneImageData(imageDataRef.current);
    for (let row = 0; row < sel.h; row++) {
      for (let col = 0; col < sel.w; col++) {
        const idx = ((sel.y + row) * SKIN_WIDTH + (sel.x + col)) * 4;
        newData.data[idx] = 0;
        newData.data[idx + 1] = 0;
        newData.data[idx + 2] = 0;
        newData.data[idx + 3] = 0;
      }
    }
    setImageData(newData);
    onPixelsChangeRef.current?.(newData);
  }, [commitHistory, setImageData]);

  const cutSelection = useCallback(() => {
    copySelection();
    deleteSelection();
  }, [copySelection, deleteSelection]);

  const pasteClipboard = useCallback(() => {
    const clip = clipboardRef.current;
    if (!clip) return;
    commitHistory();
    const newData = cloneImageData(imageDataRef.current);
    for (let row = 0; row < clip.h; row++) {
      for (let col = 0; col < clip.w; col++) {
        const srcIdx = (row * clip.w + col) * 4;
        const px = clip.ox + col;
        const py = clip.oy + row;
        if (px < 0 || px >= SKIN_WIDTH || py < 0 || py >= SKIN_HEIGHT) continue;
        const dstIdx = (py * SKIN_WIDTH + px) * 4;
        newData.data[dstIdx]     = clip.data[srcIdx];
        newData.data[dstIdx + 1] = clip.data[srcIdx + 1];
        newData.data[dstIdx + 2] = clip.data[srcIdx + 2];
        newData.data[dstIdx + 3] = clip.data[srcIdx + 3];
      }
    }
    setImageData(newData);
    onPixelsChangeRef.current?.(newData);
  }, [commitHistory, setImageData]);

  // Clipboard keyboard shortcuts — only active when select tool is chosen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editorStateRef.current.tool !== "select") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "c") { e.preventDefault(); copySelection(); }
        else if (e.key === "x") { e.preventDefault(); cutSelection(); }
        else if (e.key === "v") { e.preventDefault(); pasteClipboard(); }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelection();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [copySelection, cutSelection, pasteClipboard, deleteSelection]);

  return {
    imageData,
    setImageData: loadImageData,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
