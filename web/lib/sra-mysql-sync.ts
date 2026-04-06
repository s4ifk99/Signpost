import { PrismaClient } from "@prisma/client";
import type { SraMeiliDocument } from "./search/sra-document";

const TX_CHUNK = 50;

function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

/**
 * Upsert normalised SRA documents into MySQL (system of record).
 * Call in small transactions to avoid oversized Prisma transactions.
 */
export async function upsertSraDocumentsMysql(
  prisma: PrismaClient,
  docs: SraMeiliDocument[],
): Promise<void> {
  for (let i = 0; i < docs.length; i += TX_CHUNK) {
    const chunk = docs.slice(i, i + TX_CHUNK);
    await prisma.$transaction(
      chunk.map((doc) =>
        prisma.sraOrganisation.upsert({
          where: { id: doc.id },
          create: {
            id: doc.id,
            sraId: clamp(doc.sraId, 64),
            businessName: clamp(doc.businessName, 512),
            searchText: doc.searchText,
            city: clamp(doc.city, 255),
            postcode: clamp(doc.postcode, 32),
            county: clamp(doc.county, 255),
            country: clamp(doc.country, 128),
            sraProfileUrl: clamp(doc.sraProfileUrl, 2048),
            source: clamp(doc.source, 16),
          },
          update: {
            sraId: clamp(doc.sraId, 64),
            businessName: clamp(doc.businessName, 512),
            searchText: doc.searchText,
            city: clamp(doc.city, 255),
            postcode: clamp(doc.postcode, 32),
            county: clamp(doc.county, 255),
            country: clamp(doc.country, 128),
            sraProfileUrl: clamp(doc.sraProfileUrl, 2048),
            source: clamp(doc.source, 16),
          },
        }),
      ),
    );
  }
}
