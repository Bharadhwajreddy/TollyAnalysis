/**
 * Bar / ring colours, like the model-maker colours on AI benchmark sites.
 * Palettes validated for colour-vision-deficiency separation; every mark also carries
 * a direct name label, so colour is never the only cue.
 */
export type ColourBy = "era" | "family";

export interface Group {
  key: string;
  label: string;
  color: string;
}

export const ERA_GROUPS: Group[] = [
  { key: "pre2000", label: "Debut before 2000", color: "#2a78d6" },
  { key: "2000s", label: "Debut 2000–2007", color: "#eb6834" },
  { key: "2010s", label: "Debut 2008–2015", color: "#1baf7a" },
  { key: "new", label: "Debut 2016 onwards", color: "#4a3aa7" },
];

export const FAMILY_GROUPS: Group[] = [
  { key: "mega", label: "Mega family", color: "#e34948" },
  { key: "nandamuri", label: "Nandamuri family", color: "#eda100" },
  { key: "akkineni", label: "Akkineni family", color: "#2a78d6" },
  { key: "daggubati", label: "Daggubati family", color: "#1baf7a" },
  { key: "ghattamaneni", label: "Ghattamaneni family", color: "#eb6834" },
  { key: "manchu", label: "Manchu family", color: "#4a3aa7" },
  { key: "other", label: "Not from a film family", color: "#8a7f78" },
];

export function eraKey(debutYear: number | null | undefined): string {
  if (!debutYear) return "2010s";
  if (debutYear < 2000) return "pre2000";
  if (debutYear <= 2007) return "2000s";
  if (debutYear <= 2015) return "2010s";
  return "new";
}

export function groupOf(h: { family?: string | null; debutYear?: number | null }, by: ColourBy): Group {
  const list = by === "era" ? ERA_GROUPS : FAMILY_GROUPS;
  const key = by === "era" ? eraKey(h.debutYear) : (h.family ?? "other");
  return list.find((g) => g.key === key) ?? list[list.length - 1];
}
