/** Film page skeleton: the same blocks as the page, so nothing jumps when it arrives. */
export default function Loading() {
  const bar = "rounded-md bg-surface-2 animate-pulse motion-reduce:animate-none";
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-8 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading film">
      <div className={`mt-8 h-4 w-28 ${bar}`} />
      <div className={`mt-6 h-12 w-[min(560px,90%)] ${bar}`} />
      <div className="mt-5 flex gap-4">
        <div className={`h-6 w-32 ${bar}`} />
        <div className={`h-6 w-44 ${bar}`} />
      </div>
      <div className={`mt-3 h-4 w-[min(420px,80%)] ${bar}`} />
      <div className="mt-10 grid gap-8 border-y border-rule py-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className={`h-3 w-20 ${bar}`} />
            <div className={`mt-4 h-10 w-40 ${bar}`} />
            <div className={`mt-4 h-3 w-full ${bar}`} />
            <div className={`mt-2 h-3 w-3/4 ${bar}`} />
          </div>
        ))}
      </div>
      <div className="frame mt-16 p-6">
        <div className={`h-6 w-40 ${bar}`} />
        <div className="mt-6 space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-[200px_1fr] gap-6">
              <div className={`h-5 w-32 ${bar}`} />
              <div className={`h-10 ${bar}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
