"use client";

import { useState, useCallback, useMemo } from "react";
import { useSkinLibrary } from "@/hooks/useSkinLibrary";
import { SkinCard } from "./SkinCard";
import type { BodyType } from "@/types";

interface SkinLibraryProps {
  userId: string | null;
  currentImageData: ImageData | null;
  currentBodyType: BodyType;
  onLoadSkin: (imageData: ImageData) => void;
}

type LibView = "mine" | "community";

export function SkinLibrary({
  userId,
  currentImageData,
  currentBodyType,
  onLoadSkin,
}: SkinLibraryProps) {
  const {
    skins, communitySkins,
    loading, communityLoading, communityHasMore,
    error,
    saveSkin, deleteSkin, togglePublic, refreshCommunity, loadMoreCommunity,
  } = useSkinLibrary(userId);

  const [view, setView] = useState<LibView>("mine");

  // ── Save-to-library state ──────────────────────────────────────────────
  const [saveName, setSaveName]       = useState("");
  const [saveTags, setSaveTags]       = useState("");
  const [savePublic, setSavePublic]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveOpen, setSaveOpen]       = useState(false);

  // ── MC username loader ─────────────────────────────────────────────────
  const [mcUsername, setMcUsername] = useState("");
  const [mcLoading, setMcLoading]   = useState(false);
  const [mcError, setMcError]       = useState<string | null>(null);
  const [mcSuccess, setMcSuccess]   = useState(false);

  // ── Filter state (My Library) ──────────────────────────────────────────
  const [search, setSearch]         = useState("");
  const [activeTag, setActiveTag]   = useState<string | null>(null);

  // ── Filter state (Community) ───────────────────────────────────────────
  const [communitySearch, setCommunitySearch] = useState("");

  // Unique tags from own skins
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const s of skins) for (const t of s.tags ?? []) if (t !== "draft") set.add(t);
    return Array.from(set).sort();
  }, [skins]);

  const filteredSkins = useMemo(() => {
    return skins.filter((s) => {
      if ((s.tags ?? []).includes("draft")) return false;
      const matchTag = !activeTag || (s.tags ?? []).includes(activeTag);
      const q = search.toLowerCase();
      const matchSearch =
        !q || s.name.toLowerCase().includes(q) ||
        (s.tags ?? []).some((t) => t.toLowerCase().includes(q));
      return matchTag && matchSearch;
    });
  }, [skins, activeTag, search]);

  const filteredCommunity = useMemo(() => {
    const q = communitySearch.toLowerCase();
    if (!q) return communitySkins;
    return communitySkins.filter(
      (s) => s.name.toLowerCase().includes(q) ||
             (s.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }, [communitySkins, communitySearch]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLoadByUsername = useCallback(async () => {
    const name = mcUsername.trim();
    if (!name) return;
    setMcLoading(true); setMcError(null); setMcSuccess(false);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Player not found"));
        img.src = `https://mc-heads.net/skin/${encodeURIComponent(name)}`;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 64; canvas.height = 64;
      canvas.getContext("2d")!.drawImage(img, 0, 0, 64, 64);
      const data = canvas.getContext("2d")!.getImageData(0, 0, 64, 64);
      onLoadSkin(data);
      setMcSuccess(true); setMcUsername("");
      setTimeout(() => setMcSuccess(false), 2000);
    } catch { setMcError("Player not found or skin unavailable."); }
    setMcLoading(false);
  }, [mcUsername, onLoadSkin]);

  const handleSave = useCallback(async () => {
    if (!currentImageData || !saveName.trim() || !userId) return;
    setSaving(true); setSaveError(null); setSaveSuccess(false);

    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    canvas.getContext("2d")!.putImageData(currentImageData, 0, 0);
    const base64 = canvas.toDataURL("image/png").replace("data:image/png;base64,", "");

    const tags = saveTags.split(",").map((t) => t.trim()).filter(Boolean);
    const result = await saveSkin(saveName.trim(), base64, currentBodyType, tags, undefined, savePublic);

    if (result) {
      setSaveSuccess(true); setSaveName(""); setSaveTags(""); setSaveOpen(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    } else { setSaveError("Failed to save skin."); }
    setSaving(false);
  }, [currentImageData, saveName, saveTags, savePublic, currentBodyType, userId, saveSkin]);

  const handleCommunityTab = () => {
    setView("community");
    if (communitySkins.length === 0) refreshCommunity();
  };

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Load by Minecraft username ── */}
      <div className="flex flex-col gap-2 p-3 bg-forge-bg/50 rounded-lg border border-forge-border">
        <label className="text-xs text-forge-text-muted uppercase tracking-wide font-semibold">
          Load by Minecraft username
        </label>
        <div className="flex gap-2">
          <input
            type="text" value={mcUsername}
            onChange={(e) => setMcUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoadByUsername()}
            placeholder="e.g. Notch, Dream…"
            className="forge-input text-sm flex-1"
          />
          <button
            onClick={handleLoadByUsername}
            disabled={mcLoading || !mcUsername.trim()}
            className="btn-primary flex items-center gap-1 px-3 text-xs shrink-0 disabled:opacity-50"
          >
            {mcLoading ? <Spinner /> : mcSuccess ? <CheckIcon /> : <LoadIcon />}
            {mcSuccess ? "Loaded!" : "Load"}
          </button>
        </div>
        {mcError && <p className="text-xs text-red-400">{mcError}</p>}
      </div>

      {/* ── Save current skin ── */}
      {userId && currentImageData && (
        <div className="flex flex-col gap-2 p-3 bg-forge-bg/50 rounded-lg border border-forge-border">
          <button
            onClick={() => setSaveOpen((v) => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-xs text-forge-text-muted uppercase tracking-wide font-semibold">
              Save current skin to library
            </span>
            <span className="text-forge-text-muted text-xs">{saveOpen ? "▲" : "▼"}</span>
          </button>

          {saveOpen && (
            <div className="flex flex-col gap-2 pt-1">
              <input type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)}
                placeholder="Skin name…" className="forge-input text-sm" />
              <input type="text" value={saveTags} onChange={(e) => setSaveTags(e.target.value)}
                placeholder="Tags: warrior, dark, fantasy (comma-separated)" className="forge-input text-sm" />

              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-forge-text-muted self-center">Quick add:</span>
                  {allTags.slice(0, 8).map((tag) => (
                    <button key={tag}
                      onClick={() => setSaveTags((prev) => {
                        const existing = prev.split(",").map((t) => t.trim()).filter(Boolean);
                        if (existing.includes(tag)) return prev;
                        return [...existing, tag].join(", ");
                      })}
                      className="text-xs px-1.5 py-0.5 rounded bg-forge-border/60 text-forge-text-muted hover:text-forge-text hover:bg-forge-border transition-colors"
                    >{tag}</button>
                  ))}
                </div>
              )}

              {/* Public toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setSavePublic((v) => !v)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    savePublic ? "bg-forge-accent" : "bg-forge-border"
                  }`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                    savePublic ? "translate-x-4" : "translate-x-0.5"
                  }`} />
                </div>
                <span className="text-xs text-forge-text-muted">
                  {savePublic ? "Public — visible to everyone" : "Private — only you can see this"}
                </span>
              </label>

              <button onClick={handleSave} disabled={saving || !saveName.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <><Spinner /> Saving…</> : saveSuccess ? <><CheckIcon /> Saved!</> : <><SaveIcon /> Save to Library</>}
              </button>
              {saveError && <p className="text-xs text-red-400">{saveError}</p>}
            </div>
          )}
        </div>
      )}

      {!userId && (
        <div className="text-xs text-forge-text-muted text-center py-2 px-3 bg-forge-bg/30 rounded-lg border border-forge-border/50">
          Sign in to save skins to your library
        </div>
      )}

      {/* ── My Library / Community tabs ── */}
      <div className="flex bg-forge-bg rounded-md p-0.5 shrink-0">
        <button
          onClick={() => setView("mine")}
          className={`flex-1 py-1 text-xs rounded transition-colors ${
            view === "mine" ? "bg-forge-accent text-white" : "text-forge-text-muted hover:text-forge-text"
          }`}
        >
          My Library
        </button>
        <button
          onClick={handleCommunityTab}
          className={`flex-1 py-1 text-xs rounded transition-colors ${
            view === "community" ? "bg-forge-accent text-white" : "text-forge-text-muted hover:text-forge-text"
          }`}
        >
          Community
        </button>
      </div>

      {/* ── My Library view ── */}
      {view === "mine" && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          {skins.length > 0 && (
            <>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your skins…" className="forge-input text-sm shrink-0" />
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1 shrink-0">
                  <button onClick={() => setActiveTag(null)}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                      !activeTag ? "bg-forge-accent text-white" : "bg-forge-border/40 text-forge-text-muted hover:text-forge-text"
                    }`}
                  >All ({skins.length})</button>
                  {allTags.map((tag) => {
                    const count = skins.filter((s) => (s.tags ?? []).includes(tag)).length;
                    return (
                      <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                          activeTag === tag ? "bg-forge-accent text-white" : "bg-forge-border/40 text-forge-text-muted hover:text-forge-text"
                        }`}
                      >{tag} ({count})</button>
                    );
                  })}
                </div>
              )}
              <div className="flex-1 overflow-y-auto">
                {filteredSkins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-forge-text-muted">
                    <span className="text-sm">No skins match your filter</span>
                    <button onClick={() => { setSearch(""); setActiveTag(null); }}
                      className="text-xs text-forge-accent hover:underline">Clear filters</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredSkins.map((skin) => (
                      <SkinCard key={skin.id} skin={skin}
                        onLoad={onLoadSkin}
                        onDelete={deleteSkin}
                        onTogglePublic={togglePublic}
                        isOwner
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && !error && skins.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-forge-text-muted flex-1">
              <LibraryIcon />
              <span className="text-sm">Your library is empty</span>
              {userId && currentImageData && !saveOpen && (
                <button onClick={() => setSaveOpen(true)}
                  className="text-xs text-forge-accent hover:underline mt-1">
                  Save your first skin ↑
                </button>
              )}
            </div>
          )}
          {loading && <div className="flex items-center justify-center py-8 text-forge-text-muted text-sm"><Spinner />&nbsp;Loading…</div>}
          {error && <div className="text-xs text-red-400 text-center py-4">{error}</div>}
        </div>
      )}

      {/* ── Community view ── */}
      {view === "community" && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <input type="text" value={communitySearch} onChange={(e) => setCommunitySearch(e.target.value)}
            placeholder="Search community skins…" className="forge-input text-sm shrink-0" />

          {communityLoading && (
            <div className="flex items-center justify-center py-8 text-forge-text-muted text-sm">
              <Spinner />&nbsp;Loading…
            </div>
          )}

          {!communityLoading && filteredCommunity.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-forge-text-muted flex-1">
              <GlobeIcon size={32} />
              <span className="text-sm">No public skins yet</span>
              <span className="text-xs text-center">Save a skin and make it public to be the first!</span>
            </div>
          )}

          {!communityLoading && filteredCommunity.length > 0 && (
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                {filteredCommunity.map((skin) => (
                  <SkinCard
                    key={skin.id}
                    skin={skin}
                    onLoad={onLoadSkin}
                    isOwner={skin.userId === userId}
                    onTogglePublic={skin.userId === userId ? togglePublic : undefined}
                    onDelete={skin.userId === userId ? deleteSkin : undefined}
                  />
                ))}
              </div>
              {communityHasMore && (
                <button
                  onClick={loadMoreCommunity}
                  className="w-full py-2 text-xs text-forge-text-muted hover:text-forge-text border border-forge-border hover:border-forge-accent/50 rounded-lg transition-colors"
                >
                  Load more
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
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
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
function LoadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function GlobeIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={size > 16 ? 1 : 2} className={size > 16 ? "opacity-30" : ""}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
