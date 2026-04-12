import "server-only";

import type { Listing } from "@/lib/data";
import { fetchAllListings } from "@/lib/data";
import { listingBoostScore } from "@/lib/search/listing-document";
import type { SearchFacets } from "@/lib/search/rerank";
import { DIRECTORY_LISTINGS_COLLECTION } from "@/lib/search/typesense-listings-config";
import {
  buildTypesenseListingsClientFromEnv,
  listingToTypesenseDocument,
  typesenseListingsConfigured,
  type ListingTypesenseDocument,
} from "@/lib/search/typesense-listings-client";

export {
  buildTypesenseListingsClientFromEnv,
  listingToTypesenseDocument,
  typesenseListingsConfigured,
  type ListingTypesenseDocument,
} from "@/lib/search/typesense-listings-client";

function escapeFilterValue(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

function buildFilterBy(facets: SearchFacets | undefined, subcategorySlug?: string): string | undefined {
  const parts: string[] = [];
  if (subcategorySlug?.trim()) {
    parts.push(`subcategory:=\`${escapeFilterValue(subcategorySlug.trim())}\``);
  }
  if (facets?.freeOnly) parts.push("isFree:=true");
  if (facets?.legalAidOnly) parts.push("isLegalAid:=true");
  if (facets?.city?.trim()) {
    parts.push(`city:=\`${escapeFilterValue(facets.city.trim())}\``);
  }
  return parts.length ? parts.join(" && ") : undefined;
}

/** Typesense text_match is larger for better matches; squash to ~0..1 for lexicalScore baseline. */
function textMatchToBaseScore(textMatch: number | undefined): number {
  const t = textMatch ?? 0;
  if (t <= 0) return 0.15;
  return Math.max(0.15, Math.min(1, 0.15 + Math.log1p(t) / Math.log1p(200)));
}

/**
 * Search directory listings in Typesense; hydrate full Listing rows from in-memory data.
 */
export async function searchListingsTypesense(
  query: string,
  limit: number,
  facets?: SearchFacets,
  options?: { subcategorySlug?: string },
): Promise<{ listing: Listing; lexicalScore: number }[]> {
  const client = buildTypesenseListingsClientFromEnv();
  const q = query.trim();
  if (!client || !q || limit <= 0) return [];

  const filter_by = buildFilterBy(facets, options?.subcategorySlug);

  try {
    const res = await client.collections(DIRECTORY_LISTINGS_COLLECTION).documents().search({
      q,
      query_by: "businessName,description,city,postcode,category,subcategory,searchText,phone",
      per_page: Math.min(120, Math.max(1, limit)),
      filter_by,
    });
    const hits = res.hits ?? [];
    const byId = new Map(fetchAllListings().map((l) => [l.id, l]));
    const out: { listing: Listing; lexicalScore: number }[] = [];
    for (const h of hits) {
      const doc = h.document as ListingTypesenseDocument;
      const listing = byId.get(doc.id);
      if (!listing) continue;
      const base = textMatchToBaseScore(h.text_match);
      const lexicalScore = Math.min(1, base + listingBoostScore(listing));
      out.push({ listing, lexicalScore });
    }
    out.sort((a, b) => b.lexicalScore - a.lexicalScore);
    return out.slice(0, limit);
  } catch (e) {
    console.warn("[typesense-listings] search failed:", e);
    return [];
  }
}

export async function typesenseListingsReachable(): Promise<boolean> {
  const client = buildTypesenseListingsClientFromEnv();
  if (!client) return false;
  try {
    const h = await client.health.retrieve();
    return Boolean((h as { ok?: boolean }).ok);
  } catch {
    return false;
  }
}
