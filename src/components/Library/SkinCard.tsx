"use client";

import type { SkinData } from "@/types";
import { loadSkinImageData } from "@/lib/minecraft-skin";

interface SkinCardProps {
  skin: SkinData;
  onLoad: (imageData: ImageData) => void;
  onDelete: (id: string) => void;
}

export function SkinCard({ skin, onLoad, onDelete }: SkinCardProps) {
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
        {skin.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={skin.previewUrl}
            alt={skin.name}
            className="h-full object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <SkinPlaceholder />
        )}
      </div>

      {/* Info */}
      <div className="px-2 py-1.5 flex items-center justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-forge-text truncate font-medium">{skin.name}</p>
          <p className="text-xs text-forge-text-muted">{date}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(skin.id);
          }}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
          title="Delete"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Tags */}
      {skin.tags.length > 0 && (
        <div className="px-2 pb-1.5 flex flex-wrap gap-0.5">
          {skin.tags.slice(0, 3).map((tag) => (
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
