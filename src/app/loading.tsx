export default function Loading() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-label="در حال بارگذاری">
      <div className="loading-skeleton-hero skeleton" />
      <div className="mt-8 flex items-center justify-between">
        <div className="h-7 w-36 rounded-lg skeleton" />
        <div className="h-8 w-20 rounded-lg skeleton" />
      </div>
      <div className="mt-5 flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-72 w-40 shrink-0 rounded-2xl skeleton sm:w-48" />
        ))}
      </div>
    </section>
  );
}
