"use client";

import { useState } from "react";
import { AIGenerator } from "@/components/AI/AIGenerator";
import { SkinUploader } from "@/components/Upload/SkinUploader";
import { SkinMerger } from "@/components/Upload/SkinMerger";
import { SkinLibrary } from "@/components/Library/SkinLibrary";
import type { BodyType } from "@/types";

interface RightPanelProps {
  bodyType: BodyType;
  onBodyTypeChange: (bt: BodyType) => void;
  onSkinGenerated: (imageData: ImageData) => void;
  userId: string | null;
  currentImageData: ImageData | null;
}

type Tab = "ai" | "upload" | "merge" | "library";

export function RightPanel({
  bodyType,
  onBodyTypeChange,
  onSkinGenerated,
  userId,
  currentImageData,
}: RightPanelProps) {
  const [tab, setTab] = useState<Tab>("ai");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "ai", label: "AI", icon: <SparklesIcon /> },
    { id: "upload", label: "Upload", icon: <UploadIcon /> },
    { id: "merge", label: "Merge", icon: <MergeIcon /> },
    { id: "library", label: "Library", icon: <LibraryIcon /> },
  ];

  return (
    <div className="flex flex-col h-full bg-forge-panel border-l border-forge-border w-64 shrink-0">
      {/* Body type toggle */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-forge-border">
        <span className="text-xs text-forge-text-muted">Model:</span>
        <div className="flex bg-forge-bg rounded-md p-0.5 flex-1">
          {(["classic", "slim"] as BodyType[]).map((bt) => (
            <button
              key={bt}
              onClick={() => onBodyTypeChange(bt)}
              className={`flex-1 py-1 text-xs rounded capitalize transition-colors ${
                bodyType === bt
                  ? "bg-forge-accent text-white"
                  : "text-forge-text-muted hover:text-forge-text"
              }`}
            >
              {bt === "classic" ? "Steve" : "Alex"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-forge-border">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
              tab === id
                ? "text-forge-text border-b-2 border-forge-accent"
                : "text-forge-text-muted hover:text-forge-text"
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "ai" && (
          <AIGenerator
            bodyType={bodyType}
            onSkinGenerated={onSkinGenerated}
          />
        )}
        {tab === "upload" && (
          <SkinUploader
            bodyType={bodyType}
            onSkinLoaded={onSkinGenerated}
          />
        )}
        {tab === "merge" && (
          <SkinMerger onMergeComplete={onSkinGenerated} />
        )}
        {tab === "library" && (
          <SkinLibrary
            userId={userId}
            currentImageData={currentImageData}
            currentBodyType={bodyType}
            onLoadSkin={onSkinGenerated}
          />
        )}
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function MergeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}
function LibraryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
