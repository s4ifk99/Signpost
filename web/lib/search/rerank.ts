import type { Listing } from "@/lib/data";

export type SearchFacets = {
  freeOnly?: boolean;
  legalAidOnly?: boolean;
  /** Case-insensitive match on `listing.city` (trimmed). */
  city?: string;
};

export type HybridHitLike = {
  listing: Listing;
  sources: ("lexical" | "semantic")[];
  rrfScoreApprox: number;
};

const DEFAULT_MAX_PER_SUBCATEGORY = 5;

function normalizeWs(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export function matchesFacets(listing: Listing, facets: SearchFacets | undefined): boolean {
  if (!facets) return true;
  if (facets.freeOnly && !listing.isFree) return false;
  if (facets.legalAidOnly && !listing.isLegalAid) return false;
  if (facets.city?.trim()) {
    const want = facets.city.trim().toLowerCase();
    const got = listing.city?.trim().toLowerCase() ?? "";
    if (got !== want) return false;
  }
  return true;
}

/** Extra score from query intent (legal-specific). */
export function intentBoostScore(query: string, listing: Listing): number {
  const q = query.toLowerCase();
  let b = 0;
  if (/\blegal\s*aid\b|legalaid|la\s*scheme/i.test(q) && listing.isLegalAid) b += 0.28;
  if (/\bfree\b|pro\s*bono|no money|cannot pay|can't pay|eligib/i.test(q) && listing.isFree) b += 0.22;
  if (/\bhousing\b|evict|landlord|repairs?\b|disrepair/i.test(q) && /housing|homeless|shelter|evict/i.test(listing.subcategory + listing.description)) b += 0.08;
  if (/\bdebt\b|bailiff|ccj|bankrupt/i.test(q) && /debt|bankrupt|insolv|stepchange|national debtline/i.test(listing.subcategory + listing.description.toLowerCase())) b += 0.08;
  if (/\bcrime\b|police|crown court|charge\b/i.test(q) && /criminal|crime|drink|motoring|fraud/i.test(listing.subcategory)) b += 0.08;
  return b;
}

export function isStrongBusinessNameMatch(query: string, listing: Listing): boolean {
  const nq = normalizeWs(query);
  if (nq.length < 3) return false;
  const nb = normalizeWs(listing.businessName);
  if (!nb) return false;
  if (nb === nq) return true;
  if (nb.startsWith(nq) || nq.startsWith(nb)) return true;
  if (nq.length >= 4 && nb.includes(nq)) return true;
  return false;
}

export function postProcessHybridHits<T extends HybridHitLike>(
  hits: T[],
  query: string,
  options: {
    limit: number;
    facets?: SearchFacets;
    maxPerSubcategory?: number;
  },
): T[] {
  const { limit, facets, maxPerSubcategory = DEFAULT_MAX_PER_SUBCATEGORY } = options;
  if (!hits.length || limit <= 0) return [];

  let working = hits.filter((h) => matchesFacets(h.listing, facets));
  if (!working.length) return [];

  const q = query.trim();
  const scored = working.map((h, i) => {
    const orderSignal = 1 / (i + 1);
    const intent = intentBoostScore(q, h.listing);
    return { h, score: orderSignal + intent };
  });
  scored.sort((a, b) => b.score - a.score);
  working = scored.map((x) => x.h);

  const strong: T[] = [];
  const rest: T[] = [];
  for (const h of working) {
    if (isStrongBusinessNameMatch(q, h.listing)) strong.push(h);
    else rest.push(h);
  }
  const seen = new Set<string>();
  const dedupStrong: T[] = [];
  for (const h of strong) {
    if (seen.has(h.listing.id)) continue;
    seen.add(h.listing.id);
    dedupStrong.push(h);
  }
  const dedupRest: T[] = [];
  for (const h of rest) {
    if (seen.has(h.listing.id)) continue;
    seen.add(h.listing.id);
    dedupRest.push(h);
  }

  const subCount = new Map<string, number>();
  const out: T[] = [];
  for (const h of dedupStrong) {
    if (out.length >= limit) break;
    out.push(h);
    const slug = h.listing.subcategory;
    subCount.set(slug, (subCount.get(slug) ?? 0) + 1);
  }
  for (const h of dedupRest) {
    if (out.length >= limit) break;
    const slug = h.listing.subcategory;
    const n = subCount.get(slug) ?? 0;
    if (n >= maxPerSubcategory) continue;
    subCount.set(slug, n + 1);
    out.push(h);
  }
  return out;
}
