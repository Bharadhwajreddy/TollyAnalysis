"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { BudgetGross, type MoneyPoint } from "@/components/charts/budget-gross";
import { OutcomeLegend } from "@/components/charts/outcome-legend";
import { DirectorToken, FilmToken, HeroToken, MiniMark } from "@/components/entity/tokens";
import { ChartFrame, Source } from "@/components/ui/chart-frame";
import { Segmented } from "@/components/ui/segmented";
import { inr, int, multiple } from "@/lib/format";
import { OUTCOME_LABEL, VERDICT_LABEL, type Outcome } from "@/lib/ledger-types";

/** A film as the explorer needs it (short keys keep the payload small). */
export interface ExplorerFilm {
  s: string;
  t: string;
  y: number;
  o: Outcome;
  v: string | null;
  g: number | null;
  b: number | null;
  sc: number | null;
  h: [string, string][];
  d: string | null;
  ds: string | null;
  te: boolean;
}

type Tab = "loved" | "biggest" | "efficient" | "misses";
type Lang = "te" | "all";
type Decade = "all" | "2000s" | "2010s" | "2020s";

const TABS: { value: Tab; label: string; title: string }[] = [
  { value: "loved", label: "Most loved", title: "Highest film score" },
  { value: "biggest", label: "Biggest", title: "Highest reported gross" },
  { value: "efficient", label: "Most efficient", title: "Gross ÷ budget, budgets of ₹10 crore or more" },
  { value: "misses", label: "Biggest misses", title: "Furthest below their budget" },
];
const DECADES: Decade[] = ["all", "2000s", "2010s", "2020s"];
const MIN_BUDGET = 10;
const PAGE = 25;

const pick = <T extends string>(v: string | null, ok: readonly T[], d: T): T => (v && (ok as readonly string[]).includes(v) ? (v as T) : d);

function resultText(f: ExplorerFilm) {
  if (f.o === "unknown") return "Not reported";
  if (f.o === "recent") return "Too recent";
  return f.v ? (VERDICT_LABEL[f.v] ?? OUTCOME_LABEL[f.o]) : OUTCOME_LABEL[f.o];
}

/**
 * The films explorer. The hero view is budget against reported gross; the tabs rank the same films four
 * ways and ring the leaders on the chart. Language, decade and tab live in the URL, so any view can be shared.
 */
