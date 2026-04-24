"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback, useState } from "react";
import { stripOuterLayer } from "@/lib/minecraft-skin";
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
  const [showOuter, setShowOuter] = useState(false);
  const showOuterRef = useRef(false);

  // Keep refs so async callbacks always read the latest values
  const imageDataRef = useRef<ImageData | null>(imageData);
  const bodyTypeRef = useRef<BodyType>(bodyType);

  useEffect(() => { imageDataRef.current = imageData; }, [imageData]);
  useEffect(() => { bodyTypeRef.current = bodyType; }, [bodyType]);


  useEffect(() => {
    showOuterRef.current = showOuter;
    // Reload skin with/without outer layer pixels when toggle changes
    if (imageDataRef.current) {
      loadSkinToViewer(imageDataRef.current, bodyTypeRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOuter]);

  // Central function to load skin + apply model type + outer visibility
  const loadSkinToViewer = useCallback((data: ImageData, bt: BodyType) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Strip outer layer pixels from the texture when outer is hidden —
    // more reliable than trying to hide skinview3d meshes by name.
    const skinData = showOuterRef.current ? data : stripOuterLayer(data);

    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    canvas.getContext("2d")!.putImageData(skinData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");

    const isSlim = bt === "slim";

    // Set slim directly on the player object — most reliable way
    if (viewer.playerObject) {
      viewer.playerObject.slim = isSlim;
    }

    viewer.loadSkin(dataUrl, {
      model: isSlim ? "slim" : "default",
    });
  }, []);

  // Build the viewer once on mount, then load skin if already available
  useEffect(() => {
    if (!containerRef.current) return;

    (async () => {
      const skinview3d: any = await import("skinview3d");
      if (!containerRef.current) return;

      if (viewerRef.current) viewerRef.current.dispose();

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
      viewer.autoRotate = true;
      viewer.autoRotateSpeed = 0.8;
      viewerRef.current = viewer;

      // Load skin if it was already set before viewer finished initialising
      if (imageDataRef.current) {
        loadSkinToViewer(imageDataRef.current, bodyTypeRef.current);
      }
    })();

    return () => { viewerRef.current?.dispose(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload whenever skin data OR body type changes
  useEffect(() => {
    if (!imageData) return;
    loadSkinToViewer(imageData, bodyType);
  }, [imageData, bodyType, loadSkinToViewer]);

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

  return (
    <div className="relative w-full h-full flex flex-col">
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center"
      >
        <canvas className="rounded-lg" />
        {!imageData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-forge-text-muted text-sm gap-2 pointer-events-none">
            <SkinIcon />
            <span>No skin loaded</span>
          </div>
        )}
      </div>
      {/* Outer layer toggle */}
      <div className="flex justify-center pb-1 shrink-0">
        <button
          onClick={() => setShowOuter((v) => !v)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            showOuter
              ? "border-forge-accent text-forge-accent bg-forge-accent/10"
              : "border-forge-border text-forge-text-muted hover:text-forge-text"
          }`}
          title="Toggle jacket / overlay layer"
        >
          {showOuter ? "Hide Outer Layer" : "Show Outer Layer"}
        </button>
      </div>
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
