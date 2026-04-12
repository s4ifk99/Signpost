import { NextResponse } from "next/server";
import type { SearchFacets } from "@/lib/search/rerank";
import {
  typesenseListingsConfigured,
  typesenseListingsReachable,
} from "@/lib/search/typesense-listings";
import { unifiedSearchListings } from "@/lib/search/unified-search";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const semantic = searchParams.get("semantic") === "1";
  const limit = Math.min(80, Math.max(1, Number(searchParams.get("limit") || 40) || 40));
  const freeOnly = searchParams.get("free") === "1";
  const legalAidOnly = searchParams.get("legalAid") === "1";
  const city = (searchParams.get("city") || "").trim();
  const facets: SearchFacets | undefined =
    freeOnly || legalAidOnly || city
      ? {
          freeOnly: freeOnly || undefined,
          legalAidOnly: legalAidOnly || undefined,
          city: city || undefined,
        }
      : undefined;

  const tsConfigured = typesenseListingsConfigured();
  const tsOk = tsConfigured ? await typesenseListingsReachable() : false;

  if (!q) {
    return NextResponse.json({
      results: [],
      semanticUsed: false,
      typesenseListingsConfigured: tsConfigured,
      typesenseListingsReachable: tsOk,
    });
  }

  console.info(
    JSON.stringify({
      event: "search_api",
      qLen: q.length,
      qPrefix: q.slice(0, 120),
      semantic,
      limit,
      facets: { freeOnly, legalAidOnly, city: city || null },
    }),
  );

  const hits = await unifiedSearchListings(q, {
    limit,
    semantic,
    facets,
  });

  const semanticUsed =
    semantic &&
    hits.some((h) => {
      if (h.kind === "adl") return h.hit.sources.includes("semantic");
      if (h.kind === "adlGroup")
        return h.hits.some((x) => x.sources.includes("semantic"));
      return false;
    });

  return NextResponse.json({
    semanticUsed,
    typesenseListingsConfigured: tsConfigured,
    typesenseListingsReachable: tsOk,
    results: hits.map((row) => {
      if (row.kind === "adl") {
        const { listing, sources } = row.hit;
        return {
          kind: "adl" as const,
          id: listing.id,
          businessName: listing.businessName,
          description: listing.description,
          city: listing.city,
          postcode: listing.postcode,
          phone: listing.phone,
          email: listing.email,
          website: listing.website,
          category: listing.category,
          subcategory: listing.subcategory,
          isFree: listing.isFree,
          isLegalAid: listing.isLegalAid,
          isSponsored: listing.isSponsored,
          sources,
        };
      }
      const { representative, hits: groupHits, firmGroupId } = row;
      const L = representative.listing;
      const sources = [
        ...new Set(groupHits.flatMap((h) => h.sources)),
      ] as ("lexical" | "semantic")[];
      return {
        kind: "adlGroup" as const,
        firmGroupId,
        id: firmGroupId,
        businessName: L.businessName,
        description: L.description,
        category: L.category,
        subcategory: L.subcategory,
        isFree: L.isFree,
        isLegalAid: true as const,
        isSponsored: L.isSponsored,
        sources,
        locations: groupHits.map((h) => {
          const l = h.listing;
          return {
            id: l.id,
            city: l.city,
            postcode: l.postcode,
            phone: l.phone,
            email: l.email,
            address: l.address,
            website: l.website,
            subcategory: l.subcategory,
            description: l.description,
          };
        }),
      };
    }),
  });
}
