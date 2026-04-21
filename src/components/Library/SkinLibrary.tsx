"use client";

import { useState, useCallback } from "react";
import { useSkinLibrary } from "@/hooks/useSkinLibrary";
import { SkinCard } from "./SkinCard";
import type { BodyType } from "@/types";

interface SkinLibraryProps {
  userId: string | null;
  currentImageData: ImageData | null;
  currentBodyType: BodyType;
  onLoadSkin: (imageData: ImageData) => void;
}

export function SkinLibrary({
  userId,
  currentImageData,
  currentBodyType,
  onLoadSkin,
}: SkinLibraryProps) {
  const { skins, loading, error, saveSkin, deleteSkin } =
    useSkinLibrary(userId);
  const [saveName, setSaveName] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = useCallback(async () => {
    if (!currentImageData || !saveName.trim() || !userId) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Convert ImageData to base64 PNG
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(currentImageData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.replace("data:image/png;base64,", "");

    const tags = saveTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await saveSkin(
      saveName.trim(),
      base64,
      currentBodyType,
      tags
    );

    if (result) {
      setSaveSuccess(true);
      setSaveName("");
      setSaveTags("");
      setTimeout(() => setSaveSuccess(false), 2000);
    } else {
      setSaveError("Failed to save.");
    }
    setSaving(false);
  }, [currentImageData, saveName, saveTags, currentBodyType, userId, saveSkin]);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Save form */}
      {userId && currentImageData && (
        <div className="flex flex-col gap-2 p-3 bg-forge-bg/50 rounded-lg border border-forge-border">
          <label className="text-xs text-forge-text-muted uppercase tracking-wide">
            Save current skin
          </label>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Skin name…"
            className="forge-input text-sm"
          />
          <input
            type="text"
            value={saveTags}
            onChange={(e) => setSaveTags(e.target.value)}
            placeholder="Tags: warrior, dark, fantasy"
            className="forge-input text-sm"
          />
          <button
            onClick={handleSave}
            disabled={saving || !saveName.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Spinner /> Saving…</>
            ) : saveSuccess ? (
              <><CheckIcon /> Saved!</>
            ) : (
              <><SaveIcon /> Save Skin</>
            )}
          </button>
          {saveError && (
            <p className="text-xs text-red-400">{saveError}</p>
          )}
        </div>
      )}

      {!userId && (
        <div className="text-xs text-forge-text-muted text-center py-2">
          Sign in to save skins to your library.
        </div>
      )}

      {/* Library grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-forge-text-muted text-sm">
            Loading…
          </div>
        ) : error ? (
          <div className="text-xs text-red-400 text-center py-4">{error}</div>
        ) : skins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-forge-text-muted">
            <LibraryIcon />
            <span className="text-sm">No skins saved yet</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {skins.map((skin) => (
              <SkinCard
                key={skin.id}
                skin={skin}
                onLoad={onLoadSkin}
                onDelete={deleteSkin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function LibraryIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-30">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
