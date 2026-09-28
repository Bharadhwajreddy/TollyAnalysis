import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-serif text-base font-semibold text-ink">Tollywood Analysis</p>
          <p className="mt-2 max-w-md text-ink-2">
            Private beta. Transparent, configurable benchmarks of Telugu-release lead actors. Scores are editorial
            benchmarks, not objective fact. Critic reviews are not used in v1. Hero photos: Wikimedia Commons, free licences.
          </p>
          <p className="mt-3 max-w-md text-xs text-muted">
            When TMDb data is enabled: this product uses the TMDb API but is not endorsed or certified by TMDb. IMDb data
            is used only through a licensed or permitted source; nothing is scraped.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-3">Explore</p>
          <ul className="space-y-2 text-ink-2">
            <li><Link className="hover:text-wine" href="/">All heroes</Link></li>
            <li><Link className="hover:text-wine" href="/compare">Compare heroes side by side</Link></li>
            <li><Link className="hover:text-wine" href="/trends">Year-by-year trends</Link></li>
            <li><Link className="hover:text-wine" href="/annexure">Film-level evidence (Annexure)</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Transparency</p>
          <ul className="space-y-2 text-ink-2">
            <li><Link className="hover:text-wine" href="/methodology">Methodology</Link></li>
            <li><Link className="hover:text-wine" href="/annexure/sources">Source ledger</Link></li>
            <li><Link className="hover:text-wine" href="/annexure/coverage">Data coverage</Link></li>
            <li><Link className="hover:text-wine" href="/annexure/corrections">Suggest a correction</Link></li>
            <li><Link className="hover:text-wine" href="/annexure/photo-credits">Photo credits</Link></li>
            <li><Link className="hover:text-wine" href="/terms">Terms (beta)</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
