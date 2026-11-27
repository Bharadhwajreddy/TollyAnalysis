"use client";

import { useState } from "react";

/** Copies a link to this chart (current URL + #id) and confirms in place. */
export function CopyLink({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = `${location.origin}${location.pathname}${location.search}#${id}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          history.replaceState(null, "", `#${id}`);
        }
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className="relative grid h-8 w-8 place-items-center rounded-lg border border-rule text-muted transition-colors hover:border-field-2 hover:text-ink"
      aria-label={done ? "Link copied" : "Copy a link to this chart"}
      title={done ? "Link copied" : "Copy link"}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        {done ? <path d="m5 10 3.5 3.5L15 7" /> : <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9" />}
      </svg>
      <span role="status" className="sr-only">{done ? "Link copied" : ""}</span>
    </button>
  );
}
