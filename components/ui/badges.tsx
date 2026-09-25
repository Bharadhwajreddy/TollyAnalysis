import type { ConfidenceGrade } from "@/lib/domain/types";

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-[#e9c46a] bg-gold-soft px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide text-[#7a5200] ${className}`}
      title="Synthetic demo data. Not real-world figures."
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
      DEMO DATA
    </span>
  );
}

const CONF: Record<ConfidenceGrade, { label: string; cls: string; icon: string }> = {
  high: { label: "High", cls: "text-good border-[#b9dcc4] bg-[#eef7f1]", icon: "●●●" },
  medium: { label: "Medium", cls: "text-warn border-[#ecd3a8] bg-[#fbf3e4]", icon: "●●○" },
  low: { label: "Low", cls: "text-bad border-[#efc1bd] bg-[#fcefee]", icon: "●○○" },
  insufficient: { label: "Insufficient", cls: "text-muted border-line bg-surface-2", icon: "○○○" },
};

export function ConfidenceBadge({ grade, compact = false }: { grade: ConfidenceGrade; compact?: boolean }) {
  const c = CONF[grade];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-px text-[11px] font-medium ${c.cls}`}>
      <span aria-hidden className="font-mono text-[8px] tracking-tighter">{c.icon}</span>
      {compact ? c.label : `${c.label} confidence`}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "wine" | "teal" }) {
  const cls =
    tone === "wine" ? "bg-wine-soft text-wine" : tone === "teal" ? "bg-teal-soft text-[#00596a]" : "bg-surface-2 text-ink-2 border border-line";
  return <span className={`inline-flex items-center rounded px-1.5 py-px text-[11px] font-medium ${cls}`}>{children}</span>;
}
