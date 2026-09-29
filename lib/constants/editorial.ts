/**
 * Editorial overrides applied on top of the automatic lead-role check.
 * Each entry is a film (Wikipedia article title) that must NOT count for that hero,
 * with the reason shown on his page. Keep this list small and explain every entry.
 */
export const EXCLUDED_CREDITS: Record<string, { film: string; reason: string }[]> = {
  "rana-daggubati": [
    { film: "Baahubali: The Beginning", reason: "antagonist role, not a co-lead" },
    { film: "Baahubali 2: The Conclusion", reason: "antagonist role, not a co-lead" },
  ],
};
