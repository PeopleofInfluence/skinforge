"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { SkinData, BodyType } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function useSkinLibrary(userId: string | null) {
  const [skins, setSkins] = useState<SkinData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSkins = useCallback(async () => {
    if (!userId) {
      setSkins([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("skins")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setSkins(
        (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          tags: row.tags ?? [],
          pixels: row.pixels,
          bodyType: row.body_type as BodyType,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          userId: row.user_id,
          previewUrl: row.preview_url ?? undefined,
        }))
      );
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSkins();
  }, [fetchSkins]);

  const saveSkin = useCallback(
    async (
      name: string,
      pixels: string,
      bodyType: BodyType,
      tags: string[] = [],
      existingId?: string
    ): Promise<SkinData | null> => {
      if (!userId) {
        setError("Must be logged in to save skins.");
        return null;
      }
      setError(null);

      const id = existingId ?? uuidv4();
      const now = new Date().toISOString();

      const payload = {
        id,
        user_id: userId,
        name,
        tags,
        pixels,
        body_type: bodyType,
        updated_at: now,
      };

      const { data, error: err } = await supabase
        .from("skins")
        .upsert({ ...payload, created_at: now })
        .select()
        .single();

      if (err) {
        setError(err.message);
        return null;
      }

      const saved: SkinData = {
        id: data.id,
        name: data.name,
        tags: data.tags ?? [],
        pixels: data.pixels,
        bodyType: data.body_type as BodyType,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        userId: data.user_id,
      };

      setSkins((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });

      return saved;
    },
    [userId]
  );

  const deleteSkin = useCallback(
    async (id: string) => {
      if (!userId) return;
      const { error: err } = await supabase
        .from("skins")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (err) {
        setError(err.message);
      } else {
        setSkins((prev) => prev.filter((s) => s.id !== id));
      }
    },
    [userId]
  );

  return { skins, loading, error, saveSkin, deleteSkin, refresh: fetchSkins };
}
