import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from "ai";
import { fetchAllListings, categories, type Listing } from "@/lib/data";

export const maxDuration = 30;

// Build a summary of available services for the AI context
function buildServicesContext(): string {
  const allListings = fetchAllListings();
  
  // Group listings by category
  const grouped: Record<string, Listing[]> = {};
  for (const listing of allListings) {
    if (!grouped[listing.category]) {
      grouped[listing.category] = [];
    }
    grouped[listing.category].push(listing);
  }

  const MAX_LISTINGS_TOTAL = 120;
  const MAX_LISTINGS_PER_CATEGORY = 12;
  let totalAdded = 0;

  // Build context string
  let context = "Available Legal Services in the Access Directory for Legal Help (ADL) - UK:\n\n";
  
  for (const [category, listings] of Object.entries(grouped)) {
    context += `## ${category}\n`;
    // Prefer showing free services, then sponsored, then legal aid, to keep the AI context useful.
    const sorted = [...listings].sort((a, b) => {
      const score = (l: Listing) =>
        (l.isFree ? 100 : 0) + (l.isSponsored ? 50 : 0) + (l.isLegalAid ? 25 : 0);
      return score(b) - score(a);
    });

    const selected = sorted.slice(0, MAX_LISTINGS_PER_CATEGORY);
    for (const listing of selected) {
      if (totalAdded >= MAX_LISTINGS_TOTAL) break;
      context += `- ${listing.businessName} (${listing.city})`;
      if (listing.isFree) context += " [FREE SERVICE]";
      context += `\n  ${listing.description}\n`;
      context += `  Phone: ${listing.phone} | Email: ${listing.email}\n`;
      if (listing.website) context += `  Website: ${listing.website}\n`;
      context += `  Category: ${listing.subcategory}\n\n`;
      totalAdded += 1;
    }
    if (totalAdded >= MAX_LISTINGS_TOTAL) break;
  }

  // Add category information
  context += "\n## Available Categories:\n";
  for (const [parentCat, subcats] of Object.entries(categories)) {
    context += `${parentCat}: ${subcats.map(s => s.name).join(", ")}\n`;
  }

  return context;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Get the services context
  const servicesContext = buildServicesContext();

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
