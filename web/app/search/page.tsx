import Link from "next/link";
import { Search } from "lucide-react";
import type { SearchFacets } from "@/lib/search/hybrid";
import { meilisearchConfigured } from "@/lib/search/meilisearch-sra";
import { unifiedSearchListings, type UnifiedSearchHit } from "@/lib/search/unified-search";
import { getDistinctCities, getListingsBySubcategory } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchImpressionBeacon } from "@/components/search-analytics";
import { SearchResultLink } from "@/components/search-result-link";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    semantic?: string;
    free?: string;
    legalAid?: string;
    city?: string;
  }>;
};

function matchExplainAdl(sources: ("lexical" | "semantic")[]): string {
  const lex = sources.includes("lexical");
  const sem = sources.includes("semantic");
  if (lex && sem) return "Keywords + similar topic";
  if (sem) return "Similar topic";
  return "Matched keywords";
}

function stableHitKey(hit: UnifiedSearchHit): string {
  if (hit.kind === "adl") return `adl:${hit.hit.listing.id}`;
  if (hit.kind === "adlGroup") return `adlg:${hit.firmGroupId}`;
  return hit.doc.id;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const semantic = sp.semantic === "1";
  const freeOnly = sp.free === "1";
  const legalAidOnly = sp.legalAid === "1";
  const cityFacet = (sp.city || "").trim();

  const facets: SearchFacets | undefined =
    freeOnly || legalAidOnly || cityFacet
      ? {
          freeOnly: freeOnly || undefined,
          legalAidOnly: legalAidOnly || undefined,
          city: cityFacet || undefined,
        }
      : undefined;

  const cities = getDistinctCities({ max: 32 });
  const meiliConfigured = await meilisearchConfigured();

  const hits =
    q.length >= 2
      ? await unifiedSearchListings(q, { limit: 60, semantic, facets })
      : [];

  const semanticUsed =
    semantic &&
    hits.some((h) => {
      if (h.kind === "adl") return h.hit.sources.includes("semantic");
      if (h.kind === "adlGroup")
        return h.hits.some((x) => x.sources.includes("semantic"));
      return false;
    });
  const citizensFallback = getListingsBySubcategory("citizens-advice").slice(0, 3);

  const sraDegraded =
    q.length >= 2 && !meiliConfigured && !freeOnly && !legalAidOnly;

  return (
    <div className="min-h-screen bg-background">
      <SearchImpressionBeacon
        q={q}
        resultCount={hits.length}
        semantic={semantic}
        freeOnly={freeOnly}
        legalAidOnly={legalAidOnly}
        city={cityFacet || undefined}
      />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 font-serif text-3xl font-semibold text-primary">Search directory</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Directory-wide search (not legal-aid-only): fuzzy matching on names and topics. Turn on smart match for
          semantic similarity when embeddings and <code className="rounded bg-muted px-1">HF_TOKEN</code> are
          configured. Use filters for free listings, legal-aid providers only, or city. When{" "}
          <code className="rounded bg-muted px-1">MEILISEARCH_HOST</code> is set, national SRA-regulated
          firms are merged into results (SRA Data Share). This is not legal advice — verify details on the
          official record. Semantic + Meilisearch readiness:{" "}
          <Link href="/api/search/status" className="text-primary underline" target="_blank" rel="noreferrer">
            /api/search/status
          </Link>
          .
        </p>

        <form action="/search" method="get" className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="e.g. eviction, legal aid, drink driving…"
              className="h-12 border-2 border-primary/20 pl-11 text-base"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" className="h-11">
              Search
            </Button>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                name="semantic"
                value="1"
                defaultChecked={semantic}
                className="h-4 w-4 rounded border-primary/30 accent-primary"
              />
              Smart match (vector + fuzzy)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                name="free"
                value="1"
                defaultChecked={freeOnly}
                className="h-4 w-4 rounded border-primary/30 accent-primary"
              />
              Free only
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                name="legalAid"
                value="1"
                defaultChecked={legalAidOnly}
                className="h-4 w-4 rounded border-primary/30 accent-primary"
              />
              Legal aid listings only
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px]">
              <label htmlFor="city-facet" className="mb-1 block text-xs font-medium text-muted-foreground">
                City
              </label>
              <select
                id="city-facet"
                name="city"
                defaultValue={cityFacet}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Any city</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {q.length > 0 && q.length < 2 && (
          <p className="text-sm text-muted-foreground">Enter at least 2 characters to search.</p>
        )}

        {q.length >= 2 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {hits.length} result{hits.length === 1 ? "" : "s"}
              {semanticUsed ? " · smart match active" : semantic ? " · smart match unavailable (add embeddings + HF_TOKEN)" : ""}
              {(freeOnly || legalAidOnly || cityFacet) && " · filters applied"}
              {sraDegraded ? " · national SRA directory unavailable (set MEILISEARCH_HOST on the server)" : ""}
            </p>
            <ul className="space-y-3">
              {hits.map((hit, index) => {
                if (hit.kind === "adl") {
                  const { listing, sources } = hit.hit;
                  return (
                    <li key={stableHitKey(hit)}>
                      <Card className="border-primary/15">
                        <CardContent className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <SearchResultLink
                                href={`/category/${listing.subcategory}`}
                                className="font-semibold text-foreground hover:underline"
                                listingId={listing.id}
                                position={index}
                                q={q}
                              >
                                {listing.businessName}
                              </SearchResultLink>
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {[listing.city, listing.postcode].filter(Boolean).join(" · ")}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground/80">{matchExplainAdl(sources)}</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {listing.isFree && <Badge className="bg-green-100 text-green-800">Free</Badge>}
                              {listing.isLegalAid && (
                                <Badge variant="secondary">Legal Aid *</Badge>
                              )}
                              {listing.isSponsored && <Badge variant="outline">Sponsored</Badge>}
                              {sources.includes("semantic") && (
                                <Badge variant="outline" className="text-xs">
                                  semantic
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                }

                if (hit.kind === "adlGroup") {
                  const { representative, hits: groupHits } = hit;
                  const rep = representative.listing;
                  const sources = [...new Set(groupHits.flatMap((h) => h.sources))] as (
                    | "lexical"
                    | "semantic"
                  )[];
                  return (
                    <li key={stableHitKey(hit)}>
                      <Card className="border-primary/15">
                        <CardContent className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground">{rep.businessName}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Legal aid provider · {groupHits.length} office
                                {groupHits.length === 1 ? "" : "s"} (GOV.UK directory)
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{rep.description}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground/80">{matchExplainAdl(sources)}</p>
                              <p className="mt-3 text-xs font-medium text-foreground">Locations</p>
                              <ul className="mt-2 space-y-3 border-t border-border/60 pt-3">
                                {groupHits.map((h) => {
                                  const l = h.listing;
                                  return (
                                    <li key={l.id} className="text-sm">
                                      <SearchResultLink
                                        href={`/category/${l.subcategory}`}
                                        className="font-medium text-primary hover:underline"
                                        listingId={l.id}
                                        position={index}
                                        q={q}
                                      >
                                        {[l.city, l.postcode].filter(Boolean).join(" · ") || "View office"}
                                      </SearchResultLink>
                                      {l.address ? (
                                        <p className="mt-0.5 text-xs text-muted-foreground">{l.address}</p>
                                      ) : null}
                                      {l.phone ? (
                                        <p className="text-xs text-muted-foreground">
                                          <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="hover:underline">
                                            {l.phone}
                                          </a>
                                        </p>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary">Legal Aid *</Badge>
                              {rep.isFree && <Badge className="bg-green-100 text-green-800">Free</Badge>}
                              {rep.isSponsored && <Badge variant="outline">Sponsored</Badge>}
                              {sources.includes("semantic") && (
                                <Badge variant="outline" className="text-xs">
                                  semantic
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                }

                const doc = hit.doc;
                const profileUrl = doc.sraProfileUrl || "#";
                return (
                  <li key={stableHitKey(hit)}>
                    <Card className="border-primary/15">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <SearchResultLink
                              href={profileUrl}
                              className="font-semibold text-foreground hover:underline"
                              listingId={doc.id}
                              position={index}
                              q={q}
                              openInNewTab
                            >
                              {doc.businessName}
                            </SearchResultLink>
                            <p className="mt-1 text-xs text-muted-foreground">
                              SRA ID {doc.sraId} · Regulated by the Solicitors Regulation Authority
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{doc.searchText}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {[doc.city, doc.postcode, doc.county].filter(Boolean).join(" · ")}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground/80">
                              National SRA directory — verify on the SRA website; not legal advice.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="border-amber-200/80 bg-amber-50/80 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                              SRA directory
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
            {hits.length === 0 && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No listings matched your search and filters. Try different words, clear filters, or browse{" "}
                    <Link href="/" className="text-primary underline">
                      categories
                    </Link>
                    .
                  </CardContent>
                </Card>
                {citizensFallback.length > 0 && (
                  <Card className="border-green-200/50 bg-green-50/40 dark:bg-green-950/20">
                    <CardContent className="p-4">
                      <p className="mb-2 text-sm font-medium text-foreground">Not sure where to start?</p>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Citizens Advice offers general guidance and signposting (not a substitute for a solicitor).
                      </p>
                      <ul className="space-y-2 text-sm">
                        {citizensFallback.map((l) => (
                          <li key={l.id}>
                            <Link href={`/category/${l.subcategory}`} className="text-primary underline">
                              {l.businessName}
                            </Link>
                            {l.phone ? <span className="text-muted-foreground"> · {l.phone}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
