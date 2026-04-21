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

export function usePixelEditor({
  canvasRef,
  editorState,
  onColorPick,
  onPixelsChange,
}: UsePixelEditorOptions) {
  const [imageData, setImageData] = useState<ImageData>(createBlankSkin());
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const futureRef = useRef<ImageData[]>([]);

  // Commit current state to undo history
  const commitHistory = useCallback(() => {
    historyRef.current.push(
      new ImageData(new Uint8ClampedArray(imageData.data), SKIN_WIDTH, SKIN_HEIGHT)
    );
    if (historyRef.current.length > 50) historyRef.current.shift();
    futureRef.current = [];
  }, [imageData]);

  // Draw imageData to canvas
  const render = useCallback(
    (data: ImageData) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, SKIN_WIDTH, SKIN_HEIGHT);
      ctx.putImageData(data, 0, 0);

      // Draw grid if enabled
      if (editorState.showGrid && editorState.zoom >= 4) {
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 0.5 / editorState.zoom;
        for (let x = 0; x <= SKIN_WIDTH; x++) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, SKIN_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y <= SKIN_HEIGHT; y++) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(0 + SKIN_WIDTH, y);
          ctx.stroke();
        }
      }
    },
    [canvasRef, editorState.showGrid, editorState.zoom]
  );

  useEffect(() => {
    render(imageData);
  }, [imageData, render]);

  // Convert mouse/touch event to skin pixel coordinates
  const getPixelCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent): { x: number; y: number } | null => {
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

  // Paint a single pixel
  const paintPixel = useCallback(
    (data: ImageData, x: number, y: number, tool: Tool, color: string): ImageData => {
      const newData = new ImageData(
        new Uint8ClampedArray(data.data),
        data.width,
        data.height
      );

      if (tool === "eraser") {
        const idx = (y * SKIN_WIDTH + x) * 4;
        newData.data[idx] = 0;
        newData.data[idx + 1] = 0;
        newData.data[idx + 2] = 0;
        newData.data[idx + 3] = 0;
      } else if (tool === "pencil") {
        const [r, g, b, a] = hexToRgba(color);
        const idx = (y * SKIN_WIDTH + x) * 4;
        newData.data[idx] = r;
        newData.data[idx + 1] = g;
        newData.data[idx + 2] = b;
        newData.data[idx + 3] = a;
      }

      return newData;
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getPixelCoords(e);
      if (!pos) return;

      const { tool, color } = editorState;

      if (tool === "eyedropper") {
        const idx = (pos.y * SKIN_WIDTH + pos.x) * 4;
        const r = imageData.data[idx];
        const g = imageData.data[idx + 1];
        const b = imageData.data[idx + 2];
        onColorPick?.(rgbaToHex(r, g, b));
        return;
      }

      if (tool === "fill") {
        commitHistory();
        const [r, g, b, a] = hexToRgba(color);
        const filled = floodFill(imageData, pos.x, pos.y, [r, g, b, a]);
        setImageData(filled);
        onPixelsChange?.(filled);
        return;
      }

      commitHistory();
      isDrawing.current = true;
      lastPos.current = pos;

      const updated = paintPixel(imageData, pos.x, pos.y, tool, color);
      setImageData(updated);
      onPixelsChange?.(updated);
    },
    [
      commitHistory,
      editorState,
      getPixelCoords,
      imageData,
      onColorPick,
      onPixelsChange,
      paintPixel,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      const pos = getPixelCoords(e);
      if (!pos) return;

      const { tool, color } = editorState;
      if (tool === "pencil" || tool === "eraser") {
        // Interpolate between lastPos and pos for smooth lines
        const last = lastPos.current ?? pos;
        const dx = pos.x - last.x;
        const dy = pos.y - last.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);

        let current = imageData;
        for (let i = 0; i <= steps; i++) {
          const ix = Math.round(last.x + (dx * i) / steps);
          const iy = Math.round(last.y + (dy * i) / steps);
          current = paintPixel(current, ix, iy, tool, color);
        }
        lastPos.current = pos;
        setImageData(current);
        onPixelsChange?.(current);
      }
    },
    [editorState, getPixelCoords, imageData, onPixelsChange, paintPixel]
  );

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) {
      futureRef.current.push(
        new ImageData(new Uint8ClampedArray(imageData.data), SKIN_WIDTH, SKIN_HEIGHT)
      );
      setImageData(prev);
      onPixelsChange?.(prev);
    }
  }, [imageData, onPixelsChange]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (next) {
      historyRef.current.push(
        new ImageData(new Uint8ClampedArray(imageData.data), SKIN_WIDTH, SKIN_HEIGHT)
      );
      setImageData(next);
      onPixelsChange?.(next);
    }
  }, [imageData, onPixelsChange]);

  const loadImageData = useCallback(
    (data: ImageData) => {
      historyRef.current = [];
      futureRef.current = [];
      setImageData(new ImageData(new Uint8ClampedArray(data.data), data.width, data.height));
      onPixelsChange?.(data);
    },
    [onPixelsChange]
  );

  return {
    imageData,
    setImageData: loadImageData,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    undo,
    redo,
    canUndo: historyRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
