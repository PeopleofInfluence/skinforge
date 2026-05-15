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

// ---------------------------------------------------------------------------
// Pure-JS ray helpers — no Three.js import needed
// These work on any object with {x,y,z} properties, which THREE.Vector3 has.
// ---------------------------------------------------------------------------

function dot(a: any, b: any) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function cross(a: any, b: any) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

/**
 * Möller–Trumbore ray-triangle intersection.
 * Returns { t, baryU, baryV } or null.
 */
function rayTriangle(
  ro: any, rd: any,
  v0: any, v1: any, v2: any,
): { t: number; baryU: number; baryV: number } | null {
  const EPSILON = 1e-8;
  const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
  const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
  const h = cross(rd, e2);
  const a = dot(e1, h);
  if (Math.abs(a) < EPSILON) return null;
  const f = 1 / a;
  const s = { x: ro.x - v0.x, y: ro.y - v0.y, z: ro.z - v0.z };
  const baryU = f * dot(s, h);
  if (baryU < 0 || baryU > 1) return null;
  const q = cross(s, e1);
  const baryV = f * dot(rd, q);
  if (baryV < 0 || baryU + baryV > 1) return null;
  const t = f * dot(e2, q);
  return t > EPSILON ? { t, baryU, baryV } : null;
}

/**
 * Intersect a world-space ray (origin + direction) against one Three.js Mesh.
 * Returns the closest UV hit or null.
 *
 * Uses only BufferAttribute.getX/Y/Z methods + existing Vector3/Matrix4 methods
 * on the mesh's own objects — no separate Three.js import required.
 */
function intersectMesh(
  mesh: any,
  worldOrigin: any,   // THREE.Vector3 (from viewer's THREE)
  worldDir: any,      // THREE.Vector3 (from viewer's THREE)
): { t: number; u: number; v: number } | null {
  const geo = mesh.geometry;
  if (!geo) return null;

  const posAttr = geo.attributes.position;
  const uvAttr  = geo.attributes.uv;
  if (!posAttr || !uvAttr) return null;

  // Transform ray to local (object) space using Three.js Matrix4 methods
  // on the mesh's own matrixWorld — same THREE instance, no import needed.
  const invMat = mesh.matrixWorld.clone().invert();
  const lo = worldOrigin.clone().applyMatrix4(invMat);
  const ld = worldDir.clone().transformDirection(invMat);

  const idx = geo.index;
  const triCount = idx ? idx.count / 3 : posAttr.count / 3;

  let bestT = Infinity;
  let bestU = 0, bestV_tex = 0;
  let found = false;

  for (let tri = 0; tri < triCount; tri++) {
    const i0 = idx ? idx.getX(tri * 3)     : tri * 3;
    const i1 = idx ? idx.getX(tri * 3 + 1) : tri * 3 + 1;
    const i2 = idx ? idx.getX(tri * 3 + 2) : tri * 3 + 2;

    const v0 = { x: posAttr.getX(i0), y: posAttr.getY(i0), z: posAttr.getZ(i0) };
    const v1 = { x: posAttr.getX(i1), y: posAttr.getY(i1), z: posAttr.getZ(i1) };
    const v2 = { x: posAttr.getX(i2), y: posAttr.getY(i2), z: posAttr.getZ(i2) };

    const hit = rayTriangle(lo, ld, v0, v1, v2);
    if (!hit || hit.t >= bestT) continue;

    bestT = hit.t;

    // Barycentric interpolation of UV attribute
    const baryW = 1 - hit.baryU - hit.baryV;
    bestU     = baryW * uvAttr.getX(i0) + hit.baryU * uvAttr.getX(i1) + hit.baryV * uvAttr.getX(i2);
    bestV_tex = baryW * uvAttr.getY(i0) + hit.baryU * uvAttr.getY(i1) + hit.baryV * uvAttr.getY(i2);
    found = true;
  }

  return found ? { t: bestT, u: bestU, v: bestV_tex } : null;
}

// ---------------------------------------------------------------------------

