import { getAllSubcategories } from "@/lib/data";

export type CategorySuggestion = {
  name: string;
  slug: string;
  parentCategory: string;
  free?: boolean;
};

export function searchSubcategories(query: string, limit: number): CategorySuggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2 || limit <= 0) return [];

  const subs = getAllSubcategories();
  const scored = subs
    .map((s) => {
      const name = s.name.toLowerCase();
      const slug = s.slug.toLowerCase();
      const parent = s.parentCategory.toLowerCase();
      let score = 0;
      if (slug === q) score = 3;
      else if (name === q) score = 2.8;
      else if (slug.startsWith(q)) score = 2.2;
      else if (name.startsWith(q)) score = 2;
      else if (slug.includes(q)) score = 1.5;
      else if (name.includes(q)) score = 1.3;
      else if (parent.includes(q)) score = 0.8;
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => ({
      name: x.s.name,
      slug: x.s.slug,
      parentCategory: x.s.parentCategory,
      free: x.s.free,
    }));

  return scored;
}
