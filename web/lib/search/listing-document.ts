import type { Listing } from "@/lib/data";

/** Lexical / hybrid relevance tilt (Fuse + Typesense listings). */
export function listingBoostScore(listing: Listing): number {
  let b = 0;
  if (listing.isFree) b += 0.09;
  if (listing.isLegalAid) b += 0.07;
  if (listing.isSponsored) b += 0.04;
  return b;
}

/** Single string used for Fuse indexing and for embedding generation (keep in sync with embed-listings.py). */
export function getListingSearchDocument(listing: Listing): string {
  const gov = listing.legalAidGovCategory?.trim();
  const govLine = gov ? `Area of law (GOV.UK): ${gov}` : "";
  const parts = [
    listing.businessName,
    listing.description,
    govLine,
    listing.category,
    listing.subcategory,
    listing.city,
    listing.postcode,
    listing.phone,
  ].filter(Boolean);
  return parts.join("\n");
}
