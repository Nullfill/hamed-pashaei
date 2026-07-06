import { Suspense } from "react";
import { SearchBox } from "@/components/search/SearchBox";
import { SearchResults } from "@/components/search/SearchResults";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-3">
        <h1 className="text-3xl font-black">جستجوی فیلم و سریال</h1>
        <p className="text-slate-400">{"نتایج از آرشیو ترکیبی فیلم و سریال نمایش داده می‌شوند."}</p>
      </div>

      <div className="mb-8">
        <Suspense fallback={<div className="h-14 rounded-md bg-white/8" />}>
          <SearchBox />
        </Suspense>
      </div>

      <Suspense fallback={<div className="rounded-md bg-white/8 p-8 text-center text-slate-400">در حال بارگذاری...</div>}>
        <SearchResults />
      </Suspense>
    </section>
  );
}
