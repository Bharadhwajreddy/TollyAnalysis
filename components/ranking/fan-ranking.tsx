"use client";

import { useEffect, useMemo, useState } from "react";
import { RankedBars } from "@/components/charts/ranked-bars";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import { ChartCard } from "@/components/ui/chart-card";
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import type { Industry } from "@/lib/domain/types";

interface HeroLite {
  slug: string;
  name: string;
  photo: string | null;
  industry: Industry;
}

interface Results {
  voters: number;
  results: { slug: string; points: number; first: number; second: number; third: number }[];
  mine: [string, string, string] | null;
}

const PLACES = ["1st", "2nd", "3rd"] as const;

/** Visitors rank their top three heroes (one ballot per device); the chart shows everyone's votes. */
export function FanRanking({ heroes }: { heroes: HeroLite[] }) {
  const bySlug = useMemo(() => new Map(heroes.map((h) => [h.slug, h])), [heroes]);
  const sorted = useMemo(() => [...heroes].sort((a, b) => a.name.localeCompare(b.name)), [heroes]);
  const [picks, setPicks] = useState<[string, string, string]>(["", "", ""]);
  const [data, setData] = useState<Results | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/user-ranking")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Results | null) => {
        if (!d) return;
        setData(d);
        if (d.mine) setPicks(d.mine);
      })
      .catch(() => {});
  }, []);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/user-ranking", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ picks }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setData(body);
      setMsg({ ok: true, text: "Thanks! Your top three is saved. You can change it any time from this device." });
    } else setMsg({ ok: false, text: body.error ?? "Could not save your vote." });
  };

  const bars = (data?.results ?? [])
    .filter((r) => bySlug.has(r.slug))
    .slice(0, 15)
    .map((r) => {
      const h = bySlug.get(r.slug)!;
      return {
        id: r.slug,
        label: h.name,
        value: r.points,
        display: `${r.points} pts`,
        color: INDUSTRY_COLOR[h.industry],
        photo: h.photo,
        industry: h.industry,
        tooltip: (
          <div className="space-y-1">
            <p className="font-semibold text-ink">{h.name}</p>
            <p className="tabular text-ink-2">{r.points} points · ranked 1st by {r.first}, 2nd by {r.second}, 3rd by {r.third}</p>
          </div>
        ),
      };
    });

  const ready = picks.every(Boolean) && new Set(picks).size === 3;

  return (
    <ChartCard
      id="fan-ranking"
      title="Fans' ranking"
      subtitle="Pick your top three heroes. 1st place gets 3 points, 2nd gets 2, 3rd gets 1. One vote per device; you can change it later."
      count={data ? `${data.voters} ${data.voters === 1 ? "vote" : "votes"}` : undefined}
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {PLACES.map((place, i) => {
            const chosen = bySlug.get(picks[i]);
            return (
              <label key={place} className="flex items-center gap-3">
                <span className="w-9 shrink-0 text-sm font-bold text-wine">{place}</span>
                {chosen ? (
                  <HeroAvatar name={chosen.name} photo={chosen.photo} industry={chosen.industry} size={34} />
                ) : (
                  <span className="h-[34px] w-[34px] shrink-0 rounded-full border border-dashed border-ink-2" aria-hidden />
                )}
                <select
                  value={picks[i]}
                  onChange={(e) => setPicks((p) => p.map((v, j) => (j === i ? e.target.value : v)) as [string, string, string])}
                  className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-2 text-sm text-ink"
                  aria-label={`${place} choice`}
                >
                  <option value="">Choose a hero…</option>
                  {sorted.map((h) => (
                    <option key={h.slug} value={h.slug} disabled={picks.includes(h.slug) && picks[i] !== h.slug}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
          <button type="button" onClick={submit} disabled={!ready || busy} className="w-full rounded-md bg-wine px-4 py-2 text-sm font-semibold text-white hover:bg-wine-hover disabled:opacity-50">
            {busy ? "Saving…" : data?.mine ? "Update my top three" : "Submit my top three"}
          </button>
          {msg && (
            <p role="status" className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>
              {msg.text}
            </p>
          )}
        </div>
        <div>
          {bars.length ? (
            <RankedBars data={bars} ariaLabel="Fans' ranking by points" orientation="horizontal" />
          ) : (
            <p className="py-10 text-center text-sm text-muted">No votes yet. Be the first!</p>
          )}
          <p className="mt-2 text-xs text-muted">Based only on votes from visitors to this website. This is a popularity poll, not part of the scores above.</p>
        </div>
      </div>
    </ChartCard>
  );
}
