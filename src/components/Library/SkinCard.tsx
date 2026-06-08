"use client";

import type { SkinData } from "@/types";
import { loadSkinImageData } from "@/lib/minecraft-skin";

interface SkinCardProps {
  skin: SkinData;
  onLoad: (imageData: ImageData) => void;
  onDelete?: (id: string) => void;
  onTogglePublic?: (id: string, makePublic: boolean) => void;
  /** If true this card belongs to the current user (show delete + toggle) */
  isOwner?: boolean;
}

export function SkinCard({ skin, onLoad, onDelete, onTogglePublic, isOwner }: SkinCardProps) {
  const handleLoad = async () => {
    const imageData = await loadSkinImageData(`data:image/png;base64,${skin.pixels}`);
    onLoad(imageData);
  };

  const date = new Date(skin.updatedAt).toLocaleDateString();

  return (
    <div className="skin-card group">
      {/* Thumbnail */}
      <div
        className="checkerboard h-20 flex items-center justify-center cursor-pointer"
        onClick={handleLoad}
        title="Load this skin"
      >
        {skin.pixels ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${skin.pixels}`}
            alt={skin.name}
            className="h-full object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <SkinPlaceholder />
        )}
      </div>

      {/* Info row */}
      <div className="px-2 py-1.5 flex items-center justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-forge-text truncate font-medium">{skin.name}</p>
          <p className="text-xs text-forge-text-muted">{date}</p>
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            {/* Public / Private toggle */}
            {onTogglePublic && (
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePublic(skin.id, !skin.isPublic); }}
                className={`transition-colors ${
                  skin.isPublic
                    ? "text-forge-accent hover:text-forge-accent/70"
                    : "text-forge-text-muted hover:text-forge-text"
                }`}
                title={skin.isPublic ? "Public — click to make private" : "Private — click to make public"}
              >
                {skin.isPublic ? <GlobeIcon /> : <LockIcon />}
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(skin.id); }}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Delete"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      {skin.tags.filter((t) => t !== "draft").length > 0 && (
        <div className="px-2 pb-1.5 flex flex-wrap gap-0.5">
          {skin.tags.filter((t) => t !== "draft").slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-forge-border text-forge-text-muted px-1.5 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SkinPlaceholder() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-forge-border">
      <rect x="8" y="2" width="8" height="8" rx="1" />
      <rect x="7" y="10" width="10" height="8" rx="1" />
      <rect x="3" y="10" width="4" height="7" rx="1" />
      <rect x="17" y="10" width="4" height="7" rx="1" />
      <rect x="7" y="18" width="4" height="4" rx="1" />
      <rect x="13" y="18" width="4" height="4" rx="1" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
