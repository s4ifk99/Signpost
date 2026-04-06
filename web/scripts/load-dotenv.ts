/**
 * Load `web/.env` then `web/.env.local` (override) before other imports read process.env.
 * Imported first from CLI scripts run via `npm run` from the `web/` directory.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

const webRoot = process.cwd();
config({ path: resolve(webRoot, ".env") });
config({ path: resolve(webRoot, ".env.local"), override: true });
