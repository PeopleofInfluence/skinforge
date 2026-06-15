"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

interface SaveDialogProps {
  imageData: ImageData;
  bodyType: "classic" | "slim";
  userId: string;
  onSaved: () => void;
  onClose: () => void;
}

export function SaveDialog({ imageData, bodyType, userId, onSaved, onClose }: SaveDialogProps) {
  const [name, setName] = useState("My Skin");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 64; canvas.height = 64;
      canvas.getContext("2d")!.putImageData(imageData, 0, 0);
      const pixels = canvas.toDataURL("image/png").replace("data:image/png;base64,", "");
      const now = new Date().toISOString();

      const { error: dbError } = await supabase.from("skins").upsert({
        id: uuidv4(),
        user_id: userId,
        name: name.trim(),
        tags: [],
        pixels,
        body_type: bodyType,
        is_public: isPublic,
        preview_url: null,
        updated_at: now,
        created_at: now,
      });

      if (dbError) throw dbError;
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [name, isPublic, imageData, bodyType, userId, onSaved, onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-forge-panel border border-forge-border rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-forge-text">Save to Library</h3>
          <button onClick={onClose} className="text-forge-text-muted hover:text-forge-text text-lg leading-none">×</button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-forge-text-muted uppercase tracking-wide block mb-1.5">
              Skin name
            </label>
            <input
              className="forge-input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              maxLength={60}
              autoFocus
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsPublic((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                isPublic ? "bg-forge-accent" : "bg-forge-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  isPublic ? "translate-x-5" : ""
                }`}
              />
            </div>
            <div>
              <span className="text-sm text-forge-text">Share with community</span>
              <p className="text-xs text-forge-text-muted">Visible to everyone in the Library</p>
            </div>
          </label>

          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
