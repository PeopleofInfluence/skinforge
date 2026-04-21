"use client";

import { useState, useCallback } from "react";
import { rgbaToHex } from "@/lib/minecraft-skin";

const PALETTE: string[] = [
  "#ffffff", "#e8e8e8", "#c0c0c0", "#808080", "#404040", "#000000",
  "#ff6b6b", "#ee5a24", "#f0932b", "#f9ca24", "#6ab04c", "#22a6b3",
  "#4a90d9", "#7c3aed", "#c0392b", "#8e44ad",
  "#ff9ff3", "#ffeaa7", "#81ecec", "#a29bfe",
  "#2d3436", "#636e72", "#b2bec3", "#dfe6e9",
  "#6c5ce7", "#00b894", "#00cec9", "#fd79a8",
  "#55efc4", "#fab1a0", "#74b9ff", "#fdcb6e",
  // Minecraft-style colours
  "#c8b090", "#8b6343", "#5a3a1a", "#3b1f0a",
  "#5c8a00", "#2d6600", "#1a3d00", "#4a7c59",
  "#1565c0", "#0d47a1", "#e3f2fd", "#90caf9",
];

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(color);

  const handleNativeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomColor(e.target.value);
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleHexInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCustomColor(val);
      if (/^#[0-9a-f]{6}$/i.test(val)) {
        onChange(val);
      }
    },
    [onChange]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Current colour + native picker */}
      <div className="flex items-center gap-2">
        <label className="relative cursor-pointer">
          <div
            className="w-10 h-10 rounded-md border-2 border-forge-border shadow-inner"
            style={{ backgroundColor: color }}
          />
          <input
            type="color"
            value={color}
            onChange={handleNativeChange}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </label>
        <input
          type="text"
          value={customColor}
          onChange={handleHexInput}
          maxLength={7}
          className="forge-input font-mono text-xs w-24"
          placeholder="#ffffff"
        />
      </div>

      {/* Palette */}
      <div className="grid grid-cols-8 gap-1">
        {PALETTE.map((c) => (
          <button
            key={c}
            className={`colour-swatch ${c === color ? "selected" : ""}`}
            style={{ backgroundColor: c }}
            onClick={() => onChange(c)}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}
