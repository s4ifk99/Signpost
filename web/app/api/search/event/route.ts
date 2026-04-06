import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  kind?: string;
  q?: string;
  resultCount?: number;
  semantic?: boolean;
  listingId?: string;
  position?: number;
  facets?: Record<string, unknown>;
};

/** Lightweight structured logs (picked up by Vercel/host log drains). */
export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const safeQ =
    typeof body.q === "string" ? body.q.slice(0, 240).replace(/\s+/g, " ").trim() : "";

  console.info(
    JSON.stringify({
      event: "search_analytics",
      kind: body.kind ?? "unknown",
      qLen: safeQ.length,
      qPrefix: safeQ.slice(0, 80),
      resultCount: body.resultCount,
      semantic: body.semantic,
      listingId: body.listingId,
      position: body.position,
      facets: body.facets,
    }),
  );

  return new NextResponse(null, { status: 204 });
}