export function FilmsExplorer({ films }: { films: ExplorerFilm[] }) {
  const sp = useSearchParams();
  const [state, setState] = useState(() => ({
    tab: pick<Tab>(sp.get("tab"), TABS.map((t) => t.value), "loved"),
    lang: pick<Lang>(sp.get("lang"), ["te", "all"], "te"),
    decade: pick<Decade>(sp.get("decade"), DECADES, "all"),
  }));
  const [shown, setShown] = useState(PAGE);
  const [hovered, setHovered] = useState<string | null>(null);

  const update = useCallback((patch: Partial<typeof state>) => {
    setState((s) => {
      const n = { ...s, ...patch };
      const q = new URLSearchParams();
      if (n.tab !== "loved") q.set("tab", n.tab);
      if (n.lang !== "te") q.set("lang", n.lang);
      if (n.decade !== "all") q.set("decade", n.decade);
      const qs = q.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
      return n;
    });
    setShown(PAGE);
  }, []);

  const pool = useMemo(
    () =>
      films.filter((f) => (state.lang === "all" || f.te) && (state.decade === "all" || (f.y >= Number(state.decade.slice(0, 4)) && f.y < Number(state.decade.slice(0, 4)) + 10))),
    [films, state.lang, state.decade],
  );
  const money = useMemo(() => pool.filter((f) => f.g !== null && f.b !== null && f.g > 0 && f.b > 0), [pool]);

  const ranked = useMemo(() => {
    switch (state.tab) {
      case "loved":
        return pool.filter((f) => f.sc !== null).sort((a, b) => (b.sc as number) - (a.sc as number));
      case "biggest":
        return pool.filter((f) => f.g !== null).sort((a, b) => (b.g as number) - (a.g as number));
      case "efficient":
        return money.filter((f) => (f.b as number) >= MIN_BUDGET).sort((a, b) => (b.g as number) / (b.b as number) - (a.g as number) / (a.b as number));
      case "misses":
        return money.filter((f) => (f.g as number) < (f.b as number)).sort((a, b) => (b.b as number) - (b.g as number) - ((a.b as number) - (a.g as number)));
    }
  }, [pool, money, state.tab]);

  // The small-budget films the efficiency floor leaves out (shown in the note so the rule is visible).
  const skipped = useMemo(() => money.filter((f) => (f.b as number) < MIN_BUDGET).sort((a, b) => (b.g as number) / (b.b as number) - (a.g as number) / (a.b as number)), [money]);

  const points: MoneyPoint[] = useMemo(
    () => money.map((f) => ({ s: f.s, t: f.t, y: f.y, o: f.o, v: f.v, g: f.g as number, b: f.b as number, sc: f.sc, who: f.h.map((h) => h[1]).join(", ") })),
    [money],
  );
  const emphasis = useMemo(() => {
    const inChart = new Set(points.map((p) => p.s));
    const top = ranked.filter((f) => inChart.has(f.s)).slice(0, 10).map((f) => f.s);
    if (top.length >= 6) return top;
    const extra = [...points].sort((a, b) => b.g - a.g).map((p) => p.s).filter((s) => !top.includes(s));
    return [...top, ...extra].slice(0, 8);
  }, [ranked, points]);

  const above = money.filter((f) => (f.g as number) >= (f.b as number)).length;
  const five = money.filter((f) => (f.g as number) >= 5 * (f.b as number)).length;
  const scope = `${state.lang === "te" ? "Telugu films" : "films in all languages"}${state.decade === "all" ? " since 2000" : ` of the ${state.decade}`}`;

  return (
    <div>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Segmented
          label="Language"
          value={state.lang}
          onChange={(v) => update({ lang: v })}
          options={[
            { value: "te", label: "Telugu originals" },
            { value: "all", label: "All languages" },
          ]}
        />
        <Segmented label="Decade" value={state.decade} onChange={(v) => update({ decade: v })} options={DECADES.map((d) => ({ value: d, label: d === "all" ? "All years" : d }))} />
        <p className="tabular text-[13px] text-muted">
          {int(pool.length)} films · {int(money.length)} with a reported budget and gross
        </p>
      </div>

      <div className="mt-6">
        <ChartFrame
          id="money"
          title="What they cost, what they made"
          finding={
            money.length
              ? `Of ${int(money.length)} ${scope} with both figures reported, ${int(above)} grossed at least their budget and ${int(five)} made five times it or more.`
              : "No films in this selection have both a reported budget and gross."
          }
          legend={<OutcomeLegend height={false} />}
          source={<Source>Reported worldwide gross and budget, all languages; not audited. Dashed: 2× and 5× budget. Ringed: the leaders of the table below.</Source>}
        >
          {money.length ? (
            <BudgetGross points={points} emphasis={emphasis} hovered={hovered} onHover={setHovered} ariaLabel={`Budget against reported gross for ${money.length} ${scope}. ${above} grossed at least their budget.`} />
          ) : (
            <p className="py-16 text-center text-[14px] text-muted">Try another decade or all languages.</p>
          )}
        </ChartFrame>
      </div>

      <section aria-labelledby="ranked" className="mt-16">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <h2 id="ranked" className="font-serif text-[26px] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[32px]">
            {TABS.find((t) => t.value === state.tab)?.label}
          </h2>
          <div className="scroll-x -mx-4 max-w-[calc(100%+2rem)] px-4 sm:mx-0 sm:max-w-full sm:px-0">
            <Segmented label="Rank films by" value={state.tab} onChange={(v) => update({ tab: v })} options={TABS} />
          </div>
        </div>
        <p className="mb-4 max-w-3xl text-[14px] leading-relaxed text-ink-2">
          {state.tab === "loved" && <>Ranked by film score, our 0–100 score of how much audiences like a film, how many found it and whether they still come back to it.</>}
          {state.tab === "biggest" && <>Ranked by reported worldwide gross, all languages.</>}
          {state.tab === "efficient" && (
            <>
              Reported gross divided by reported budget, for films that cost at least ₹{MIN_BUDGET} crore. Small budgets are often reported loosely and produce extreme multiples
              {skipped[0] && (
                <>
                  {" "}
                  (<FilmToken slug={skipped[0].s} title={skipped[0].t} showYear={false} className="!font-normal" />, on a reported {inr(skipped[0].b)}, would show {multiple((skipped[0].g as number) / (skipped[0].b as number))})
                </>
              )}
              , so {skipped.length} {skipped.length === 1 ? "film is" : "films are"} left out here; {skipped.length === 1 ? "it stays" : "they stay"} on the chart.
            </>
          )}
          {state.tab === "misses" && <>Films whose reported gross fell furthest short of their reported budget, in crore. A gross below budget does not always mean a loss: satellite, digital and dubbing rights are not counted.</>}
        </p>

        <RankedTable rows={ranked.slice(0, shown)} tab={state.tab} hovered={hovered} onHover={setHovered} />
        {ranked.length === 0 && <p className="border-b border-rule py-10 text-center text-[14px] text-muted">No films match this selection.</p>}
        {ranked.length > shown && (
          <div className="mt-3 flex items-center gap-4">
            <button type="button" onClick={() => setShown((n) => n + PAGE * 2)} className="min-h-10 rounded-full border border-rule bg-surface px-4 text-[13.5px] font-medium text-ink hover:border-field-2">
              Show {Math.min(PAGE * 2, ranked.length - shown)} more
            </button>
            <span className="tabular text-[12.5px] text-muted">
              {shown} of {int(ranked.length)}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

const COLS = "lg:grid-cols-[34px_minmax(190px,1.5fr)_48px_minmax(130px,1fr)_minmax(120px,0.9fr)_118px_54px_92px_86px_72px]";

function RankedTable({ rows, tab, hovered, onHover }: { rows: ExplorerFilm[]; tab: Tab; hovered: string | null; onHover: (s: string | null) => void }) {
  return (
    <div role="table" aria-label="Ranked films" className="text-[13.5px]" onMouseLeave={() => onHover(null)}>
      <div role="row" className={`hidden items-end gap-x-3 border-b border-rule px-2 pb-2 lg:grid ${COLS}`}>
        <span role="columnheader" className="label">#</span>
        <span role="columnheader" className="label">Film</span>
        <span role="columnheader" className="label">Year</span>
        <span role="columnheader" className="label">Heroes</span>
        <span role="columnheader" className="label">Director</span>
        <span role="columnheader" className="label">Result</span>
        <span role="columnheader" className={`label text-right ${tab === "loved" ? "!text-ink" : ""}`}>Score</span>
        <span role="columnheader" className={`label text-right ${tab === "biggest" ? "!text-ink" : ""}`}>Gross</span>
        <span role="columnheader" className="label text-right">Budget</span>
        <span role="columnheader" className={`label text-right ${tab === "efficient" || tab === "misses" ? "!text-ink" : ""}`}>{tab === "misses" ? "Short by" : "×"}</span>
      </div>
      {rows.map((f, i) => {
        const m = f.g !== null && f.b !== null ? f.g / f.b : null;
        return (
          <div
            key={f.s}
            role="row"
            onMouseEnter={() => onHover(f.g !== null && f.b !== null ? f.s : null)}
            className={`fade-in grid grid-cols-[28px_1fr_auto] items-center gap-x-3 gap-y-1 border-b border-rule px-2 py-3 transition-colors duration-[var(--dur-1)] lg:min-h-[52px] lg:py-2 ${COLS} ${hovered === f.s ? "bg-surface-2/70" : ""}`}
          >
            <span role="cell" className="tabular self-start pt-0.5 text-[12.5px] text-muted lg:self-center lg:pt-0">{i + 1}</span>
            <span role="cell" className="min-w-0">
              <FilmToken slug={f.s} title={f.t} o={f.o} showYear={false} className="text-[14.5px] leading-snug" />
              <span className="mt-0.5 block truncate text-[12.5px] text-muted lg:hidden">
                <span className="tabular">{f.y}</span>
                {f.h.map((h, j) => (
                  <span key={h[0]}>
                    {j === 0 ? " · " : ", "}
                    <HeroToken slug={h[0]} name={h[1]} face={false} className="!font-normal !text-muted" />
                  </span>
                ))}
                {f.d && (
                  <>
                    {" · "}
                    <DirectorToken slug={f.ds} name={f.d} className="!font-normal !text-muted" />
                  </>
                )}
              </span>
            </span>
            <span role="cell" className="tabular text-right text-[14px] font-semibold text-ink lg:hidden">
              {tab === "loved" ? f.sc?.toFixed(1) : tab === "biggest" ? inr(f.g) : tab === "efficient" ? multiple(m) : f.b !== null && f.g !== null ? `−${inr(f.b - f.g)}` : "—"}
            </span>
            <span role="cell" className="tabular hidden text-ink-2 lg:block">{f.y}</span>
            <span role="cell" className="hidden min-w-0 truncate lg:block">
              {f.h.map((h, j) => (
                <span key={h[0]}>
                  <HeroToken slug={h[0]} name={h[1]} face={false} className="!font-normal" />
                  {j < f.h.length - 1 && <span className="text-faint">, </span>}
                </span>
              ))}
            </span>
            <span role="cell" className="hidden min-w-0 truncate lg:block">{f.d ? <DirectorToken slug={f.ds} name={f.d} className="max-w-full truncate !font-normal" /> : <span className="text-faint">—</span>}</span>
            <span role="cell" className="col-start-2 col-end-4 inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 lg:col-auto lg:text-[13.5px] lg:text-ink">
              <MiniMark o={f.o} />
              {resultText(f)}
              <span className="tabular text-muted lg:hidden">
                {tab !== "loved" && f.sc !== null && `· score ${f.sc.toFixed(1)} `}
                {tab !== "biggest" && f.g !== null && `· ${inr(f.g)} `}
                {tab === "biggest" && m !== null && `· ${multiple(m)} budget`}
              </span>
            </span>
            <span role="cell" className={`tabular hidden text-right lg:block ${tab === "loved" ? "font-semibold text-ink" : "text-ink-2"}`}>{f.sc !== null ? f.sc.toFixed(1) : <span className="text-faint">—</span>}</span>
            <span role="cell" className={`tabular hidden whitespace-nowrap text-right lg:block ${tab === "biggest" ? "font-semibold text-ink" : "text-ink-2"}`}>{f.g !== null ? inr(f.g) : <span className="text-faint">—</span>}</span>
            <span role="cell" className="tabular hidden whitespace-nowrap text-right text-ink-2 lg:block">{f.b !== null ? inr(f.b) : <span className="text-faint">—</span>}</span>
            <span role="cell" className={`tabular hidden whitespace-nowrap text-right lg:block ${tab === "efficient" || tab === "misses" ? "font-semibold text-ink" : "text-ink-2"}`}>
              {tab === "misses" && f.b !== null && f.g !== null ? `−${inr(f.b - f.g)}` : m !== null ? multiple(m) : <span className="text-faint">—</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
