"use client";

import { useState, useCallback } from "react";
import { loadSkinImageData } from "@/lib/minecraft-skin";
import { CREDIT_PLANS, type PlanId } from "@/lib/stripe";
import type { BodyType, PromptHistoryItem } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface AIGeneratorProps {
  bodyType: BodyType;
  onSkinGenerated: (imageData: ImageData) => void;
  userId: string | null;
  credits: number | null;
  onCreditsChange: (remaining: number) => void;
}

export function AIGenerator({
  bodyType,
  onSkinGenerated,
  userId,
  credits,
  onCreditsChange,
}: AIGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);
  const [showBuy, setShowBuy] = useState(false);
  const [buyLoading, setBuyLoading] = useState<PlanId | null>(null);

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
      if (!res.ok) {
        if (res.status === 402) setShowBuy(true);
        throw new Error(data.error ?? "Generation failed.");
      }

      const imageData = await loadSkinImageData(data.imageUrl);
      onSkinGenerated(imageData);
      if (typeof data.creditsRemaining === "number") {
        onCreditsChange(data.creditsRemaining);
      }

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
  }, [prompt, bodyType, loading, onSkinGenerated, onCreditsChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) generate();
    },
    [generate],
  );

  const handleBuy = useCallback(async (plan: PlanId) => {
    setBuyLoading(plan);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setBuyLoading(null);
    }
  }, []);

  // Not logged in
  if (!userId) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <SparklesIcon className="w-8 h-8 text-forge-accent opacity-60" />
        <p className="text-sm text-forge-text-muted leading-relaxed">
          Sign in to generate skins with AI.
          <br />
          New accounts get <span className="text-forge-accent font-semibold">3 free credits</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Credits badge */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-forge-text-muted uppercase tracking-wide">
          Generate with AI
        </label>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          credits === 0
            ? "bg-red-900/30 text-red-400"
            : "bg-forge-accent/20 text-forge-accent"
        }`}>
          {credits === null ? "…" : `${credits} credit${credits === 1 ? "" : "s"}`}
        </span>
      </div>

      {credits === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-forge-text-muted text-center py-2">
            You&apos;re out of credits.
          </p>
          <button
            onClick={() => setShowBuy(true)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            Buy more credits
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
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
                <SparklesIcon className="w-3.5 h-3.5" />
                Generate Skin
              </>
            )}
          </button>
          <p className="text-xs text-forge-text-muted text-center">
            Ctrl+Enter to generate · costs 1 credit
          </p>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Buy credits modal */}
      {showBuy && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowBuy(false)}
        >
          <div
            className="bg-forge-panel border border-forge-border rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-forge-text">Buy AI Credits</h3>
              <button
                onClick={() => setShowBuy(false)}
                className="text-forge-text-muted hover:text-forge-text text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {(Object.entries(CREDIT_PLANS) as [PlanId, typeof CREDIT_PLANS[PlanId]][]).map(
                ([planId, plan]) => {
                  const prices: Record<PlanId, string> = {
                    starter: "$0.99",
                    creator: "$3.99",
                    pro: "$9.99",
                  };
                  const popular = planId === "creator";
                  return (
                    <button
                      key={planId}
                      onClick={() => handleBuy(planId)}
                      disabled={buyLoading !== null}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors disabled:opacity-50 ${
                        popular
                          ? "border-forge-accent bg-forge-accent/10 hover:bg-forge-accent/20"
                          : "border-forge-border hover:border-forge-accent/50 hover:bg-forge-border/40"
                      }`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-sm font-semibold text-forge-text">
                          {plan.label}
                          {popular && (
                            <span className="ml-2 text-xs text-forge-accent">Popular</span>
                          )}
                        </span>
                        <span className="text-xs text-forge-text-muted">{plan.name}</span>
                      </div>
                      <span className="text-sm font-bold text-forge-text">
                        {buyLoading === planId ? "…" : prices[planId]}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
            <p className="text-xs text-forge-text-muted text-center mt-4">
              Powered by Stripe · Secure checkout
            </p>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          <p className="text-xs text-forge-text-muted uppercase tracking-wide">History</p>
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
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  );
}
