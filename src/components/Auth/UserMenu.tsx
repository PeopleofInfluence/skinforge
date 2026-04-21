"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
  };

  const initials = user.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-forge-accent flex items-center justify-center text-xs font-bold text-white hover:bg-forge-accent-hover transition-colors"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-10 bg-forge-panel border border-forge-border rounded-lg shadow-xl w-48 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-forge-border">
            <p className="text-xs text-forge-text-muted truncate">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-sm text-forge-text-muted hover:text-forge-text hover:bg-forge-border transition-colors flex items-center gap-2"
          >
            <LogOutIcon />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function LogOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
