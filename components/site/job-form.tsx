"use client";

import { useState } from "react";
import { CONTACT_EMAIL } from "@/lib/constants/site";

const FIELDS = [
  { key: "role", label: "Role or job title", placeholder: "Assistant director, editor, VFX artist…", required: true },
  { key: "project", label: "Film, studio or company", placeholder: "Production house or project name", required: true },
  { key: "place", label: "Location", placeholder: "Hyderabad, remote…", required: false },
  { key: "apply", label: "How to apply", placeholder: "Email, phone or link for applicants", required: true },
  { key: "name", label: "Your name and contact", placeholder: "So we can check the post with you", required: true },
] as const;

/**
 * A job post for the Careers page. There is no server: submitting opens the visitor's mail app with
 * the details filled in, addressed to the site's contact address.
 */
export function JobForm() {
  const [v, setV] = useState<Record<string, string>>({});
  const [details, setDetails] = useState("");
  const body = [...FIELDS.map((f) => `${f.label}: ${v[f.key] ?? ""}`), "", "Details:", details].join("\n");
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Job post: ${v.role ?? ""}`)}&body=${encodeURIComponent(body)}`;
  return (
    <form
      className="space-y-3"
      aria-label="Post a job"
      onSubmit={(e) => {
        e.preventDefault();
        window.location.href = href;
      }}
    >
      {FIELDS.map((f) => (
        <label key={f.key} className="block">
          <span className="text-[13.5px] font-semibold text-ink">
            {f.label}
            {f.required && <span className="text-wine"> *</span>}
          </span>
          <input
            required={f.required}
            maxLength={200}
            placeholder={f.placeholder}
            value={v[f.key] ?? ""}
            onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14.5px] text-ink outline-none focus:border-wine"
          />
        </label>
      ))}
      <label className="block">
        <span className="text-[13.5px] font-semibold text-ink">Details</span>
        <textarea
          rows={4}
          maxLength={2000}
          placeholder="What the work is, dates, pay if you want to share it"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14.5px] text-ink outline-none focus:border-wine"
        />
      </label>
      <button type="submit" className="rounded-full bg-wine px-5 py-2 text-[14px] font-semibold text-white hover:opacity-90">
        Send job post
      </button>
      <p className="text-[12.5px] text-muted">This opens your mail app with the details filled in, addressed to {CONTACT_EMAIL}. We check every post before it goes up.</p>
    </form>
  );
}
