"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = useCallback(async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    const fn =
      mode === "signup"
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });

    const { error: err } = await fn;

    if (err) {
      setError(err.message);
    } else {
      if (mode === "signup") {
        setMessage("Check your email for a confirmation link.");
      } else {
        onClose();
      }
    }
    setLoading(false);
  }, [email, password, mode, onClose]);

  const handleGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-forge-panel border border-forge-border rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-forge-text">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h2>
          <button
            onClick={onClose}
            className="text-forge-text-muted hover:text-forge-text transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md border border-forge-border hover:bg-forge-border text-sm text-forge-text transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-forge-border" />
            <span className="text-xs text-forge-text-muted">or</span>
            <div className="flex-1 border-t border-forge-border" />
          </div>

          {/* Email */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="forge-input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="forge-input"
            onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
          />

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          {message && (
            <p className="text-xs text-forge-success">{message}</p>
          )}

          <button
            onClick={handleEmailAuth}
            disabled={loading || !email || !password}
            className="btn-primary w-full"
          >
            {loading
              ? "Loading…"
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </button>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-xs text-forge-text-muted hover:text-forge-text transition-colors text-center"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
