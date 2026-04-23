"use client";

import { useEffect, useRef, useCallback } from "react";
import type { BodyType, AnimationType } from "@/types";

interface SkinPreview3DProps {
  imageData: ImageData | null;
  bodyType: BodyType;
  animation: AnimationType;
  rotating: boolean;
}

export function SkinPreview3D({
  imageData,
  bodyType,
  animation,
  rotating,
}: SkinPreview3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);

  const initViewer = useCallback(async () => {
    if (!containerRef.current) return;

    // Dynamically import skinview3d (client-only)
    const skinview3d = await import("skinview3d");

    // Dispose previous viewer
    if (viewerRef.current) {
      viewerRef.current.dispose();
    }

    const container = containerRef.current;
    const viewer = new skinview3d.SkinViewer({
      canvas: container.querySelector("canvas") as HTMLCanvasElement,
      width: container.clientWidth || 220,
      height: container.clientHeight || 360,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = viewer as any;
    if (v.controls) {
      v.controls.enableRotate = true;
      v.controls.enableZoom = true;
    }
    v.autoRotate = rotating;
    v.autoRotateSpeed = 0.8;

    viewerRef.current = viewer;
    return viewer;
  }, [rotating]);

  // Initialise on mount
  useEffect(() => {
    initViewer();
    return () => {
      viewerRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update auto-rotate
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.autoRotate = rotating;
    }
  }, [rotating]);

  // Update animation
  useEffect(() => {
    if (!viewerRef.current) return;
    const sv3d = viewerRef.current;

    sv3d.animation = null;

    if (animation === "walk") {
      import("skinview3d").then(({ WalkingAnimation }) => {
        sv3d.animation = new WalkingAnimation();
        sv3d.animation.speed = 0.8;
      });
    } else if (animation === "run") {
      import("skinview3d").then(({ RunningAnimation }) => {
        sv3d.animation = new RunningAnimation();
        sv3d.animation.speed = 1.2;
      });
    }
  }, [animation]);

  // Update skin texture whenever imageData changes
  useEffect(() => {
    if (!viewerRef.current || !imageData) return;

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");

    viewerRef.current.loadSkin(dataUrl, {
      model: bodyType === "slim" ? "slim" : "default",
    });
  }, [imageData, bodyType]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center"
    >
      <canvas className="rounded-lg" />
      {!imageData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-forge-text-muted text-sm gap-2 pointer-events-none">
          <SkinIcon />
          <span>No skin loaded</span>
        </div>
      )}
    </div>
  );
}

function SkinIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-30">
      <rect x="8" y="2" width="8" height="8" rx="1" />
      <rect x="7" y="10" width="10" height="8" rx="1" />
      <rect x="3" y="10" width="4" height="7" rx="1" />
      <rect x="17" y="10" width="4" height="7" rx="1" />
      <rect x="7" y="18" width="4" height="4" rx="1" />
      <rect x="13" y="18" width="4" height="4" rx="1" />
    </svg>
  );
}
