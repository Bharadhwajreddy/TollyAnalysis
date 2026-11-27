"use client";

/* eslint-disable @next/next/no-img-element -- tiny local thumbnails */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FilmTip, Mark } from "@/components/charts/film-strip";
import { FloatTip, type FloatTipState } from "@/components/charts/float-tip";
import { lit, useFocus } from "@/components/charts/focus";
import { useElementWidth } from "@/components/charts/use-width";
import { Segmented } from "@/components/ui/segmented";
import { filmHref, type FilmDot } from "@/lib/ledger-types";
import { grossShare, yearPos } from "@/lib/timeline";

export interface ReelRow {
  key: string;
  name: string;
  img: string | null;
  /** CSS colour of the compare slot (var(--slot-a) …). */
  color: string;
  /** Debut year (may be before 2000, when films are not tracked). */
  debut: number | null;
  films: FilmDot[];
}

type Mode = "calendar" | "debut";

const ROW = 58;
const MARK_H = 40;
const AXIS = 22;

/**
 * Aligned career reels: one row of film marks per hero. "Calendar years" puts every career on the shared
 * 2000 → today spine (a film two heroes led sits at the same place, joined by a hairline); "Years since
 * debut" slides every mark so careers start together at year 0. Marks glide between the two alignments.
 */
