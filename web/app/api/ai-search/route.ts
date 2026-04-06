import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from "ai";
import { fetchAllListings, categories, type Listing } from "@/lib/data";
import { hybridSearchListings } from "@/lib/search/hybrid";

export const maxDuration = 30;

function latestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "user") continue;
    const parts = m.parts ?? [];
    const text = parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
}

function listingPriority(l: Listing): number {
  return (l.isFree ? 100 : 0) + (l.isSponsored ? 50 : 0) + (l.isLegalAid ? 40 : 0);
}

async function buildServicesContext(userQuery: string): Promise<string> {
  const allListings = fetchAllListings();
  const q = userQuery.trim();
  let selected: Listing[] = [];

  if (q.length >= 2) {
    const hits = await hybridSearchListings(q, {
      limit: 55,
      semantic: Boolean(process.env.HF_TOKEN),
    });
    selected = hits.map((h) => h.listing);
  }

  const seen = new Set(selected.map((l) => l.id));
  const rest = [...allListings].sort((a, b) => listingPriority(b) - listingPriority(a));
  for (const l of rest) {
    if (selected.length >= 120) break;
    if (!seen.has(l.id)) {
      selected.push(l);
      seen.add(l.id);
    }
  }

  const MAX_LISTINGS_TOTAL = 120;
  let context =
    "Available Legal Services in the Access Directory for Legal Help (ADL) - UK:\n\n";

  for (let i = 0; i < selected.length && i < MAX_LISTINGS_TOTAL; i++) {
    const listing = selected[i]!;
    context += `- ${listing.businessName} (${listing.city})`;
    if (listing.isFree) context += " [FREE SERVICE]";
    if (listing.isLegalAid) context += " [LEGAL AID PROVIDER]";
    context += `\n  ${listing.description}\n`;
    context += `  Phone: ${listing.phone} | Email: ${listing.email}\n`;
    if (listing.website) context += `  Website: ${listing.website}\n`;
    context += `  Category: ${listing.subcategory}\n\n`;
  }

  context += "\n## Available Categories:\n";
  for (const [parentCat, subcats] of Object.entries(categories)) {
    context += `${parentCat}: ${subcats.map((s) => s.name).join(", ")}\n`;
  }

  return context;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const userQuery = latestUserText(messages ?? []);
  const servicesContext = await buildServicesContext(userQuery);

  const systemPrompt = `You are a helpful legal services assistant for the Access Directory for Legal Help (ADL), a UK-based legal resources directory. Your role is to help users find appropriate legal services based on their needs.

IMPORTANT GUIDELINES:
1. Always prioritise FREE legal services when available and appropriate
2. Be empathetic and understanding - people seeking legal help are often in difficult situations
3. Provide specific recommendations from the available services below
4. Include contact details (phone, email, website) in your recommendations
5. If someone's issue is urgent or involves immediate danger, advise them to call 999 or visit their nearest police station
6. Never provide legal advice - only help connect users with appropriate services
7. Be clear about which services are free vs paid
8. If you're unsure which service fits best, recommend Citizens Advice as a good starting point

${servicesContext}

When responding:
- Ask clarifying questions if the user's needs are unclear
- Recommend 2-3 relevant services when possible
- Explain why each service might be helpful
- Always mention if a service is free
- Format contact details clearly`;

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  });
}
