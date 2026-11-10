import Link from "next/link";
import { IMDB_ATTRIBUTION, TMDB_NOTICE } from "@/lib/legal/data-licences";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-night text-[#e9dfd6]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 text-sm sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d8a86b]">The careers. The context. The evidence.</p>
          <p className="mt-3 font-serif text-[26px] font-semibold leading-tight text-white sm:text-[30px]">
            A better conversation
            <br />
            starts with the numbers.
          </p>
          <p className="mt-3 max-w-md leading-relaxed text-[#cbbdb2]">The careers of Telugu film heroes since 2000, in numbers.</p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d8a86b]">Explore</p>
          <ul className="mt-3 space-y-2.5">
            <li><Link className="hover:text-white" href="/heroes">All heroes</Link></li>
            <li><Link className="hover:text-white" href="/compare">Compare heroes side by side</Link></li>
            <li><Link className="hover:text-white" href="/trends">Year-by-year trends</Link></li>
            <li><Link className="hover:text-white" href="/rankings">Rankings</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d8a86b]">About the data</p>
          <ul className="mt-3 space-y-2.5">
            <li><Link className="hover:text-white" href="/methodology">How it works</Link></li>
            <li><Link className="hover:text-white" href="/annexure">Film-by-film evidence</Link></li>
            <li><Link className="hover:text-white" href="/annexure/sources">Sources and data licences</Link></li>
            <li><Link className="hover:text-white" href="/annexure/corrections">Suggest a correction</Link></li>
            <li><Link className="hover:text-white" href="/annexure/photo-credits">Photo credits</Link></li>
            <li><Link className="hover:text-white" href="/terms">Terms of use</Link></li>
            <li><Link className="hover:text-white" href="/privacy">Privacy policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-1 border-t border-white/10 px-4 py-4 text-[11.5px] leading-relaxed text-[#a8988c] sm:px-6">
        <p>{IMDB_ATTRIBUTION} {TMDB_NOTICE}</p>
        <p>
          Film and hero facts: Wikipedia (CC BY-SA 4.0) and Wikidata (CC0). Scores are opinions from a published method. Independent and non-commercial; not
          affiliated with any studio, actor or data provider.
        </p>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 border-t border-white/10 px-4 py-5 text-xs text-[#a8988c] sm:px-6">
        <span>Tollywood Analysis</span>
        <span>Telugu cinema · Lead careers since 2000</span>
        <Link href="/annexure/photo-credits" className="hover:text-white">Photo credits ↗</Link>
      </div>
    </footer>
  );
}
