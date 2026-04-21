"use client";

import type { Layer, LayerName } from "@/types";

const LAYERS: { name: LayerName; label: string }[] = [
  { name: "head", label: "Head" },
  { name: "headOuter", label: "Head (Outer)" },
  { name: "body", label: "Body" },
  { name: "bodyOuter", label: "Body (Outer)" },
  { name: "rightArm", label: "Right Arm" },
  { name: "rightArmOuter", label: "Right Arm (Outer)" },
  { name: "leftArm", label: "Left Arm" },
  { name: "leftArmOuter", label: "Left Arm (Outer)" },
  { name: "rightLeg", label: "Right Leg" },
  { name: "rightLegOuter", label: "Right Leg (Outer)" },
  { name: "leftLeg", label: "Left Leg" },
  { name: "leftLegOuter", label: "Left Leg (Outer)" },
];

interface LayerPanelProps {
  activeLayer: LayerName;
  layers: Layer[];
  onSelectLayer: (name: LayerName) => void;
  onToggleVisibility: (name: LayerName) => void;
}

export function LayerPanel({
  activeLayer,
  layers,
  onSelectLayer,
  onToggleVisibility,
}: LayerPanelProps) {
  const getLayer = (name: LayerName) =>
    layers.find((l) => l.name === name) ?? { visible: true, locked: false };

  return (
    <div className="flex flex-col gap-0.5">
      {LAYERS.map(({ name, label }) => {
        const layer = getLayer(name);
        const isActive = activeLayer === name;

        return (
          <div
            key={name}
            className={`layer-item ${isActive ? "active" : ""}`}
            onClick={() => onSelectLayer(name)}
          >
            <button
              className="text-forge-text-muted hover:text-forge-text transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(name);
              }}
              title={layer.visible ? "Hide layer" : "Show layer"}
            >
              {layer.visible ? (
                <EyeIcon />
              ) : (
                <EyeOffIcon />
              )}
            </button>
            <span
              className={`text-xs flex-1 ${
                isActive ? "text-forge-text" : "text-forge-text-muted"
              }`}
            >
              {label}
            </span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-forge-accent" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
