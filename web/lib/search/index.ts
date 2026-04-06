/** Client- and server-safe search helpers (no `server-only` deps). */
export { getListingSearchDocument } from "@/lib/search/listing-document";
export {
  lexicalSearchListings,
  lexicalSearchListingsInSubset,
  listingBoostScore,
  resetSearchIndexCache,
  type LexicalHit,
} from "@/lib/search/lexical";
export { searchSubcategories, type CategorySuggestion } from "@/lib/search/categories";
export { reciprocalRankFusion } from "@/lib/search/rrf";
