import Link from "next/link";
import { SearchField } from "@/components/search/search-field";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-16 sm:px-6 sm:pt-24 lg:px-8">
      <p className="tabular text-[13px] text-muted">404</p>
      <h1 className="mt-3 max-w-2xl font-serif text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[56px]">No film by that name. No hero either.</h1>
      <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-2">The page you followed doesn&rsquo;t exist, or it moved. Search for what you were after:</p>
      <div className="mt-6">
        <SearchField />
      </div>
      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium">
        <Link href="/" className="link">Home</Link>
        <Link href="/tolly-index" className="link">The Tolly Index</Link>
        <Link href="/heroes" className="link">All heroes</Link>
        <Link href="/releases" className="link">Releases by year</Link>
      </div>
    </div>
  );
}
