"use client";

import { useEffect } from "react";

type SearchImpressionProps = {
  q: string;
  resultCount: number;
  semantic: boolean;
  freeOnly?: boolean;
  legalAidOnly?: boolean;
  city?: string;
};

export function SearchImpressionBeacon({
  q,
  resultCount,
  semantic,
  freeOnly,
  legalAidOnly,
  city,
}: SearchImpressionProps) {
  useEffect(() => {
    if (q.trim().length < 2) return;
    void fetch("/api/search/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "search_impression",
        q,
        resultCount,
        semantic,
        facets: { freeOnly, legalAidOnly, city },
      }),
    });
  }, [q, resultCount, semantic, freeOnly, legalAidOnly, city]);

  return null;
}

type ResultClickProps = {
  listingId: string;
  position: number;
  q: string;
};

export function logSearchResultClick({ listingId, position, q }: ResultClickProps) {
  void fetch("/api/search/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "result_click",
      listingId,
      position,
      q,
    }),
  });
}
