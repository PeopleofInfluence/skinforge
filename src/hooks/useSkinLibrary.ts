"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { SkinData, BodyType } from "@/types";
import { v4 as uuidv4 } from "uuid";

function rowToSkin(row: Record<string, unknown>): SkinData {
  return {
    id: row.id as string,
    name: row.name as string,
    tags: (row.tags as string[]) ?? [],
    pixels: row.pixels as string,
    bodyType: row.body_type as BodyType,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    userId: row.user_id as string,
    isPublic: (row.is_public as boolean) ?? false,
  };
}

export function useSkinLibrary(userId: string | null) {
  const [skins, setSkins] = useState<SkinData[]>([]);
  const [communitySkins, setCommunitySkins] = useState<SkinData[]>([]);
  const [loading, setLoading] = useState(false);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch the current user's own skins ──────────────────────────────────
  const fetchSkins = useCallback(async () => {
    if (!userId) { setSkins([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("skins")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (err) { setError(err.message); }
    else { setSkins((data ?? []).map(rowToSkin)); }
    setLoading(false);
  }, [userId]);

  // ── Fetch all public skins from everyone (with creator username) ────────
  const fetchCommunitySkins = useCallback(async () => {
    setCommunityLoading(true);
    const { data: skinsData } = await supabase
      .from("skins")
      .select("*")
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (skinsData && skinsData.length > 0) {
      // Batch-fetch profiles for all unique creators
      const userIds = [...new Set(skinsData.map((s) => s.user_id as string))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);

      const usernameMap = new Map(
        (profilesData ?? []).map((p) => [p.user_id as string, p.username as string])
      );

      setCommunitySkins(
        skinsData.map((row) => ({
          ...rowToSkin(row),
          creatorUsername: usernameMap.get(row.user_id as string),
        }))
      );
    } else {
      setCommunitySkins([]);
    }
    setCommunityLoading(false);
  }, []);

  useEffect(() => { fetchSkins(); }, [fetchSkins]);

  // ── Save / upsert a skin ─────────────────────────────────────────────────
  const saveSkin = useCallback(
    async (
      name: string,
      pixels: string,
      bodyType: BodyType,
      tags: string[] = [],
      existingId?: string,
      isPublic = false,
    ): Promise<SkinData | null> => {
      if (!userId) { setError("Must be logged in to save skins."); return null; }
      setError(null);

      const id = existingId ?? uuidv4();
      const now = new Date().toISOString();

      const { data, error: err } = await supabase
        .from("skins")
        .upsert({
          id,
          user_id: userId,
          name,
          tags,
          pixels,
          body_type: bodyType,
          is_public: isPublic,
          preview_url: null,
          updated_at: now,
          created_at: now,
        })
        .select()
        .single();

      if (err) { setError(err.message); return null; }

      const saved = rowToSkin(data);
      setSkins((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = saved; return copy; }
        return [saved, ...prev];
      });
      return saved;
    },
    [userId]
  );

  // ── Toggle public / private for a skin the user owns ────────────────────
  const togglePublic = useCallback(
    async (id: string, makePublic: boolean) => {
      if (!userId) return;
      const { error: err } = await supabase
        .from("skins")
        .update({ is_public: makePublic, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId);

      if (err) { setError(err.message); return; }
      setSkins((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isPublic: makePublic } : s))
      );
    },
    [userId]
  );

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteSkin = useCallback(
    async (id: string) => {
      if (!userId) return;
      const { error: err } = await supabase
        .from("skins")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (err) { setError(err.message); }
      else { setSkins((prev) => prev.filter((s) => s.id !== id)); }
    },
    [userId]
  );

  return {
    skins,
    communitySkins,
    loading,
    communityLoading,
    error,
    saveSkin,
    deleteSkin,
    togglePublic,
    refresh: fetchSkins,
    refreshCommunity: fetchCommunitySkins,
  };
}
