/**
 * Typesense env + document mapping for directory listings (safe for CLI scripts; no server-only).
 */
import Typesense from "typesense";
import type { Listing } from "@/lib/data";
import {
  getListingSearchDocument,
} from "@/lib/search/listing-document";

type TsClient = InstanceType<typeof Typesense.Client>;

export type ListingTypesenseDocument = {
  id: string;
  searchText?: string;
  businessName?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  city?: string;
  postcode?: string;
  phone?: string;
  isFree: boolean;
  isLegalAid?: boolean;
};

function typesenseHost(): string | null {
  return process.env.TYPESENSE_HOST?.trim() || null;
}

function typesenseApiKey(): string | null {
  return process.env.TYPESENSE_API_KEY?.trim() || null;
}

export function typesenseListingsConfigured(): boolean {
  return Boolean(typesenseHost() && typesenseApiKey());
}

export function buildTypesenseListingsClientFromEnv(options?: {
  connectionTimeoutSeconds?: number;
}): TsClient | null {
  const host = typesenseHost();
  const apiKey = typesenseApiKey();
  if (!host || !apiKey) return null;
  const protocol = (process.env.TYPESENSE_PROTOCOL?.trim().toLowerCase() === "http" ? "http" : "https") as
    | "http"
    | "https";
  const portStr = process.env.TYPESENSE_PORT?.trim() || (protocol === "https" ? "443" : "8108");
  const port = Number.parseInt(portStr, 10);
  const portNum = Number.isFinite(port) ? port : protocol === "https" ? 443 : 8108;
  return new Typesense.Client({
    nodes: [{ host, port: portNum, protocol }],
    apiKey,
    connectionTimeoutSeconds: options?.connectionTimeoutSeconds ?? 15,
  });
}

export function listingToTypesenseDocument(listing: Listing): ListingTypesenseDocument {
  return {
    id: listing.id,
    searchText: getListingSearchDocument(listing),
    businessName: listing.businessName,
    description: listing.description,
    category: listing.category,
    subcategory: listing.subcategory,
    city: listing.city,
    postcode: listing.postcode,
    phone: listing.phone,
    isFree: listing.isFree,
    isLegalAid: listing.isLegalAid === true,
  };
}
