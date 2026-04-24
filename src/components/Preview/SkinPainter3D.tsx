"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback } from "react";
import type { BodyType } from "@/types";

interface SkinPainter3DProps {
  imageData: ImageData | null;
  bodyType: BodyType;
  color: string;
  brushSize?: number;
  onPixelsPaint: (imageData: ImageData) => void;
}

export function SkinPainter3D({
  imageData,
  bodyType,
  color,
  brushSize = 1,
  onPixelsPaint,
}: SkinPainter3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const isPaintingRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);

  // Keep latest values in refs so event handlers always have fresh data
  const imageDataRef = useRef<ImageData | null>(imageData);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const bodyTypeRef = useRef(bodyType);

  useEffect(() => { imageDataRef.current = imageData; }, [imageData]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { bodyTypeRef.current = bodyType; }, [bodyType]);

  const hexToRgb = useCallback((hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r
      ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
      : { r: 0, g: 0, b: 0 };
  }, []);

  const paintAtUV = useCallback(
    (u: number, v: number) => {
      const current = imageDataRef.current;
      if (!current) return;

      const copy = new ImageData(
        new Uint8ClampedArray(current.data),
        current.width,
        current.height
      );

      const { r, g, b } = hexToRgb(colorRef.current);
      const cx = Math.floor(u * 64);
      const cy = Math.floor((1 - v) * 64);
      const half = Math.floor(brushSizeRef.current / 2);

      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const px = Math.max(0, Math.min(63, cx + dx));
          const py = Math.max(0, Math.min(63, cy + dy));
          const idx = (py * 64 + px) * 4;
          copy.data[idx] = r;
          copy.data[idx + 1] = g;
          copy.data[idx + 2] = b;
          copy.data[idx + 3] = 255;
        }
      }

      imageDataRef.current = copy;
      onPixelsPaint(copy);

      // Reload skin texture in the viewer
      if (viewerRef.current) {
        const c = document.createElement("canvas");
        c.width = 64;
        c.height = 64;
        c.getContext("2d")!.putImageData(copy, 0, 0);
        viewerRef.current.loadSkin(c.toDataURL("image/png"), {
          model: bodyTypeRef.current === "slim" ? "slim" : "default",
        });
      }
    },
    [hexToRgb, onPixelsPaint]
  );

  const raycastAndPaint = useCallback(
    (event: MouseEvent, viewer: any) => {
      if (!containerRef.current) return;
      const canvas = containerRef.current.querySelector("canvas");
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      import("three").then((THREE: any) => {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mx, my), viewer.camera);

        const meshes: any[] = [];
        viewer.scene.traverse((obj: any) => {
          if (obj.isMesh) meshes.push(obj);
        });

        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length > 0 && hits[0].uv) {
          paintAtUV(hits[0].uv.x, hits[0].uv.y);
        }
      });
    },
    [paintAtUV]
  );

  // Build viewer once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    let cleanupFns: (() => void)[] = [];

    (async () => {
      const skinview3d: any = await import("skinview3d");
      if (!containerRef.current) return;

      if (viewerRef.current) viewerRef.current.dispose();

      const container = containerRef.current;
      const viewer = new skinview3d.SkinViewer({
        canvas: container.querySelector("canvas"),
        width: container.clientWidth || 420,
        height: container.clientHeight || 520,
      });

      if (viewer.controls) {
        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = false;
        // Only rotate on right-click so left-click can paint
        viewer.controls.mouseButtons = { LEFT: null, MIDDLE: null, RIGHT: 0 };
      }
      viewer.autoRotate = false;
      viewerRef.current = viewer;

      // Load current skin
      if (imageDataRef.current) {
        const c = document.createElement("canvas");
        c.width = 64; c.height = 64;
        c.getContext("2d")!.putImageData(imageDataRef.current, 0, 0);
        viewer.loadSkin(c.toDataURL("image/png"), {
          model: bodyTypeRef.current === "slim" ? "slim" : "default",
        });
      }

      const vc = container.querySelector("canvas") as HTMLCanvasElement;
      if (!vc) return;

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return; // left button only
        mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
        hasDraggedRef.current = false;
        isPaintingRef.current = true;
        raycastAndPaint(e, viewer);
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isPaintingRef.current) return;
        const start = mouseDownPosRef.current;
        if (start) {
          const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
          if (dist > 4) hasDraggedRef.current = true;
        }
        if (!hasDraggedRef.current) {
          raycastAndPaint(e, viewer);
        }
      };

      const onMouseUp = () => {
        isPaintingRef.current = false;
        mouseDownPosRef.current = null;
        hasDraggedRef.current = false;
      };

      vc.addEventListener("mousedown", onMouseDown);
      vc.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);

      cleanupFns = [
        () => vc.removeEventListener("mousedown", onMouseDown),
        () => vc.removeEventListener("mousemove", onMouseMove),
        () => window.removeEventListener("mouseup", onMouseUp),
        () => viewer.dispose(),
      ];
    })();

    return () => cleanupFns.forEach((fn) => fn());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload skin when imageData changes from outside (e.g. AI generation)
  useEffect(() => {
    if (!viewerRef.current || !imageData) return;
    const c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    c.getContext("2d")!.putImageData(imageData, 0, 0);
    viewerRef.current.loadSkin(c.toDataURL("image/png"), {
      model: bodyType === "slim" ? "slim" : "default",
    });
  }, [imageData, bodyType]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-forge-bg"
      style={{ cursor: "crosshair" }}
    >
      <canvas className="rounded-xl" />

      {!imageData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-forge-text-muted text-sm gap-2 pointer-events-none">
          <PaintIcon />
          <span>Load a skin to start 3D painting</span>
        </div>
      )}

      {/* Hint bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-xs text-forge-text-muted bg-forge-panel/90 backdrop-blur-sm px-4 py-2 rounded-full pointer-events-none border border-forge-border">
        <span>🖱️ Left click — paint</span>
        <span className="w-px h-3 bg-forge-border" />
        <span>Right drag — rotate</span>
      </div>
    </div>
  );
}

function PaintIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-30">
      <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
      <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
      <path d="M14.5 17.5 4.5 15" />
    </svg>
  );
}
