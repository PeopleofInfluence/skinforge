"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { LeftPanel } from "@/components/Layout/LeftPanel";
import { CenterPanel } from "@/components/Layout/CenterPanel";
import { RightPanel } from "@/components/Layout/RightPanel";
import { AuthModal } from "@/components/Auth/AuthModal";
import { UserMenu } from "@/components/Auth/UserMenu";
import { supabase } from "@/lib/supabase";
import { createBlankSkin, canvasToPng } from "@/lib/minecraft-skin";
import type { EditorState, Tool, LayerName, BodyType, Layer } from "@/types";
import type { User } from "@supabase/supabase-js";

const INITIAL_LAYERS: Layer[] = [
  { name: "head", label: "Head", visible: true, locked: false },
  { name: "headOuter", label: "Head Outer", visible: true, locked: false },
  { name: "body", label: "Body", visible: true, locked: false },
  { name: "bodyOuter", label: "Body Outer", visible: true, locked: false },
  { name: "rightArm", label: "Right Arm", visible: true, locked: false },
  { name: "rightArmOuter", label: "Right Arm Outer", visible: true, locked: false },
  { name: "leftArm", label: "Left Arm", visible: true, locked: false },
  { name: "leftArmOuter", label: "Left Arm Outer", visible: true, locked: false },
  { name: "rightLeg", label: "Right Leg", visible: true, locked: false },
  { name: "rightLegOuter", label: "Right Leg Outer", visible: true, locked: false },
  { name: "leftLeg", label: "Left Leg", visible: true, locked: false },
  { name: "leftLegOuter", label: "Left Leg Outer", visible: true, locked: false },
];

export default function SkinForgeApp() {
  const [editorState, setEditorState] = useState<EditorState>({
    tool: "pencil",
    color: "#7c3aed",
    zoom: 8,
    activeLayer: "head",
    layers: INITIAL_LAYERS,
    bodyType: "classic",
    showGrid: true,
  });

  const [currentImageData, setCurrentImageData] = useState<ImageData | null>(null);
  const [externalImageData, setExternalImageData] = useState<ImageData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const undoFnRef = useRef<(() => void) | null>(null);
  const redoFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setTool = useCallback((tool: Tool) => setEditorState((s) => ({ ...s, tool })), []);
  const setColor = useCallback((color: string) => setEditorState((s) => ({ ...s, color })), []);
  const setLayer = useCallback((activeLayer: LayerName) => setEditorState((s) => ({ ...s, activeLayer })), []);
  const toggleLayerVisibility = useCallback((name: LayerName) => {
    setEditorState((s) => ({ ...s, layers: s.layers.map((l) => l.name === name ? { ...l, visible: !l.visible } : l) }));
  }, []);
  const zoomIn = useCallback(() => setEditorState((s) => ({ ...s, zoom: Math.min(s.zoom + 2, 20) })), []);
  const zoomOut = useCallback(() => setEditorState((s) => ({ ...s, zoom: Math.max(s.zoom - 2, 2) })), []);
  const toggleGrid = useCallback(() => setEditorState((s) => ({ ...s, showGrid: !s.showGrid })), []);
  const setBodyType = useCallback((bodyType: BodyType) => setEditorState((s) => ({ ...s, bodyType })), []);

  const handleColorPick = useCallback((color: string) => { setColor(color); setTool("pencil"); }, [setColor, setTool]);
  const handlePixelsChange = useCallback((imageData: ImageData) => { setCurrentImageData(imageData); setCanUndo(true); }, []);
  const handleSkinGenerated = useCallback((imageData: ImageData) => { setExternalImageData(imageData); setCurrentImageData(imageData); }, []);
  const handleClear = useCallback(() => { const blank = createBlankSkin(); setExternalImageData(blank); setCurrentImageData(blank); }, []);

  const handleExport = useCallback(() => {
    if (!currentImageData) return;
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(currentImageData, 0, 0);
    const link = document.createElement("a");
    link.href = canvasToPng(canvas);
    link.download = "skin.png";
    link.click();
  }, [currentImageData]);

  const handleUndo = useCallback(() => undoFnRef.current?.(), []);
  const handleRedo = useCallback(() => redoFnRef.current?.(), []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 bg-forge-panel border-b border-forge-border shrink-0">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-sm font-semibold text-forge-text tracking-wide">SkinForge</span>
          <span className="text-xs text-forge-text-muted hidden sm:block">— Minecraft Skin Studio</span>
        </div>
        <div className="flex items-center gap-2">
          {currentImageData && (
            <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-xs">
              <DownloadIcon /> Export PNG
            </button>
          )}
          {user ? <UserMenu user={user} /> : (
            <button onClick={() => setShowAuth(true)} className="btn-primary text-xs">Sign in</button>
          )}
        </div>
      </header>

      <main className="flex flex-1 min-h-0">
        <LeftPanel
          editorState={editorState}
          onToolChange={setTool}
          onColorChange={setColor}
          onLayerSelect={setLayer}
          onToggleLayerVisibility={toggleLayerVisibility}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onToggleGrid={toggleGrid}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onClear={handleClear}
          onExport={handleExport}
        />
        <CenterPanel
          editorState={editorState}
          onColorPick={handleColorPick}
          onPixelsChange={handlePixelsChange}
          externalImageData={externalImageData}
          onUndoRef={(fn) => { undoFnRef.current = fn; }}
          onRedoRef={(fn) => { redoFnRef.current = fn; }}
          previewImageData={currentImageData}
          bodyType={editorState.bodyType}
        />
        <RightPanel
          bodyType={editorState.bodyType}
          onBodyTypeChange={setBodyType}
          onSkinGenerated={handleSkinGenerated}
          userId={user?.id ?? null}
          currentImageData={currentImageData}
        />
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-forge-accent">
      <rect x="2" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
      <rect x="13" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.6" />
      <rect x="2" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.6" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
