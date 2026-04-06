import { NextResponse } from "next/server";
import { lexicalSearchListings } from "@/lib/search/lexical";
import { searchSubcategories } from "@/lib/search/categories";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ listings: [], categories: [] });
  }

  const listingHits = lexicalSearchListings(q, 10);
  const categories = searchSubcategories(q, 6);

  const listings = listingHits.map(({ listing, lexicalScore }) => ({
    id: listing.id,
    businessName: listing.businessName,
    city: listing.city,
    subcategory: listing.subcategory,
    category: listing.category,
    isFree: listing.isFree,
    isLegalAid: listing.isLegalAid,
    isSponsored: listing.isSponsored,
    lexicalScore,
  }));

  return NextResponse.json({ listings, categories });
}
