"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback, useState } from "react";
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
  const threeRef = useRef<any>(null);
  const [mode, setMode] = useState<"paint" | "rotate">("rotate");

  const imageDataRef = useRef<ImageData | null>(imageData);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const bodyTypeRef = useRef(bodyType);
  const modeRef = useRef<"paint" | "rotate">("rotate");

  useEffect(() => { imageDataRef.current = imageData; }, [imageData]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { bodyTypeRef.current = bodyType; }, [bodyType]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r
      ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
      : { r: 0, g: 0, b: 0 };
  };

  const reloadSkin = useCallback((data: ImageData) => {
    if (!viewerRef.current) return;
    const c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    c.getContext("2d")!.putImageData(data, 0, 0);
    viewerRef.current.loadSkin(c.toDataURL("image/png"), {
      model: bodyTypeRef.current === "slim" ? "slim" : "default",
    });
  }, []);

  const paintAtUV = useCallback((u: number, v: number) => {
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
    reloadSkin(copy);
  }, [onPixelsPaint, reloadSkin]);

  const raycastAndPaint = useCallback((event: MouseEvent) => {
    const viewer = viewerRef.current;
    const THREE = threeRef.current;
    if (!viewer || !THREE || !containerRef.current) return;

    const canvas = containerRef.current.querySelector("canvas");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((event.clientY - rect.top) / rect.height) * 2 + 1;

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
  }, [paintAtUV]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cleanupFns: (() => void)[] = [];

    // Rotation state
    let isMouseDown = false;
    let lastX = 0;
    let lastY = 0;
    let rotY = 0;
    let rotX = 0;

    (async () => {
      const [skinview3d, THREE] = await Promise.all([
        import("skinview3d"),
        import("three"),
      ]);

      threeRef.current = THREE;
      if (!containerRef.current) return;
      if (viewerRef.current) viewerRef.current.dispose();

      const container = containerRef.current;
      const viewer = new (skinview3d as any).SkinViewer({
        canvas: container.querySelector("canvas"),
        width: container.clientWidth || 420,
        height: container.clientHeight || 520,
      });

      viewer.autoRotate = false;
      // Disable built-in controls — we handle rotation ourselves
      if (viewer.controls) viewer.controls.enabled = false;

      viewerRef.current = viewer;

      if (imageDataRef.current) reloadSkin(imageDataRef.current);

      const vc = container.querySelector("canvas") as HTMLCanvasElement;
      if (!vc) return;

      const onMouseDown = (e: MouseEvent) => {
        isMouseDown = true;
        lastX = e.clientX;
        lastY = e.clientY;

        if (modeRef.current === "paint") {
          e.preventDefault();
          raycastAndPaint(e);
        }
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isMouseDown) return;

        if (modeRef.current === "rotate") {
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;

          // Manually rotate the player object
          const player = viewer.playerObject;
          if (player) {
            rotY += dx * 0.01;
            rotX += dy * 0.01;
            // Clamp vertical rotation so it doesn't flip upside down
            rotX = Math.max(-0.6, Math.min(0.6, rotX));
            player.rotation.y = rotY;
            player.rotation.x = rotX;
          }
        } else if (modeRef.current === "paint") {
          e.preventDefault();
          raycastAndPaint(e);
        }
      };

      const onMouseUp = () => { isMouseDown = false; };

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

  useEffect(() => {
    if (!viewerRef.current || !imageData) return;
    reloadSkin(imageData);
  }, [imageData, bodyType, reloadSkin]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Mode toggle */}
      <div className="flex items-center justify-center gap-2 py-2 border-b border-forge-border bg-forge-panel shrink-0">
        <button
          onClick={() => setMode("rotate")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            mode === "rotate"
              ? "bg-forge-accent text-white"
              : "text-forge-text-muted hover:text-forge-text bg-forge-border/40"
          }`}
        >
          <RotateIcon /> Rotate
        </button>
        <button
          onClick={() => setMode("paint")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            mode === "paint"
              ? "bg-forge-accent text-white"
              : "text-forge-text-muted hover:text-forge-text bg-forge-border/40"
          }`}
        >
          🖌️ Paint
        </button>
        {mode === "paint" && (
          <div
            className="w-4 h-4 rounded-sm border border-forge-border ml-1 shrink-0"
            style={{ backgroundColor: color }}
            title="Current colour"
          />
        )}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center bg-forge-bg"
        style={{ cursor: mode === "paint" ? "crosshair" : "grab" }}
      >
        <canvas className="rounded-xl" />
        {!imageData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-forge-text-muted text-sm gap-2 pointer-events-none">
            <span>Load a skin to start painting</span>
          </div>
        )}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-forge-text-muted bg-forge-panel/90 backdrop-blur-sm px-4 py-2 rounded-full pointer-events-none border border-forge-border">
          {mode === "paint" ? "🖌️ Click or drag on the model to paint" : "🖱️ Drag to rotate the model"}
        </div>
      </div>
    </div>
  );
}

function RotateIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
  );
}
