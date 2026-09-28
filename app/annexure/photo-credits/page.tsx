import type { Metadata } from "next";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import { INITIAL_ROSTER } from "@/lib/constants/roster";
import { HERO_PHOTOS } from "@/lib/constants/photos";

export const metadata: Metadata = { title: "Photo credits" };

export default function PhotoCreditsPage() {
  const withPhoto = INITIAL_ROSTER.filter((h) => HERO_PHOTOS[h.slug]);
  const without = INITIAL_ROSTER.filter((h) => !HERO_PHOTOS[h.slug]);
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink">Photo credits</h1>
      <p className="mt-1.5 max-w-3xl text-[15px] text-ink-2">
        Hero portraits come from Wikimedia Commons under free licences (Creative Commons, public domain or government open licences).
        Each photo is credited below with a link to its original file page, where the full licence is shown.
      </p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {withPhoto.map((h) => {
          const c = HERO_PHOTOS[h.slug];
          return (
            <li key={h.slug} className="card flex items-center gap-3 p-3 text-[13px]">
              <HeroAvatar name={h.name} photo={c.file} industry={h.industry} size={44} />
              <div className="min-w-0">
                <p className="font-semibold text-ink">{h.name}</p>
                <p className="truncate text-ink-2">
                  {c.author} · {c.license === "See file page" ? "licence on file page" : c.license}
                </p>
                <a href={c.page} target="_blank" rel="noopener noreferrer nofollow" className="text-wine underline">
                  Wikimedia Commons file
                </a>
              </div>
            </li>
          );
        })}
      </ul>
      {without.length > 0 && (
        <p className="mt-5 text-sm text-ink-2">
          No freely licensed portrait found yet (initials shown instead): {without.map((h) => h.name).join(", ")}.
        </p>
      )}
    </div>
  );
}
