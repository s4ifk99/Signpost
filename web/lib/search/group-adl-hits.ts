import type { Listing } from "@/lib/data";
import type { HybridHit } from "@/lib/search/hybrid-core";

/** Normalise firm name for grouping (legal aid multi-office rows). */
function normaliseFirmName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match Python ingest slugify closely enough for stable grouping. */
export function slugifySegment(s: string): string {
  return normaliseFirmName(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Stable key: same GOV.UK provider name + practice subcategory → one search card.
 * Non–legal-aid listings return null (no grouping).
 */
export function legalAidFirmGroupId(listing: Listing): string | null {
  if (!listing.isLegalAid) return null;
  const name = slugifySegment(listing.businessName);
  const sub = listing.subcategory?.trim() || "unknown";
  return `${name}|${sub}`;
}

export type AdlGroupToken = {
  type: "adlGroup";
  order: number;
  gid: string;
  byListingId: Map<string, HybridHit>;
};

type AdlSingleToken = { type: "adl"; order: number; hit: HybridHit };

type EmitToken = AdlGroupToken | AdlSingleToken;

function upsertGroupHit(map: Map<string, HybridHit>, hit: HybridHit) {
  const id = hit.listing.id;
  const prev = map.get(id);
  if (!prev || hit.rrfScoreApprox > prev.rrfScoreApprox) map.set(id, hit);
}

/**
 * Walk fused RRF keys; merge legal-aid rows that share legalAidFirmGroupId into one token.
 * Optional later: persist firmGroupId in ingest (Python) if per-office ranking becomes a bottleneck.
 */
export function buildFusedSearchTokens(
  fused: string[],
  adlPrefix: string,
  adlMap: Map<string, HybridHit>,
): EmitToken[] {
  const tokens: EmitToken[] = [];
  const groupIndexByGid = new Map<string, number>();

  let order = 0;
  for (const key of fused) {
    if (key.startsWith(adlPrefix)) {
      const hit = adlMap.get(key);
      if (!hit) continue;
      const gid = legalAidFirmGroupId(hit.listing);
      if (!gid) {
        tokens.push({ type: "adl", order, hit });
        order += 1;
        continue;
      }
      const idx = groupIndexByGid.get(gid);
      if (idx === undefined) {
        groupIndexByGid.set(gid, tokens.length);
        tokens.push({
          type: "adlGroup",
          order,
          gid,
          byListingId: new Map([[hit.listing.id, hit]]),
        });
      } else {
        const t = tokens[idx] as AdlGroupToken;
        upsertGroupHit(t.byListingId, hit);
      }
      order += 1;
      continue;
    }
  }

  tokens.sort((a, b) => a.order - b.order);
  return tokens;
}

export function hybridHitsFromGroupToken(t: AdlGroupToken): HybridHit[] {
  return Array.from(t.byListingId.values()).sort(
    (a, b) => b.rrfScoreApprox - a.rrfScoreApprox,
  );
}
