"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const viewerRef = useRef<any>(null);

  const initViewer = useCallback(async () => {
    if (!containerRef.current) return;

    const skinview3d: any = await import("skinview3d");

    if (viewerRef.current) {
      viewerRef.current.dispose();
    }

    const container = containerRef.current;
    const viewer = new skinview3d.SkinViewer({
      canvas: container.querySelector("canvas"),
      width: container.clientWidth || 220,
      height: container.clientHeight || 360,
    });

    if (viewer.controls) {
      viewer.controls.enableRotate = true;
      viewer.controls.enableZoom = true;
    }
    viewer.autoRotate = rotating;
    viewer.autoRotateSpeed = 0.8;

    viewerRef.current = viewer;
  }, [rotating]);

  useEffect(() => {
    initViewer();
    return () => {
      viewerRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.autoRotate = rotating;
    }
  }, [rotating]);

  useEffect(() => {
    if (!viewerRef.current) return;
    const sv3d = viewerRef.current;
    sv3d.animation = null;

    import("skinview3d").then((mod: any) => {
      if (animation === "walk") {
        sv3d.animation = new mod.WalkingAnimation();
        sv3d.animation.speed = 0.8;
      } else if (animation === "run") {
        sv3d.animation = new mod.RunningAnimation();
        sv3d.animation.speed = 1.2;
      }
    });
  }, [animation]);

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