export function SkinPainter3D({
  imageData,
  bodyType,
  color,
  brushSize = 1,
  onPixelsPaint,
}: SkinPainter3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef    = useRef<any>(null);
  const canvasRef    = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<"paint" | "rotate">("paint");
  const [showOuterLayer, setShowOuterLayer] = useState(false);
  const showOuterLayerRef = useRef(false);
  const [initError, setInitError] = useState<string | null>(null);

  const imageDataRef  = useRef<ImageData | null>(imageData);
  const colorRef      = useRef(color);
  const brushSizeRef  = useRef(brushSize);
  const bodyTypeRef   = useRef<BodyType>(bodyType);
  const modeRef       = useRef<"paint" | "rotate">("paint");

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

  const reloadSkin = useCallback((data: ImageData, bt: BodyType) => {
    if (!viewerRef.current) return;
    const skinData = showOuterLayerRef.current ? data : stripOuterLayer(data);
    const c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    c.getContext("2d")!.putImageData(skinData, 0, 0);
    viewerRef.current.loadSkin(c, bt === "slim" ? "slim" : "default");
  }, []);

  const paintAtUV = useCallback((u: number, v: number, bt: BodyType) => {
    const current = imageDataRef.current;
    if (!current) return;

    const copy = new ImageData(
      new Uint8ClampedArray(current.data),
      current.width,
      current.height,
    );
    const { r, g, b } = hexToRgb(colorRef.current);
    const cx   = Math.min(63, Math.floor(u * 64));
    const cy   = Math.min(63, Math.floor((1 - v) * 64));
    const bs   = brushSizeRef.current;
    const half = Math.floor((bs - 1) / 2);

    for (let dy = -half; dy < bs - half; dy++) {
      for (let dx = -half; dx < bs - half; dx++) {
        const px  = Math.max(0, Math.min(63, cx + dx));
        const py  = Math.max(0, Math.min(63, cy + dy));
        const idx = (py * 64 + px) * 4;
        copy.data[idx]     = r;
        copy.data[idx + 1] = g;
        copy.data[idx + 2] = b;
        copy.data[idx + 3] = 255;
      }
    }
    imageDataRef.current = copy;
    onPixelsPaint(copy);
    reloadSkin(copy, bt);
  }, [onPixelsPaint, reloadSkin]);

  /**
   * Raycast against the player model using pure-JS triangle intersection.
   * No separate Three.js import — uses only methods on the viewer's own objects.
   */
  const raycastAndPaint = useCallback((event: MouseEvent, bt: BodyType) => {
    const viewer = viewerRef.current;
    const vc     = canvasRef.current;
    if (!viewer || !vc) return;

    const camera      = viewer.camera;
    const playerObject = viewer.playerObject;
    if (!camera || !playerObject) return;

    // NDC coordinates from click position
    const rect = vc.getBoundingClientRect();
    const ndcX =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

    // Build a world-space ray using the camera's own Three.js methods.
    // camera.position is a THREE.Vector3 from skinview3d's bundled THREE.
    // Calling .clone()/.set()/.unproject()/.sub()/.normalize() on it uses
    // that same Three.js instance — no separate import, no instanceof issues.
    camera.updateProjectionMatrix();
    playerObject.updateMatrixWorld(true);

    const origin    = camera.position.clone();                          // world origin
    const direction = camera.position.clone()
      .set(ndcX, ndcY, 0.5)
      .unproject(camera)   // NDC → world
      .sub(origin)
      .normalize();        // world direction

    // Walk every mesh in the player hierarchy and find the closest triangle hit
    let bestT  = Infinity;
    let bestUV: { u: number; v: number } | null = null;

    playerObject.traverse((obj: any) => {
      if (!obj.isMesh) return;
      const hit = intersectMesh(obj, origin, direction);
      if (hit && hit.t < bestT) {
        bestT  = hit.t;
        bestUV = { u: hit.u, v: hit.v };
      }
    });

    if (bestUV) paintAtUV(bestUV.u, bestUV.v, bt);
  }, [paintAtUV]);

  // Build viewer once on mount
  useEffect(() => {
    if (!containerRef.current) return;
    let cleanupFns: (() => void)[] = [];
    let isMouseDown = false;
    let lastX = 0, lastY = 0;
    let rotY = 0, rotX = 0;

    (async () => {
      try {
        const skinview3d = await import("skinview3d");

        if (!containerRef.current) return;
        if (viewerRef.current) viewerRef.current.dispose();

        const container = containerRef.current;
        const w = Math.max(container.clientWidth, 100);
        const h = Math.max(container.clientHeight, 100);

        const viewer = new (skinview3d as any).SkinViewer({
          width: w,
          height: h,
          background: 0x1a1a2e,
        });

        viewer.autoRotate = false;
        if (viewer.controls) viewer.controls.enabled = false;
        viewerRef.current = viewer;

        // Append skinview3d's own canvas (it manages its own WebGL context)
        const vc = viewer.canvas as HTMLCanvasElement;
        canvasRef.current = vc;
        vc.style.position = "absolute";
        vc.style.inset     = "0";
        vc.style.width     = "100%";
        vc.style.height    = "100%";
        container.appendChild(vc);

        // Keep viewer sized to its container
        const updateSize = () => {
          const c = containerRef.current;
          const v = viewerRef.current;
          if (!c || !v) return;
          const cw = c.clientWidth, ch = c.clientHeight;
          if (cw > 0 && ch > 0) v.setSize(cw, ch);
        };
        const ro = new ResizeObserver(updateSize);
        ro.observe(container);
        cleanupFns.push(() => ro.disconnect());

        if (imageDataRef.current) {
          reloadSkin(imageDataRef.current, bodyTypeRef.current);
        }

        if (viewer.camera) {
          rotY = Math.atan2(viewer.camera.position.x, viewer.camera.position.z);
        }

        // Mouse handlers
        const onMouseDown = (e: MouseEvent) => {
          isMouseDown = true;
          lastX = e.clientX; lastY = e.clientY;
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
            lastX = e.clientX; lastY = e.clientY;
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
          } else {
            e.preventDefault();
            raycastAndPaint(e, bodyTypeRef.current);
          }
        };

        const onMouseUp = () => { isMouseDown = false; };

        vc.addEventListener("mousedown", onMouseDown);
        vc.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        cleanupFns = [
          () => ro.disconnect(),
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

      {/* 3D canvas area */}
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
