import Fuse from "fuse.js";
import { fetchAllListings, type Listing } from "@/lib/data";
import { getListingSearchDocument } from "@/lib/search/listing-document";

let fuseCache: Fuse<Listing> | null = null;

function buildFuseIndex(listings: Listing[]): Fuse<Listing> {
  return new Fuse(listings, {
    keys: [
      { name: "businessName", weight: 0.4 },
      { name: "description", weight: 0.28 },
      { name: "city", weight: 0.1 },
      { name: "postcode", weight: 0.06 },
      { name: "subcategory", weight: 0.1 },
      { name: "category", weight: 0.08 },
    ],
    threshold: 0.48,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

/** Full-document fuzzy field for long queries (Fuse tokenizes whole record poorly for some cases). */
function buildFuseFullText(listings: Listing[]): Fuse<{ id: string; listing: Listing; text: string }> {
  const docs = listings.map((listing) => ({
    id: listing.id,
    listing,
    text: getListingSearchDocument(listing),
  }));
  return new Fuse(docs, {
    keys: [{ name: "text", weight: 1 }],
    threshold: 0.42,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

let fuseKeysCache: Fuse<Listing> | null = null;
let fuseFullCache: Fuse<{ id: string; listing: Listing; text: string }> | null = null;

export function resetSearchIndexCache(): void {
  fuseKeysCache = null;
  fuseFullCache = null;
}

function getFuseKeyIndex(): Fuse<Listing> {
  if (!fuseKeysCache) fuseKeysCache = buildFuseIndex(fetchAllListings());
  return fuseKeysCache;
}

function getFuseFullIndex(): Fuse<{ id: string; listing: Listing; text: string }> {
  if (!fuseFullCache) fuseFullCache = buildFuseFullText(fetchAllListings());
  return fuseFullCache;
}

export function listingBoostScore(listing: Listing): number {
  let b = 0;
  if (listing.isFree) b += 0.09;
  if (listing.isLegalAid) b += 0.07;
  if (listing.isSponsored) b += 0.04;
  return b;
}

function fuseScoreToRelevance(score: number | undefined): number {
  const s = score ?? 1;
  return Math.max(0, Math.min(1, 1 - s));
}

export type LexicalHit = { listing: Listing; lexicalScore: number };

export function lexicalSearchListings(query: string, limit: number): LexicalHit[] {
  const q = query.trim();
  if (!q || limit <= 0) return [];

  const keyFuse = getFuseKeyIndex();
  const fullFuse = getFuseFullIndex();
  const keyRaw = keyFuse.search(q, { limit: Math.max(limit * 3, 24) });
  const fullRaw = fullFuse.search(q, { limit: Math.max(limit * 2, 16) });

  const byId = new Map<string, number>();
  for (const r of keyRaw) {
    const rel = fuseScoreToRelevance(r.score) + listingBoostScore(r.item);
    const id = r.item.id;
    byId.set(id, Math.max(byId.get(id) ?? 0, Math.min(1, rel)));
  }
  for (const r of fullRaw) {
    const rel = fuseScoreToRelevance(r.score) + listingBoostScore(r.item.listing);
    const id = r.item.id;
    byId.set(id, Math.max(byId.get(id) ?? 0, Math.min(1, rel)));
  }

  const listings = fetchAllListings();
  const listingMap = new Map(listings.map((l) => [l.id, l]));
  const ranked = [...byId.entries()]
    .map(([id, lexicalScore]) => ({ listing: listingMap.get(id), lexicalScore }))
    .filter((x): x is LexicalHit => Boolean(x.listing))
    .sort((a, b) => b.lexicalScore - a.lexicalScore);

  return ranked.slice(0, limit);
}

export function lexicalSearchListingsInSubset(
  query: string,
  subset: Listing[],
  limit: number,
): LexicalHit[] {
  const q = query.trim();
  if (!q || !subset.length || limit <= 0) return [];
  const fuse = buildFuseIndex(subset);
  const full = buildFuseFullText(subset);
  const keyRaw = fuse.search(q, { limit: Math.max(limit * 3, 20) });
  const fullRaw = full.search(q, { limit: Math.max(limit * 2, 12) });
  const byId = new Map<string, number>();
  for (const r of keyRaw) {
    const rel = fuseScoreToRelevance(r.score) + listingBoostScore(r.item);
    byId.set(r.item.id, Math.max(byId.get(r.item.id) ?? 0, Math.min(1, rel)));
  }
  for (const r of fullRaw) {
    const rel = fuseScoreToRelevance(r.score) + listingBoostScore(r.item.listing);
    byId.set(r.item.id, Math.max(byId.get(r.item.id) ?? 0, Math.min(1, rel)));
  }
  const map = new Map(subset.map((l) => [l.id, l]));
  return [...byId.entries()]
    .map(([id, lexicalScore]) => ({ listing: map.get(id), lexicalScore }))
    .filter((x): x is LexicalHit => Boolean(x.listing))
    .sort((a, b) => b.lexicalScore - a.lexicalScore)
    .slice(0, limit);
}
