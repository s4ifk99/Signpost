import Link from "next/link";
import { categories, fetchAllListings } from "@/lib/data";

export function LawCategories() {
  const allListings = fetchAllListings();
  
  // Count listings per subcategory
  const listingCounts: Record<string, number> = {};
  for (const listing of allListings) {
    const slug = listing.subcategory;
    listingCounts[slug] = (listingCounts[slug] || 0) + 1;
  }

  return (
    <section id="categories" className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-primary">
            Areas of Practice
          </h2>
          <div className="mx-auto mt-2 h-0.5 w-16 bg-accent" />
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category} className="rounded border border-primary/10 bg-card p-5 shadow-sm">
              <h3 className="mb-4 border-b-2 border-accent/30 pb-2 font-serif text-lg font-semibold text-primary">
                {category}
              </h3>
              <ul className="space-y-2">
                {items.map((item) => {
                  const listingsCount = listingCounts[item.slug] || 0;
                  return (
                    <li key={item.name}>
                      <Link
                        href={`/category/${item.slug}`}
                        className="group flex items-baseline justify-between gap-2 text-sm"
                      >
                        <span className="flex items-center gap-1.5 text-foreground/80 underline-offset-2 transition-colors group-hover:text-primary group-hover:underline">
                          {item.name}
                          {"free" in item && item.free && (
                            <span className="rounded-sm border border-green-600/30 bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-700">
                              Free
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({listingsCount})
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
