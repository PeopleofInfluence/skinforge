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

  // Keep refs to current values — avoids ALL stale closure issues
  const imageDataRef = useRef<ImageData>(imageData);
  const editorStateRef = useRef<EditorState>(editorState);
  const onColorPickRef = useRef(onColorPick);
  const onPixelsChangeRef = useRef(onPixelsChange);

  useEffect(() => { imageDataRef.current = imageData; }, [imageData]);
  useEffect(() => { editorStateRef.current = editorState; }, [editorState]);
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
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 0.5 / zoom;
        for (let x = 0; x <= SKIN_WIDTH; x++) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SKIN_HEIGHT); ctx.stroke();
        }
        for (let y = 0; y <= SKIN_HEIGHT; y++) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SKIN_WIDTH, y); ctx.stroke();
        }
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
    (data: ImageData, x: number, y: number, tool: Tool, color: string): ImageData => {
      const newData = cloneImageData(data);
      const idx = (y * SKIN_WIDTH + x) * 4;

      if (tool === "eraser") {
        newData.data[idx] = 0;
        newData.data[idx + 1] = 0;
        newData.data[idx + 2] = 0;
        newData.data[idx + 3] = 0;
      } else if (tool === "pencil") {
        const [r, g, b, a] = hexToRgba(color);
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
        const filled = floodFill(imageDataRef.current, pos.x, pos.y, [r, g, b, a]);
        setImageData(filled);
        onPixelsChangeRef.current?.(filled);
        return;
      }

      // Pencil, eraser, brighten, darken — start stroke
      commitHistory();
      isDrawing.current = true;
      lastPos.current = pos;
      const updated = paintPixel(imageDataRef.current, pos.x, pos.y, tool, color);
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
        for (let i = 0; i <= steps; i++) {
          const ix = Math.round(last.x + (dx * i) / steps);
          const iy = Math.round(last.y + (dy * i) / steps);
          current = paintPixel(current, ix, iy, tool, color);
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
