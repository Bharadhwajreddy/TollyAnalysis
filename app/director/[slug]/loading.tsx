/** Skeleton for a director page: header, the reel and the hero rows, in the page's own proportions. */
export default function Loading() {
  const bar = "rounded-md bg-surface-2";
  return (
    <div className="mx-auto max-w-[1280px] animate-pulse px-4 pb-24 motion-reduce:animate-none sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading director">
      <div className={`mt-7 h-3.5 w-20 ${bar}`} />
      <div className="grid gap-8 pb-10 pt-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex items-start gap-5">
          <div className="h-12 w-12 shrink-0 rounded-[4px] bg-surface-2 sm:h-[72px] sm:w-[72px]" />
          <div className="flex-1">
            <div className={`h-11 w-[min(420px,80%)] sm:h-14 ${bar}`} />
            <div className={`mt-4 h-4 w-[min(360px,70%)] ${bar}`} />
          </div>
        </div>
        <div className="flex gap-10 border-t border-rule pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <div className={`h-16 w-44 ${bar}`} />
          <div className={`hidden h-16 w-72 sm:block ${bar}`} />
        </div>
      </div>
      <div className="frame p-6">
        <div className={`h-6 w-64 ${bar}`} />
        <div className={`mt-3 h-4 w-[min(560px,90%)] ${bar}`} />
        <div className="mt-8 flex h-[150px] items-end justify-around border-b border-rule px-2">
          {[38, 52, 30, 70, 45, 88, 40, 62, 100, 55, 76, 48].map((h, i) => (
            <div key={i} className="w-[7px] rounded-[1.5px] bg-surface-2" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className={`mt-24 h-8 w-56 ${bar}`} />
      <div className="mt-6 border-t border-rule">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-rule py-3">
            <div className="h-7 w-7 rounded-full bg-surface-2" />
            <div className={`h-4 w-32 ${bar}`} />
            <div className={`ml-auto h-5 w-1/2 ${bar}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
