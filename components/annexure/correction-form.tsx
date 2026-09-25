"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  CORRECTION_TYPE_LABEL,
  CORRECTION_TYPES,
  correctionInputSchema,
  type CorrectionInput,
  type CorrectionParsed,
} from "@/lib/validation/corrections";

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-muted";

export function CorrectionForm({ defaultHero = "" }: { defaultHero?: string }) {
  const [state, setState] = useState<{ kind: "idle" | "ok" | "error"; message?: string }>({ kind: "idle" });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CorrectionInput, unknown, CorrectionParsed>({
    resolver: zodResolver(correctionInputSchema),
    defaultValues: { correctionType: "film_credit_role", heroName: defaultHero, website: "" },
  });

  const onSubmit = async (values: CorrectionParsed) => {
    setState({ kind: "idle" });
    const res = await fetch("/api/corrections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setState({ kind: "ok", message: `Thank you. Reference ${String(body.id).slice(0, 8)}. Your submission is private until an editor reviews it.` });
      reset({ correctionType: "film_credit_role", heroName: "", website: "" });
    } else {
      setState({ kind: "error", message: body.error ?? "Something went wrong. Please try again." });
    }
  };

  const err = (name: keyof CorrectionInput) =>
    errors[name]?.message ? (
      <p id={`${name}-err`} className="mt-1 text-xs text-bad">
        {String(errors[name]?.message)}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-4 p-5">
      <div>
        <label htmlFor="correctionType" className="mb-1 block text-sm font-medium text-ink">Correction type</label>
        <select id="correctionType" {...register("correctionType")} className={field}>
          {CORRECTION_TYPES.map((t) => (
            <option key={t} value={t}>{CORRECTION_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="heroName" className="mb-1 block text-sm font-medium text-ink">Hero name <span className="font-normal text-muted">(if relevant)</span></label>
          <input id="heroName" {...register("heroName")} className={field} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="filmName" className="mb-1 block text-sm font-medium text-ink">Film name <span className="font-normal text-muted">(if relevant)</span></label>
          <input id="filmName" {...register("filmName")} className={field} autoComplete="off" />
        </div>
      </div>
      <div>
        <label htmlFor="currentValue" className="mb-1 block text-sm font-medium text-ink">Current record or value</label>
        <input id="currentValue" {...register("currentValue")} className={field} placeholder="What the site shows now" />
      </div>
      <div>
        <label htmlFor="proposedCorrection" className="mb-1 block text-sm font-medium text-ink">Proposed correction <span className="text-bad">*</span></label>
        <textarea id="proposedCorrection" rows={3} {...register("proposedCorrection")} aria-invalid={!!errors.proposedCorrection} aria-describedby="proposedCorrection-err" className={field} />
        {err("proposedCorrection")}
      </div>
      <div>
        <label htmlFor="sourceUrl" className="mb-1 block text-sm font-medium text-ink">Source URL <span className="text-bad">*</span></label>
        <input id="sourceUrl" type="url" inputMode="url" {...register("sourceUrl")} aria-invalid={!!errors.sourceUrl} aria-describedby="sourceUrl-err" className={field} placeholder="https://" />
        {err("sourceUrl")}
      </div>
      <div>
        <label htmlFor="explanation" className="mb-1 block text-sm font-medium text-ink">Explanation</label>
        <textarea id="explanation" rows={3} {...register("explanation")} className={field} />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">Email <span className="font-normal text-muted">(optional, never shown publicly)</span></label>
        <input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} aria-describedby="email-err" className={field} autoComplete="email" />
        {err("email")}
      </div>
      {/* Honeypot for bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-wine px-4 py-2 text-sm font-semibold text-white hover:bg-wine-hover disabled:opacity-60">
          {isSubmitting ? "Sending…" : "Submit correction"}
        </button>
        <p role="status" aria-live="polite" className={`text-sm ${state.kind === "ok" ? "text-good" : state.kind === "error" ? "text-bad" : ""}`}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
