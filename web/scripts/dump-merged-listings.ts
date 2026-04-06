import { writeFileSync } from "fs";
import { join } from "path";
import { fetchAllListings } from "../lib/data";

const out = join(process.cwd(), "data", "all-listings-embed-input.json");
const rows = fetchAllListings();
writeFileSync(out, JSON.stringify(rows), "utf-8");
console.log(`Wrote ${rows.length} listings to ${out}`);
