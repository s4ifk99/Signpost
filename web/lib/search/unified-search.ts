import "server-only";

import type { HybridHit } from "@/lib/search/hybrid-core";
import { hybridSearchListings } from "@/lib/search/hybrid";
import { reciprocalRankFusion } from "@/lib/search/rrf";
import { searchSraOrganisations } from "@/lib/search/meilisearch-sra";
import type { SearchFacets } from "@/lib/search/rerank";
import type { SraMeiliDocument } from "@/lib/search/sra-document";
import {
  buildFusedSearchTokens,
  hybridHitsFromGroupToken,
} from "@/lib/search/group-adl-hits";

const ADL_PREFIX = "adl:";
/** Meilisearch primary keys are `sra-{organisationId}` — never prefix again. */

export type UnifiedSearchHit =
  | { kind: "adl"; hit: HybridHit }
  | {
      kind: "adlGroup";
      firmGroupId: string;
      representative: HybridHit;
      hits: HybridHit[];
    }
  | { kind: "sra"; doc: SraMeiliDocument };

export type UnifiedSearchOptions = {
  limit: number;
  semantic: boolean;
  facets?: SearchFacets;
  maxPerSubcategory?: number;
  candidatePool?: number;
};

function outwardPostcode(pc: string): string {
  const p = pc.trim().toUpperCase();
  if (!p) return "";
  const m = p.match(/^[A-Z]{1,2}\d[A-Z\d]?\d?/);
  return m ? m[0] : p.split(/\s+/)[0] ?? "";
}

/**
 * Merge ADL hybrid search (curated + legal aid + optional vectors) with Meilisearch SRA firms via RRF.
 * SRA leg is skipped when Meilisearch is not configured or when facets are ADL-only (free / legal aid only).
 */
export async function unifiedSearchListings(
  query: string,
  options: UnifiedSearchOptions,
): Promise<UnifiedSearchHit[]> {
  const q = query.trim();
  const { limit, semantic, facets, maxPerSubcategory, candidatePool } = options;
  if (!q || limit <= 0) return [];

  const includeSra =
    Boolean(process.env.MEILISEARCH_HOST?.trim()) &&
    !facets?.freeOnly &&
    !facets?.legalAidOnly;

  const adlLimit = Math.min(120, Math.max(limit * 3, 60));
  const adlHits = await hybridSearchListings(q, {
    limit: adlLimit,
    semantic,
    facets,
    maxPerSubcategory,
    candidatePool,
  });

  const adlKeys = adlHits.map((h) => `${ADL_PREFIX}${h.listing.id}`);
  const adlMap = new Map(adlHits.map((h) => [`${ADL_PREFIX}${h.listing.id}`, h]));

  let sraKeys: string[] = [];
  const sraMap = new Map<string, SraMeiliDocument>();
  if (includeSra) {
    const sraDocs = await searchSraOrganisations(q, {
      limit: Math.min(100, adlLimit),
      city: facets?.city,
    });
    for (const doc of sraDocs) {
      sraKeys.push(doc.id);
      sraMap.set(doc.id, doc);
    }
  }

  const rankings = sraKeys.length ? [adlKeys, sraKeys] : [adlKeys];
  const fused = reciprocalRankFusion(rankings, 60);

  const tokens = buildFusedSearchTokens(fused, ADL_PREFIX, adlMap, sraMap);

  const out: UnifiedSearchHit[] = [];
  const sraOutwardCounts = new Map<string, number>();
  const maxSraPerOutward = 5;

  for (const t of tokens) {
    if (out.length >= limit) break;
    if (t.type === "adl") {
      out.push({ kind: "adl", hit: t.hit });
      continue;
    }
    if (t.type === "adlGroup") {
      const hits = hybridHitsFromGroupToken(t);
      if (hits.length === 0) continue;
      out.push({
        kind: "adlGroup",
        firmGroupId: t.gid,
        representative: hits[0]!,
        hits,
      });
      continue;
    }
    const doc = sraMap.get(t.docId);
    if (!doc) continue;
    const ow = outwardPostcode(doc.postcode);
    const n = sraOutwardCounts.get(ow) ?? 0;
    if (n >= maxSraPerOutward) continue;
    sraOutwardCounts.set(ow, n + 1);
    out.push({ kind: "sra", doc });
  }

  return out;
}
