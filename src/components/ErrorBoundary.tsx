"use client";

import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-forge-bg text-forge-text gap-6 px-6 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-forge-text-muted max-w-md text-sm">
            SkinForge hit an unexpected error. Your work may be saved in the browser — try reloading.
          </p>
          <p className="text-xs text-forge-text-muted font-mono bg-forge-panel border border-forge-border rounded px-3 py-2 max-w-md break-all">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-forge-accent hover:bg-forge-accent-hover text-white font-semibold transition-colors"
          >
            Reload SkinForge
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
