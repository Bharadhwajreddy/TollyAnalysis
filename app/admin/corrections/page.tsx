import type { Metadata } from "next";
import Link from "next/link";
import { ReviewForm } from "@/components/admin/review-form";
import { requireAdminPage } from "@/lib/auth/admin";
import { getCorrectionStore, type CorrectionStatus } from "@/lib/repositories/corrections";
import { CORRECTION_TYPE_LABEL } from "@/lib/validation/corrections";

export const metadata: Metadata = { title: "Admin · Corrections" };
export const dynamic = "force-dynamic";

const STATUSES: (CorrectionStatus | "all")[] = ["pending", "under_review", "needs_more_evidence", "approved", "rejected", "all"];

export default async function CorrectionsQueue(props: PageProps<"/admin/corrections">) {
  await requireAdminPage();
  const sp = await props.searchParams;
  const status = (typeof sp.status === "string" ? sp.status : "pending") as CorrectionStatus | "all";
  const type = typeof sp.type === "string" ? sp.type : undefined;
  const items = await (await getCorrectionStore()).list({ status: status === "all" ? undefined : status, type });
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <p className="pt-8 text-xs text-muted"><Link href="/admin" className="hover:text-wine">Admin</Link> / Corrections</p>
      <h1 className="font-serif text-3xl font-bold text-ink">Corrections queue</h1>
      <nav aria-label="Filter by status" className="scroll-x mt-4 flex gap-1.5">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/corrections?status=${s}${type ? `&type=${type}` : ""}`}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-[13px] ${s === status ? "border-wine bg-wine text-white" : "border-line text-ink-2"}`}
          >
            {s.replaceAll("_", " ")}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <p className="card mt-5 p-6 text-sm text-muted">No submissions with this status.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded bg-wine-soft px-1.5 py-0.5 font-medium text-wine">{CORRECTION_TYPE_LABEL[c.correctionType] ?? c.correctionType}</span>
                <span>{c.submittedAt.slice(0, 16).replace("T", " ")} UTC</span>
                <span>· status {c.status.replaceAll("_", " ")}</span>
                <code className="ml-auto font-mono">{c.id.slice(0, 8)}</code>
              </div>
              <dl className="mt-2 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[140px_1fr]">
                {c.heroName && (<><dt className="text-muted">Hero</dt><dd>{c.heroName}</dd></>)}
                {c.filmName && (<><dt className="text-muted">Film</dt><dd>{c.filmName}</dd></>)}
                {c.currentValue && (<><dt className="text-muted">Current</dt><dd>{c.currentValue}</dd></>)}
                <dt className="text-muted">Proposed</dt>
                <dd className="whitespace-pre-wrap">{c.proposedCorrection}</dd>
                <dt className="text-muted">Evidence</dt>
                <dd className="break-all">
                  {/* Rendered as text + safe link: noopener, noreferrer, nofollow; only http(s) accepted at submission. */}
                  <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-wine underline">{c.sourceUrl}</a>
                </dd>
                {c.explanation && (<><dt className="text-muted">Explanation</dt><dd className="whitespace-pre-wrap">{c.explanation}</dd></>)}
                {c.email && (<><dt className="text-muted">Contact (private)</dt><dd>{c.email}</dd></>)}
                {c.reviewNote && (<><dt className="text-muted">Review note</dt><dd>{c.reviewNote} {c.dataAction && `(${c.dataAction.replaceAll("_", " ")})`}</dd></>)}
              </dl>
              <ReviewForm id={c.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
