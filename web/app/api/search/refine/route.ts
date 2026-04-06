import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const bodySchema = z.object({
  problem: z.string().min(1).max(8000),
  legalAidOnly: z.boolean().optional(),
  freeOnly: z.boolean().optional(),
});

const outSchema = z.object({
  q: z
    .string()
    .describe(
      "Short keyword-rich search query (UK legal directory): practice area, issue type, and key terms. No full sentences.",
    ),
  semantic: z
    .boolean()
    .describe("True if topic similarity would help beyond literal keywords (e.g. vague or emotional wording)."),
});

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ error: "Search refinement requires OPENAI_API_KEY." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { problem, legalAidOnly, freeOnly } = parsed.data;
  const hf = Boolean(process.env.HF_TOKEN?.trim());

  const filterHint = [
    legalAidOnly ? "User wants legal aid providers — include terms like legal aid, LASPO, scope where relevant." : "",
    freeOnly ? "User prefers free or pro bono — you may add keywords: free, pro bono, clinic, advice centre." : "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const { object } = await generateObject({
      model: "openai/gpt-4o-mini",
      schema: outSchema,
      schemaName: "SearchRefinement",
      schemaDescription: "Refined directory search parameters",
      prompt: `The user described their legal help need (UK). Produce a tight search query for a mixed directory (solicitors, clinics, charities, legal aid offices).

User message:
"""
${problem.trim()}
"""

${filterHint ? `Additional preferences: ${filterHint}` : ""}

Rules:
- q: maximum ~12 words, no advice, no PII, British English legal vocabulary where natural.
- semantic: true only for vague, narrative, or cross-topic wording where embeddings would help; false for clear issue labels (e.g. "drink driving", "section 8 eviction").`,
    });

    let semantic = object.semantic;
    if (!hf) semantic = false;

    const q = object.q.trim().slice(0, 500) || problem.trim().slice(0, 500);

    return NextResponse.json({ q, semantic });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Refinement failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
