"use client";

import { useState, useCallback } from "react";
import { loadSkinImageData } from "@/lib/minecraft-skin";
import type { BodyType, PromptHistoryItem } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface AIGeneratorProps {
  bodyType: BodyType;
  onSkinGenerated: (imageData: ImageData) => void;
}

export function AIGenerator({ bodyType, onSkinGenerated }: AIGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);

  const generate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-skin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), bodyType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");

      const imageData = await loadSkinImageData(data.imageUrl);
      onSkinGenerated(imageData);

      setHistory((prev) => [
        {
          id: uuidv4(),
          prompt: prompt.trim(),
          bodyType,
          timestamp: new Date().toISOString(),
          resultUrl: data.imageUrl,
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [prompt, bodyType, loading, onSkinGenerated]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        generate();
      }
    },
    [generate]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-xs text-forge-text-muted uppercase tracking-wide">
          Generate with AI
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Viking warrior with golden armor, red cape..."
          rows={3}
          className="forge-input resize-none text-sm"
          disabled={loading}
        />
        <button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner />
              Generating…
            </>
          ) : (
            <>
              <SparklesIcon />
              Generate Skin
            </>
          )}
        </button>
        <p className="text-xs text-forge-text-muted text-center">
          Ctrl+Enter to generate
        </p>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          <p className="text-xs text-forge-text-muted uppercase tracking-wide">
            History
          </p>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => setPrompt(item.prompt)}
                className="text-left text-xs text-forge-text-muted hover:text-forge-text bg-forge-border/40 hover:bg-forge-border px-2 py-1.5 rounded transition-colors truncate"
                title={item.prompt}
              >
                {item.prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  );
}
