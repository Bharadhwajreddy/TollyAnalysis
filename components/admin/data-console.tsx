"use client";

import { useState } from "react";

const TEMPLATES: Record<string, { path: string; label: string; body: unknown }> = {
  person: {
    path: "/api/admin/people",
    label: "Create / update person",
    body: { slug: "new-hero", displayName: "New Hero", industry: "telugu", personStatus: "review", defaultVisibility: "review", reason: "Added to registry pending credit verification" },
  },
  film: {
    path: "/api/admin/films",
    label: "Create / update film",
    body: {
      slug: "example-film-2024",
      title: "Example Film",
      originalLanguage: "te",
      releaseRoute: "theatrical",
      featureType: "feature",
      status: "released",
      teluguRelease: { releaseType: "original", releaseDate: "2024-01-12", route: "theatrical", isReRelease: false },
      reason: "Verified release date from distributor announcement",
    },
  },
  credit: {
    path: "/api/admin/credits",
    label: "Approve a lead credit",
    body: { filmSlug: "example-film-2024", personSlug: "new-hero", roleScope: "principal_male_lead", eligibilityStatus: "approved", evidenceNote: "Title card and promotional material credit him as the lead", sourceKey: "editorial", reason: "Lead verified" },
  },
  commercial: {
    path: "/api/admin/source-claims",
    label: "Add commercial / platform claim",
    body: {
      kind: "commercial",
      filmSlug: "example-film-2024",
      sourceKey: "editorial",
      metricType: "telugu_distributor_share",
      versionScope: "telugu_original",
      territory: "AP/TS",
      currency: "INR",
      amountLow: "250000000",
      confidence: "medium",
      approvalStatus: "approved",
      sourceUrl: "https://example.org/trade-report",
      observedAt: "2024-02-20",
    },
  },
  reception: {
    path: "/api/admin/source-claims",
    label: "Add manual rating (IMDb/TMDb)",
    body: { kind: "reception", filmSlug: "example-film-2024", sourceKey: "imdb", provider: "imdb", rating: 7.4, voteCount: 12500, sourceUrl: "https://www.imdb.com/title/tt0000000/", observedAt: "2026-09-01" },
  },
  social: {
    path: "/api/admin/social-snapshots",
    label: "Social snapshot (manual or fetch)",
    body: { personSlug: "new-hero", platform: "instagram", handle: "officialhandle", profileUrl: "https://www.instagram.com/officialhandle/", isOfficial: true, followersCount: 1200000 },
  },
  tmdb: { path: "/api/admin/import/tmdb", label: "Import TMDb credits (pending review)", body: { personSlug: "new-hero", tmdbPersonId: 12345 } },
};

const CSV_EXAMPLE = `kind,filmSlug,sourceKey,metricType,versionScope,territory,currency,amountLow,amountHigh,valueText,confidence,approvalStatus,sourceUrl,observedAt
commercial,example-film-2024,editorial,trade_verdict,telugu_original,AP/TS,,,,hit,medium,approved,https://example.org/verdict,2024-02-01`;

export function DataConsole() {
  const [key, setKey] = useState("person");
  const [body, setBody] = useState(JSON.stringify(TEMPLATES.person.body, null, 2));
  const [csv, setCsv] = useState(CSV_EXAMPLE);
  const [out, setOut] = useState("");

  const send = async (path: string, payload: string, contentType: string) => {
    setOut("Sending…");
    const res = await fetch(path, { method: "POST", headers: { "content-type": contentType }, body: payload });
    setOut(`${res.status} ${res.statusText}\n${JSON.stringify(await res.json().catch(() => ({})), null, 2)}`);
  };

  return (
    <div className="space-y-5">
      <section className="card space-y-3 p-5">
        <label className="block text-sm font-medium text-ink">
          Action
          <select
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setBody(JSON.stringify(TEMPLATES[e.target.value].body, null, 2));
            }}
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          >
            {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
        </label>
        <p className="font-mono text-xs text-muted">POST {TEMPLATES[key].path}</p>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} spellCheck={false} className="w-full rounded-md border border-line bg-surface-2 p-3 font-mono text-[12px]" aria-label="JSON body" />
        <button type="button" onClick={() => send(TEMPLATES[key].path, body, "application/json")} className="rounded-md bg-wine px-4 py-2 text-sm font-semibold text-white">
          Submit
        </button>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-ink">Bulk CSV import — source claims</h2>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} spellCheck={false} className="w-full rounded-md border border-line bg-surface-2 p-3 font-mono text-[12px]" aria-label="CSV" />
        <button type="button" onClick={() => send("/api/admin/source-claims", csv, "text/csv")} className="rounded-md border border-wine px-4 py-2 text-sm font-semibold text-wine">
          Import CSV
        </button>
      </section>
      {out && <pre role="status" className="scroll-x rounded-lg border border-line bg-surface p-3 font-mono text-[12px] text-ink">{out}</pre>}
      <p className="text-xs text-muted">All writes are validated, audited in the change log and followed by a cache refresh. Run “Recalculate” on the admin home to refresh rankings.</p>
    </div>
  );
}
