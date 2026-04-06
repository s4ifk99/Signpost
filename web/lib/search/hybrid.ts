import "server-only";

import { loadEmbeddingsBundle, semanticTopIds } from "@/lib/embeddings-store";
import { embedQueryWithHf } from "@/lib/embed-query";
import { lexicalSearchListings } from "@/lib/search/lexical";
import {
  finalizeHybridHits,
  type HybridHit,
  type HybridSearchOptions,
} from "@/lib/search/hybrid-core";

export type { HybridHit, HybridSearchOptions, SearchFacets } from "@/lib/search/hybrid-core";

export async function hybridSearchListings(
  query: string,
  options: HybridSearchOptions,
): Promise<HybridHit[]> {
  const q = query.trim();
  const {
    limit,
    semantic,
    facets,
    maxPerSubcategory,
    candidatePool = 220,
  } = options;
  if (!q || limit <= 0) return [];

  const lexicalHits = lexicalSearchListings(q, 120);
  const lexicalIds = lexicalHits.map((h) => h.listing.id);

  let semanticIds: string[] = [];
  if (semantic) {
    const bundle = loadEmbeddingsBundle();
    if (bundle) {
      const qVec = await embedQueryWithHf(q, bundle.modelId, bundle.dim);
      if (qVec) semanticIds = semanticTopIds(qVec, bundle, 80);
    }
  }

  return finalizeHybridHits(q, lexicalIds, semanticIds, {
    limit,
    facets,
    maxPerSubcategory,
    candidatePool,
  });
}

export async function rankedListingIdsForQuery(
  query: string,
  options: { limit: number; semantic: boolean },
): Promise<string[]> {
  const hits = await hybridSearchListings(query, options);
  return hits.map((h) => h.listing.id);
}
