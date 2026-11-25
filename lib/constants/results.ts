/** Box-office results from worst to best: the chart's rows. */
export const RESULT_LEVELS = [
  { key: "disaster", label: "Disaster", color: "#8e2a2a" },
  { key: "flop", label: "Flop", color: "#c0504d" },
  { key: "below_average", label: "Below average", color: "#d9825b" },
  { key: "average", label: "Average", color: "#d9a441" },
  { key: "above_average", label: "Above average", color: "#b5b843" },
  { key: "hit", label: "Hit", color: "#6aa84f" },
  { key: "super_hit", label: "Super hit", color: "#2f8f4e" },
  { key: "blockbuster", label: "Blockbuster", color: "#1f6b3a" },
] as const;
