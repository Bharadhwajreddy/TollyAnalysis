"use client";

import { useMemo, useState } from "react";
import type { FilmEvidenceRow } from "@/lib/repositories";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  scored: { label: "Scored", cls: "bg-[#eef7f1] text-good" },
  provisional: { label: "Provisional", cls: "bg-[#fbf3e4] text-warn" },
  insufficient_evidence: { label: "Insufficient", cls: "bg-surface-2 text-muted" },
  not_yet_final: { label: "Not yet final", cls: "bg-teal-soft text-[#00596a]" },
};

const PAGE = 12;

export function FilmographyTable({ rows }: { rows: FilmEvidenceRow[] }) {
  const [type, setType] = useState("all");
  const [route, setRoute] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (type === "all" || r.teluguReleaseType === type) &&
          (route === "all" || r.route === route) &&
          (status === "all" || r.scoringStatus === status) &&
          (!q || r.title.toLowerCase().includes(q.toLowerCase()) || String(r.year).includes(q)),
      ),
    [rows, type, route, status, q],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = filtered.slice(current * PAGE, current * PAGE + PAGE);

  const sel = (label: string, value: string, set: (v: string) => void, opts: [string, string][]) => (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setPage(0);
        }}
        className="rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
      >
        {opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Search title / year
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            className="w-44 rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
          />
        </label>
        {sel("Telugu release", type, setType, [["all", "All"], ["original", "Original Telugu"], ["dubbed", "Telugu dub"]])}
        {sel("Route", route, setRoute, [["all", "All"], ["theatrical", "Theatrical"], ["ott", "OTT"]])}
        {sel("Scoring status", status, setStatus, [
          ["all", "All"],
          ["scored", "Scored"],
          ["provisional", "Provisional"],
          ["insufficient_evidence", "Insufficient"],
          ["not_yet_final", "Not yet final"],
        ])}
        <span className="tabular ml-auto text-xs text-muted">{filtered.length} titles</span>
      </div>

      <div className="scroll-x mt-3 rounded-lg border border-line">
        <table className="w-full min-w-[1100px] text-[12.5px]">
          <thead className="bg-surface-2 text-left text-[10.5px] uppercase tracking-wide text-ink-2">
            <tr>
              {["Film title", "Release", "Orig. lang", "Telugu release", "Route", "Lead credit", "Audience evidence", "Telugu commercial / platform evidence", "Film Success", "Status / confidence", "Legacy", "Sources"].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap px-2.5 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.filmId} className="border-t border-line align-top">
                <td className="min-w-[180px] px-2.5 py-2 font-medium text-ink">
                  {r.title}
                  {r.isDemo && <span className="ml-1 rounded bg-gold-soft px-1 text-[9.5px] font-semibold text-[#7a5200]">FICTIONAL</span>}
                </td>
                <td className="tabular whitespace-nowrap px-2.5 py-2">{r.releaseDate}</td>
                <td className="px-2.5 py-2 uppercase">{r.originalLanguage}</td>
                <td className="px-2.5 py-2">{r.teluguReleaseType === "dubbed" ? "Telugu dub" : "Original Telugu"}</td>
                <td className="px-2.5 py-2">{r.route === "ott" ? "OTT" : "Theatrical"}</td>
                <td className="px-2.5 py-2">
                  {r.roleScope === "co_principal_male_lead" || r.coLeads.length ? "Co-principal lead" : "Principal lead"}
                  {r.coLeads.length > 0 && <div className="text-[11px] text-muted">with {r.coLeads.join(", ")}</div>}
                </td>
                <td className="tabular px-2.5 py-2">
                  {r.audience ? (
                    <>
                      {r.audience.rating.toFixed(1)}/10 · {r.audience.votes.toLocaleString("en-IN")} votes
                      <div className="text-[11px] text-muted">
                        adj. {r.audience.adjusted} → {r.audience.score} · {r.audience.provider === "synthetic_demo" ? "synthetic demo" : r.audience.provider} · film-wide
                      </div>
                    </>
                  ) : (
                    <span className="text-muted">Unknown</span>
                  )}
                </td>
                <td className="px-2.5 py-2">
                  {r.commercial.score !== null ? (
                    <>
                      <span className="tabular font-medium">{r.commercial.score}</span>{" "}
                      <span className="text-[11px] text-muted">({r.commercial.basis?.replaceAll("_", " ")}, {r.commercial.confidence})</span>
                      {r.commercial.disputed && <span className="ml-1 rounded bg-[#fcefee] px-1 text-[10px] font-semibold text-bad">DISPUTED</span>}
                    </>
                  ) : (
                    <span className="text-muted">Unknown</span>
                  )}
                  <div className="text-[11px] text-muted">{r.commercial.reason}</div>
                </td>
                <td className="tabular px-2.5 py-2 font-semibold">
                  {r.filmSuccessScore ?? (r.indicativeScore !== null ? <span className="font-normal text-muted">({r.indicativeScore} indicative)</span> : "—")}
                </td>
                <td className="px-2.5 py-2">
                  <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_LABEL[r.scoringStatus]?.cls}`}>
                    {STATUS_LABEL[r.scoringStatus]?.label}
                  </span>
                  <div className="tabular mt-0.5 text-[11px] text-muted">{r.coveragePercent}% coverage</div>
                </td>
                <td className="px-2.5 py-2 text-[11px]">{r.legacyStatus ? r.legacyStatus.replaceAll("_", " ") : <span className="text-muted">not reviewed</span>}</td>
                <td className="px-2.5 py-2 text-[11px]">
                  {r.sources.length === 0
                    ? "—"
                    : r.sources.map((s) =>
                        s.url ? (
                          <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="block text-wine underline">
                            {s.name}
                          </a>
                        ) : (
                          <span key={s.id} className="block">{s.name}</span>
                        ),
                      )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Filmography pages" className="mt-3 flex items-center justify-end gap-2 text-[13px]">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded-md border border-line px-3 py-1 disabled:opacity-40">
            ← Prev
          </button>
          <span className="tabular text-muted">
            Page {current + 1} of {pages}
          </span>
          <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="rounded-md border border-line px-3 py-1 disabled:opacity-40">
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}