export function AlignedReels({ rows, end, partialFrom }: { rows: ReelRow[]; end: number; partialFrom: number | null }) {
  const [mode, setMode] = useState<Mode>("calendar");
  const [wrap, width] = useElementWidth<HTMLDivElement>(900);
  const narrow = width < 640;
  const labelW = narrow ? 0 : 196;
  const plotW = Math.max(40, width - labelW);
  const router = useRouter();
  const { focus } = useFocus();
  const svg = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<{ r: number; i: number } | null>(null);
  const [tip, setTip] = useState<FloatTipState | null>(null);

  // Where each career starts: the debut year, made precise by the first film when it falls in that year.
  const starts = useMemo(
    () =>
      rows.map((r) => {
        const first = r.films[0];
        const firstPos = first ? yearPos(first.dt, first.y) : 2000;
        if (r.debut === null) return firstPos;
        return first && first.y === r.debut ? firstPos : r.debut + 0.5;
      }),
    [rows],
  );
  const span = Math.max(5, ...starts.map((s) => end - s));
  const dom: [number, number] = mode === "calendar" ? [2000, end] : [0, Math.ceil(span)];
  const pad = 6;
  const x = (v: number) => pad + ((v - dom[0]) / (dom[1] - dom[0])) * (plotW - pad * 2);
  const every = mode === "calendar" ? (plotW < 520 ? 5 : plotW < 1300 ? 2 : 1) : plotW < 520 ? 10 : 5;
  const ticks: number[] = [];
  for (let t = Math.ceil(dom[0] / every) * every; t <= Math.floor(dom[1]); t += every) ticks.push(t);
  const perYear = (plotW - 12) / Math.max(1, dom[1] - dom[0]);
  const w = Math.max(2, Math.min(7, perYear / 3.5));
  const rowH = narrow ? ROW + 22 : ROW;
  const top = (ri: number) => AXIS + ri * rowH + (narrow ? 22 : 0);
  const H = AXIS + rows.length * rowH + 6;

  const pts = useMemo(
    () =>
      rows.map((r, ri) =>
        r.films.map((f) => {
          const p = yearPos(f.dt, f.y);
          return { f, x: x(mode === "calendar" ? p : p - starts[ri]), h: Math.max(4, grossShare(f.g) * MARK_H) };
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, mode, plotW, starts, end],
  );

  // Films two or more of these heroes led: hairlines between their rows (calendar mode only).
  const shared = useMemo(() => {
    const at = new Map<string, number[]>();
    rows.forEach((r, ri) => r.films.forEach((f) => at.set(f.s, [...(at.get(f.s) ?? []), ri])));
    return [...at.entries()].filter(([, rs]) => rs.length > 1).map(([s, rs]) => ({ s, rs }));
  }, [rows]);

  const show = (a: { r: number; i: number } | null) => {
    setActive(a);
    if (!a || !svg.current) return setTip(null);
    const p = pts[a.r][a.i];
    const rect = svg.current.getBoundingClientRect();
    const base = top(a.r) + MARK_H + 4;
    setTip({ x: rect.left + labelW + p.x, y: rect.top + base - p.h, y2: rect.top + base, content: <FilmTip f={p.f} /> });
  };
  const nearest = (cx: number, cy: number) => {
    if (!svg.current) return null;
    const rect = svg.current.getBoundingClientRect();
    const px = cx - rect.left - labelW;
    const py = cy - rect.top;
    const r = rows.findIndex((_, ri) => py >= top(ri) - 6 && py < top(ri) + MARK_H + 10);
    if (r < 0 || !pts[r].length) return null;
    let best = 0;
    pts[r].forEach((p, i) => Math.abs(p.x - px) < Math.abs(pts[r][best].x - px) && (best = i));
    return Math.abs(pts[r][best].x - px) < 14 ? { r, i: best } : null;
  };
  const onKey = (e: KeyboardEvent) => {
    const k = e.key;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", "Escape"].includes(k)) return;
    e.preventDefault();
    if (k === "Escape") return show(null);
    if (k === "Enter" && active) return router.push(filmHref(pts[active.r][active.i].f.s));
    const cur = active ?? { r: 0, i: -1 };
    if (k === "ArrowLeft" || k === "ArrowRight") {
      const n = pts[cur.r].length;
      if (n) show({ r: cur.r, i: (cur.i + (k === "ArrowRight" ? 1 : -1) + n) % n });
    } else {
      const r = Math.max(0, Math.min(rows.length - 1, cur.r + (k === "ArrowDown" ? 1 : -1)));
      if (!pts[r].length) return;
      const cx = cur.i >= 0 ? pts[cur.r][cur.i].x : 0;
      let best = 0;
      pts[r].forEach((p, i) => Math.abs(p.x - cx) < Math.abs(pts[r][best].x - cx) && (best = i));
      show({ r, i: best });
    }
  };

  const dim = !!focus && focus.kind !== "hero";
  const tickLabel = (t: number) => (mode === "calendar" ? String(t) : t === 0 ? "Debut" : `${t} yrs`);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Mode>
          label="Align careers by"
          value={mode}
          onChange={(m) => (setMode(m), show(null))}
          options={[
            { value: "calendar", label: "Calendar years" },
            { value: "debut", label: "Years since debut" },
          ]}
        />
        <p className="text-[12.5px] text-muted">{mode === "calendar" ? (shared.length ? `${shared.length} ${shared.length === 1 ? "film" : "films"} together, joined by a line` : "Same timeline for everyone") : "Careers start together; hatching = before 2000, not tracked"}</p>
      </div>
      <div ref={wrap} className="relative">
        {!narrow && (
          <div className="absolute left-0 top-0" style={{ width: labelW }}>
            {rows.map((r, ri) => (
              <div key={r.key} className="absolute left-0 flex items-center gap-2.5 pr-4" style={{ top: top(ri) + 4, height: MARK_H, width: labelW }}>
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                <Link href={`/hero/${r.key}`} className="group/r flex min-w-0 items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-rule">{r.img && <img src={r.img} alt="" width={28} height={28} className="h-full w-full object-cover object-[50%_18%]" />}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink group-hover/r:underline">{r.name}</span>
                    <span className="tabular block text-[11.5px] text-muted">{r.debut ? `debut ${r.debut}` : ""}{r.debut ? " · " : ""}{r.films.length} films</span>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
        <svg
          ref={svg}
          width={width}
          height={H}
          role="img"
          aria-label={`Career reels of ${rows.map((r) => r.name).join(", ")}, ${mode === "calendar" ? "on calendar years" : "aligned by years since debut"}`}
          tabIndex={0}
          data-dim={dim ? "" : undefined}
          onKeyDown={onKey}
          onBlur={() => show(null)}
          onMouseMove={(e) => {
            const a = nearest(e.clientX, e.clientY);
            if (a?.r !== active?.r || a?.i !== active?.i) show(a);
          }}
          onMouseLeave={() => show(null)}
          onClick={(e) => {
            const a = nearest(e.clientX, e.clientY);
            if (a) router.push(filmHref(pts[a.r][a.i].f.s));
          }}
          className="block cursor-pointer overflow-visible outline-none"
        >
          <g transform={`translate(${labelW},0)`}>
            {/* Axis: ticks crossfade when the alignment changes */}
            <g key={mode} className="fade-in">
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={x(t)} x2={x(t)} y1={AXIS - 4} y2={H - 6} stroke="var(--grid)" strokeDasharray={mode === "calendar" ? (t % 10 ? "1 3" : undefined) : t % 10 ? "1 3" : undefined} />
                  <text x={x(t)} y={11} textAnchor="middle" className={`tabular text-[11px] ${t === 0 && mode === "debut" ? "fill-ink font-semibold" : "fill-muted"}`}>
                    {tickLabel(t)}
                  </text>
                </g>
              ))}
            </g>

            {rows.map((r, ri) => {
              const base = top(ri) + MARK_H + 4;
              const notTracked = mode === "debut" && r.debut !== null && r.debut < 2000 ? x(2000 - starts[ri]) : null;
              const runFrom = partialFrom !== null ? (mode === "calendar" ? x(partialFrom) : x(partialFrom - starts[ri])) : null;
              return (
                <g key={r.key}>
                  {narrow && (
                    <foreignObject x={0} y={top(ri) - 22} width={plotW} height={20}>
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                        <span className="truncate">{r.name}</span>
                        <span className="tabular font-normal text-muted">{r.debut ? `· debut ${r.debut}` : ""}</span>
                      </div>
                    </foreignObject>
                  )}
                  <rect x={0} y={top(ri) + 4} width={plotW} height={MARK_H} fill="transparent" />
                  {notTracked !== null && <rect x={x(0)} y={top(ri) + 4} width={Math.max(0, notTracked - x(0))} height={MARK_H} fill="url(#hatch)" opacity={0.6} className="fade-in" />}
                  {runFrom !== null && (
                    <rect y={top(ri) + 4} height={MARK_H} fill="url(#hatch)" opacity={0.45} className="transition-[x,width] duration-[var(--dur-4)] ease-[var(--ease-in-out)]" style={{ x: runFrom, width: Math.max(0, x(mode === "calendar" ? end : end - starts[ri]) - runFrom) }} />
                  )}
                  <line x1={0} x2={plotW} y1={base + 0.5} y2={base + 0.5} stroke="var(--rule)" />
                  {(() => {
                    const a = x(mode === "calendar" ? Math.max(2000, starts[ri]) : 0);
                    const b = x(mode === "calendar" ? end : end - starts[ri]);
                    return <rect y={base - 0.25} height={1.5} fill={r.color} className="transition-[x,width] duration-[var(--dur-4)] ease-[var(--ease-in-out)]" style={{ x: a, width: Math.max(0, b - a) }} />;
                  })()}
                  {pts[ri].map((p, i) => (
                    <g key={p.f.s} className="transition-transform duration-[var(--dur-4)] ease-[var(--ease-in-out)]" style={{ transform: `translateX(${p.x}px)`, transitionDelay: `${Math.min(120, i * 3)}ms` }}>
                      <Mark x={0} base={base} h={p.h} w={w} o={p.f.o} active={active?.r === ri && active.i === i} litOn={lit(p.f, focus)} />
                    </g>
                  ))}
                </g>
              );
            })}

            {/* Shared films */}
            <g className="transition-opacity duration-[var(--dur-3)]" style={{ opacity: mode === "calendar" ? 1 : 0 }} aria-hidden>
              {shared.map(({ s, rs }) => {
                const ri = rs[0];
                const rj = rs[rs.length - 1];
                const p = pts[ri].find((q) => q.f.s === s);
                const q = pts[rj].find((q2) => q2.f.s === s);
                if (!p || !q) return null;
                return <line key={s} x1={p.x} x2={p.x} y1={top(ri) + MARK_H + 6} y2={top(rj) + 4 + MARK_H - q.h - 2} stroke="var(--ink-2)" strokeOpacity={0.5} strokeDasharray="2 2" />;
              })}
            </g>
          </g>
        </svg>
      </div>
      <FloatTip state={tip} />
    </div>
  );
}
