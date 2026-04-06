/**
 * Run Prisma CLI after loading `.env` / `.env.local` (same as sra:sync).
 * Usage: tsx scripts/prisma-with-env.ts migrate deploy
 */
import "./load-dotenv";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: tsx scripts/prisma-with-env.ts <prisma args…>");
  console.error('Example: tsx scripts/prisma-with-env.ts migrate deploy');
  process.exit(1);
}

const r = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  env: process.env,
  shell: true,
  cwd: process.cwd(),
});

process.exit(r.status ?? 1);
