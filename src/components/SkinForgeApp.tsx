"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { LeftPanel } from "@/components/Layout/LeftPanel";
import { CenterPanel } from "@/components/Layout/CenterPanel";
import { RightPanel } from "@/components/Layout/RightPanel";
import { AuthModal } from "@/components/Auth/AuthModal";
import { UserMenu } from "@/components/Auth/UserMenu";
import { supabase } from "@/lib/supabase";
import { createBlankSkin, canvasToPng, fixAISkinBlackSides } from "@/lib/minecraft-skin";
import { v4 as uuidv4 } from "uuid";
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
    brushSize: 1,
    fillTolerance: 0,
  });

  const [currentImageData, setCurrentImageData] = useState<ImageData | null>(null);
  const [externalImageData, setExternalImageData] = useState<ImageData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [can2DUndo, setCan2DUndo] = useState(false);
  const [can2DRedo, setCan2DRedo] = useState(false);
  const [canAppUndo, setCanAppUndo] = useState(false);
  const [canAppRedo, setCanAppRedo] = useState(false);

  const undoFnRef = useRef<(() => void) | null>(null);
  const redoFnRef = useRef<(() => void) | null>(null);

  // App-level undo/redo stack — captures changes that come from 3D paint or
  // external operations (Fix Dark Sides, etc.) that bypass the 2D editor's
  // own history.  The 2D editor manages its own stack for pixel-editor actions;
  // this stack is only used when the 2D editor has nothing to undo.
  const appUndoStack = useRef<ImageData[]>([]);
  const appRedoStack = useRef<ImageData[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load autosave on mount
  useEffect(() => {
    const saved = localStorage.getItem("skinforge-autosave");
    if (!saved) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, 64, 64);
      setExternalImageData(data);
      setCurrentImageData(data);
    };
    img.src = saved;
  }, []);

  // Autosave to localStorage whenever pixels change (debounced via useEffect)
  useEffect(() => {
    if (!currentImageData) return;
    const id = setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 64; canvas.height = 64;
      canvas.getContext("2d")!.putImageData(currentImageData, 0, 0);
      localStorage.setItem("skinforge-autosave", canvas.toDataURL("image/png"));
    }, 500);
    return () => clearTimeout(id);
  }, [currentImageData]);

  // Stable draft ID per user — stored in localStorage so the same DB row
  // gets upserted every session rather than creating a new one each time.
  const draftSkinId = useMemo(() => {
    if (!user) return null;
    const key = `skinforge-draft-id-${user.id}`;
    let id = localStorage.getItem(key);
    if (!id) { id = uuidv4(); localStorage.setItem(key, id); }
    return id;
  }, [user]);

  // Auto-save to Supabase library as a "Draft" entry whenever pixels change.
  // Only runs for logged-in users; debounced at 3 s to avoid hammering the DB.
  useEffect(() => {
    if (!currentImageData || !user || !draftSkinId) return;
    const timer = setTimeout(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64; canvas.height = 64;
      canvas.getContext("2d")!.putImageData(currentImageData, 0, 0);
      const pixels = canvas.toDataURL("image/png").replace("data:image/png;base64,", "");
      const now = new Date().toISOString();
      await supabase.from("skins").upsert({
        id: draftSkinId,
        user_id: user.id,
        name: "Draft",
        tags: ["draft"],
        pixels,
        body_type: editorState.bodyType,
        is_public: false,
        preview_url: null,
        updated_at: now,
        created_at: now,
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentImageData, user, draftSkinId, editorState.bodyType]);

  const setTool = useCallback((tool: Tool) => setEditorState((s) => ({ ...s, tool })), []);
  const setColor = useCallback((color: string) => setEditorState((s) => ({ ...s, color })), []);
  const setLayer = useCallback((activeLayer: LayerName) => setEditorState((s) => ({ ...s, activeLayer })), []);
  const setBrushSize = useCallback((brushSize: number) => setEditorState((s) => ({ ...s, brushSize })), []);
  const setFillTolerance = useCallback((fillTolerance: number) => setEditorState((s) => ({ ...s, fillTolerance })), []);
  const toggleLayerVisibility = useCallback((name: LayerName) => {
    setEditorState((s) => ({ ...s, layers: s.layers.map((l) => l.name === name ? { ...l, visible: !l.visible } : l) }));
  }, []);
  const zoomIn = useCallback(() => setEditorState((s) => ({ ...s, zoom: Math.min(s.zoom + 2, 20) })), []);
  const zoomOut = useCallback(() => setEditorState((s) => ({ ...s, zoom: Math.max(s.zoom - 2, 2) })), []);
  const toggleGrid = useCallback(() => setEditorState((s) => ({ ...s, showGrid: !s.showGrid })), []);
  const setBodyType = useCallback((bodyType: BodyType) => setEditorState((s) => ({ ...s, bodyType })), []);

  const handleUndoStateChange = useCallback((u: boolean, r: boolean) => { setCan2DUndo(u); setCan2DRedo(r); }, []);
  const handleColorPick = useCallback((color: string) => { setColor(color); setTool("pencil"); }, [setColor, setTool]);

  // Push to app-level history (used by 3D paint + external ops).
  // We clone so history entries are immutable snapshots.
  const pushAppHistory = useCallback((prev: ImageData) => {
    appUndoStack.current.push(new ImageData(new Uint8ClampedArray(prev.data), prev.width, prev.height));
    if (appUndoStack.current.length > 50) appUndoStack.current.shift();
    appRedoStack.current = [];
    setCanAppUndo(true);
    setCanAppRedo(false);
  }, []);

  // Called by the 2D pixel editor on every stroke
  const handlePixelsChange = useCallback((imageData: ImageData) => {
    setCurrentImageData(imageData);
    // 2D editor has its own independent undo stack — invalidate app-level
    // stacks (3D paint / Fix Dark Sides) since mixing the two sources would
    // be confusing.
    appUndoStack.current = [];
    appRedoStack.current = [];
    setCanAppUndo(false);
    setCanAppRedo(false);
  }, []);

  // Called by 3D painter after each paint operation
  const handlePixelsPaint = useCallback((imageData: ImageData) => {
    setCurrentImageData((prev) => {
      if (prev) pushAppHistory(prev);
      return imageData;
    });
  }, [pushAppHistory]);

  const handleSkinGenerated = useCallback((imageData: ImageData) => {
    setExternalImageData(imageData);
    setCurrentImageData(imageData);
    appUndoStack.current = [];
    appRedoStack.current = [];
    setCanAppUndo(false);
    setCanAppRedo(false);
  }, []);

  const handleClear = useCallback(() => {
    const blank = createBlankSkin();
    setExternalImageData(blank);
    setCurrentImageData(blank);
    appUndoStack.current = [];
    appRedoStack.current = [];
    setCanAppUndo(false);
    setCanAppRedo(false);
  }, []);

  const handleFixDarkSides = useCallback(() => {
    if (!currentImageData) return;
    pushAppHistory(currentImageData);
    const fixed = fixAISkinBlackSides(currentImageData);
    setExternalImageData(fixed);
    setCurrentImageData(fixed);
  }, [currentImageData, pushAppHistory]);

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

  const handleUndo = useCallback(() => {
    // 2D editor tracks its own history — call its undo first.
    if (can2DUndo && undoFnRef.current) {
      undoFnRef.current();
      return;
    }
    // Fall back to app-level stack (3D paint strokes, Fix Dark Sides, etc.)
    const prev = appUndoStack.current.pop();
    if (prev) {
      setCurrentImageData((cur) => {
        if (cur) appRedoStack.current.push(new ImageData(new Uint8ClampedArray(cur.data), cur.width, cur.height));
        return prev;
      });
      setExternalImageData(prev);
      setCanAppUndo(appUndoStack.current.length > 0);
      setCanAppRedo(true);
    }
  }, [can2DUndo]);

  const handleRedo = useCallback(() => {
    // 2D editor tracks its own redo history — call it first.
    if (can2DRedo && redoFnRef.current) {
      redoFnRef.current();
      return;
    }
    // Fall back to app-level redo stack.
    const next = appRedoStack.current.pop();
    if (next) {
      setCurrentImageData((cur) => {
        if (cur) appUndoStack.current.push(new ImageData(new Uint8ClampedArray(cur.data), cur.width, cur.height));
        return next;
      });
      setExternalImageData(next);
      setCanAppUndo(true);
      setCanAppRedo(appRedoStack.current.length > 0);
    }
  }, [can2DRedo]);

  // Global keyboard shortcut — always active regardless of which view is open.
  // The 2D editor also has its own listener, but only while it is mounted.
  // Having it here means Ctrl+Z/Y works in 3D paint mode too.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

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
          canUndo={can2DUndo || canAppUndo}
          canRedo={can2DRedo || canAppRedo}
          onClear={handleClear}
          onExport={handleExport}
          onFixDarkSides={handleFixDarkSides}
          onBrushSizeChange={setBrushSize}
          onFillToleranceChange={setFillTolerance}
        />
        <CenterPanel
          editorState={editorState}
          onColorPick={handleColorPick}
          onPixelsChange={handlePixelsChange}
          onPixelsPaint={handlePixelsPaint}
          externalImageData={externalImageData}
          onUndoRef={(fn) => { undoFnRef.current = fn; }}
          onRedoRef={(fn) => { redoFnRef.current = fn; }}
          onUndoStateChange={handleUndoStateChange}
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
