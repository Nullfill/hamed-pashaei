import Link from "next/link";
import { getAllCategories } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";

export default async function GenresPage() {
  const categories = await getAllCategories();

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-3 text-3xl font-black">ژانرها و دسته‌بندی‌ها</h1>
      <p className="mb-8 text-slate-400">همه دسته‌بندی‌های موجود در آرشیو ترکیبی اینجا نمایش داده می‌شوند.</p>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <Link key={category.key} href={`/genres/${category.key}`} className="rounded-md border border-white/10 bg-[#15151f] p-5 transition hover:border-[#e50914]">
            <span className="text-lg font-bold">{category.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
