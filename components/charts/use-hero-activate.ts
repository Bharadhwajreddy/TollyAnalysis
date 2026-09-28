"use client";

import { useRef } from "react";

/**
 * One tap / click selects a hero; a second tap on the same hero within 450 ms
 * (double-click or double-tap) opens their page. Works the same on touch screens,
 * where native dblclick is unreliable.
 */
export function useHeroActivate(onSelect: (id: string) => void, onOpen: (id: string) => void) {
  const last = useRef<{ id: string; at: number } | null>(null);
  return (id: string) => {
    const now = Date.now();
    if (last.current && last.current.id === id && now - last.current.at < 450) {
      last.current = null;
      onOpen(id);
      return;
    }
    last.current = { id, at: now };
    onSelect(id);
  };
}
