import type { Industry } from "@/lib/domain/types";

/** Categorical colour follows the entity's industry, never its rank. */
export const INDUSTRY_COLOR: Record<Industry, string> = {
  telugu: "var(--series-telugu)",
  tamil: "var(--series-tamil)",
  malayalam: "var(--series-malayalam)",
  kannada: "var(--series-kannada)",
  hindi: "var(--series-other)",
};

export const INDUSTRY_ORDER: Industry[] = ["telugu", "tamil", "malayalam", "kannada", "hindi"];
