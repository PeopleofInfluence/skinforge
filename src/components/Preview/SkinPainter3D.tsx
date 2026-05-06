"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback, useState } from "react";
import { stripOuterLayer } from "@/lib/minecraft-skin";
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<"paint" | "rotate">("paint");
  const [showOuterLayer, setShowOuterLayer] = useState(false);
  const showOuterLayerRef = useRef(false);
  const [initError, setInitError] = useState<string | null>(null);

  const imageDataRef = useRef<ImageData | null>(imageData);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const bodyTypeRef = useRef<BodyType>(bodyType);
  const modeRef = useRef<"paint" | "rotate">("paint");

  useEffect(() => { imageDataRef.current = imageData; }, [imageData]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { bodyTypeRef.current = bodyType; }, [bodyType]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    showOuterLayerRef.current = showOuterLayer;
    if (imageDataRef.current) reloadSkin(imageDataRef.current, bodyTypeRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOuterLayer]);

  const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r
      ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
      : { r: 0, g: 0, b: 0 };
  };

  /**
   * Load the current skin ImageData into the viewer.
   * IMPORTANT: loadSkin(source, model) — second arg is a model type STRING
   * ("slim" | "default" | "auto-detect"), NOT an options object.
   * playerObject.skin.modelType is the correct way to change arm width.
   */
  const reloadSkin = useCallback((data: ImageData, bt: BodyType) => {
    if (!viewerRef.current) return;

    const skinData = showOuterLayerRef.current ? data : stripOuterLayer(data);
    const c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    c.getContext("2d")!.putImageData(skinData, 0, 0);

    const modelType = bt === "slim" ? "slim" : "default";

    // Pass canvas element directly (synchronous TextureSource path)
    // and the model type string as the second argument — NOT an options object.
    viewerRef.current.loadSkin(c, modelType);
  }, []);

  const paintAtUV = useCallback((u: number, v: number, bt: BodyType) => {
    const current = imageDataRef.current;
    if (!current) return;

    const copy = new ImageData(
      new Uint8ClampedArray(current.data),
      current.width,
      current.height
    );

    const { r, g, b } = hexToRgb(colorRef.current);
    const cx = Math.min(63, Math.floor(u * 64));
    const cy = Math.min(63, Math.floor((1 - v) * 64));
    const bs = brushSizeRef.current;
    const half = Math.floor((bs - 1) / 2);

    for (let dy = -half; dy < bs - half; dy++) {
      for (let dx = -half; dx < bs - half; dx++) {
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
    reloadSkin(copy, bt);
  }, [onPixelsPaint, reloadSkin]);

  const raycastAndPaint = useCallback((event: MouseEvent, bt: BodyType) => {
    const viewer = viewerRef.current;
    const THREE = threeRef.current;
    const vc = canvasRef.current;
    if (!viewer || !THREE || !vc) return;

    const rect = vc.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mx, my), viewer.camera);

    // Intersect against the whole player hierarchy (recursive)
    const hits = raycaster.intersectObjects([viewer.playerObject], true);

    for (const hit of hits) {
      if (hit.uv) {
        paintAtUV(hit.uv.x, hit.uv.y, bt);
        break;
      }
    }
  }, [paintAtUV]);

  // Build viewer once on mount
  useEffect(() => {
    if (!containerRef.current) return;
    let cleanupFns: (() => void)[] = [];
    let isMouseDown = false;
    let lastX = 0;
    let lastY = 0;
    let rotY = 0;
    let rotX = 0;

    (async () => {
      try {
        const [skinview3d, THREE] = await Promise.all([
          import("skinview3d"),
          import("three"),
        ]);

        threeRef.current = THREE;
        if (!containerRef.current) return;
        if (viewerRef.current) viewerRef.current.dispose();

        const container = containerRef.current;
        const w = Math.max(container.clientWidth, 100);
        const h = Math.max(container.clientHeight, 100);

        // Do NOT pass a canvas — let skinview3d create its own.
        // This avoids all "wrong canvas element" confusion.
        const viewer = new (skinview3d as any).SkinViewer({
          width: w,
          height: h,
          // Set a visible background so the model is always visible
          // even when the skin has transparent pixels.
          background: 0x1a1a2e,
        });

        viewer.autoRotate = false;
        // Disable OrbitControls — we handle mouse ourselves
        if (viewer.controls) viewer.controls.enabled = false;
        viewerRef.current = viewer;

        // Append skinview3d's canvas to our container and style it to fill
        const vc = viewer.canvas as HTMLCanvasElement;
        canvasRef.current = vc;
        vc.style.position = "absolute";
        vc.style.inset = "0";
        vc.style.width = "100%";
        vc.style.height = "100%";
        container.appendChild(vc);

        // Keep viewer sized to container (handles window resize etc.)
        const updateSize = () => {
          const c = containerRef.current;
          const v = viewerRef.current;
          if (!c || !v) return;
          const cw = c.clientWidth;
          const ch = c.clientHeight;
          if (cw > 0 && ch > 0) v.setSize(cw, ch);
        };
        const ro = new ResizeObserver(updateSize);
        ro.observe(container);
        cleanupFns.push(() => ro.disconnect());

        if (imageDataRef.current) {
          reloadSkin(imageDataRef.current, bodyTypeRef.current);
        }

        // Capture initial camera angle for smooth rotation
        if (viewer.camera) {
          rotY = Math.atan2(viewer.camera.position.x, viewer.camera.position.z);
        }

        const onMouseDown = (e: MouseEvent) => {
          isMouseDown = true;
          lastX = e.clientX;
          lastY = e.clientY;
          if (modeRef.current === "paint") {
            e.preventDefault();
            raycastAndPaint(e, bodyTypeRef.current);
          }
        };

        const onMouseMove = (e: MouseEvent) => {
          if (!isMouseDown) return;
          if (modeRef.current === "rotate") {
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;

            const cam = viewer.camera;
            if (cam) {
              rotY -= dx * 0.01;
              rotX -= dy * 0.005;
              rotX = Math.max(-0.5, Math.min(0.5, rotX));
              const dist = Math.sqrt(cam.position.x ** 2 + cam.position.z ** 2);
              cam.position.x = dist * Math.sin(rotY);
              cam.position.z = dist * Math.cos(rotY);
              cam.position.y = rotX * 40;
              cam.lookAt(0, 0, 0);
            }
          } else if (modeRef.current === "paint") {
            e.preventDefault();
            raycastAndPaint(e, bodyTypeRef.current);
          }
        };

        const onMouseUp = () => { isMouseDown = false; };

        vc.addEventListener("mousedown", onMouseDown);
        vc.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        cleanupFns = [
          () => { ro.disconnect(); },
          () => vc.removeEventListener("mousedown", onMouseDown),
          () => vc.removeEventListener("mousemove", onMouseMove),
          () => window.removeEventListener("mouseup", onMouseUp),
          () => {
            if (container.contains(vc)) container.removeChild(vc);
            canvasRef.current = null;
            viewer.dispose();
          },
        ];
      } catch (err: any) {
        console.error("[SkinPainter3D] init failed:", err);
        setInitError(err?.message ?? String(err));
      }
    })();

    return () => cleanupFns.forEach((fn) => fn());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload skin whenever imageData or bodyType changes from outside
  useEffect(() => {
    if (!viewerRef.current || !imageData) return;
    reloadSkin(imageData, bodyType);
  }, [imageData, bodyType, reloadSkin]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-2 py-2 border-b border-forge-border bg-forge-panel shrink-0 flex-wrap px-3">
        <button
          onClick={() => setMode("rotate")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            mode === "rotate" ? "bg-forge-accent text-white" : "text-forge-text-muted hover:text-forge-text bg-forge-border/40"
          }`}
        >
          <RotateIcon /> Rotate
        </button>
        <button
          onClick={() => setMode("paint")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            mode === "paint" ? "bg-forge-accent text-white" : "text-forge-text-muted hover:text-forge-text bg-forge-border/40"
          }`}
        >
          🖌️ Paint
        </button>

        <div className="w-px h-4 bg-forge-border" />

        <button
          onClick={() => setShowOuterLayer((v) => !v)}
          title="Toggle outer layer (jacket / overlays)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            showOuterLayer ? "bg-forge-border/60 text-forge-text" : "text-forge-text-muted bg-forge-border/20"
          }`}
        >
          <LayersIcon /> {showOuterLayer ? "Hide Outer Layer" : "Show Outer Layer"}
        </button>

        {mode === "paint" && (
          <div
            className="w-4 h-4 rounded-sm border border-forge-border shrink-0"
            style={{ backgroundColor: color }}
            title="Current colour"
          />
        )}
      </div>

      {/* 3D canvas area — skinview3d appends its own canvas here */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        style={{ cursor: mode === "paint" ? "crosshair" : "grab", background: "#1a1a2e" }}
      >
        {initError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-forge-bg/90 pointer-events-none p-4 z-10">
            <span className="text-red-400 font-semibold text-sm">3D viewer failed to load</span>
            <span className="text-forge-text-muted text-xs text-center max-w-xs">{initError}</span>
            <span className="text-forge-text-muted text-xs">Check the browser console (F12) for details</span>
          </div>
        )}
        {!imageData && !initError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-forge-text-muted text-sm gap-2 pointer-events-none z-10">
            <span>Load a skin first, then paint here</span>
          </div>
        )}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full pointer-events-none border border-white/10 whitespace-nowrap z-10">
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

function LayersIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
