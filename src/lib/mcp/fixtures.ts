/**
 * Fixture loader for offline / pre-credential development.
 * Set USE_MCP_FIXTURES=true in .env.local to activate.
 *
 * Fixtures live in /fixtures/*.json — update them with real payloads as you
 * validate live responses (ARCHITECTURE.md §Live-validation checklist).
 */

import path from "path";
import fs from "fs";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures");

const CACHE: Record<string, unknown> = {};

export function loadFixture<T = unknown>(name: string): T {
  if (CACHE[name]) return CACHE[name] as T;

  const filePath = path.join(FIXTURE_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[fixtures] Missing fixture: ${name}.json — returning empty array`);
    return [] as unknown as T;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as T;
  CACHE[name] = parsed;
  return parsed;
}
