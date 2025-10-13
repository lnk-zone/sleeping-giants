import fs from "node:fs/promises";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Issue as SharedIssue } from "@sg/shared";
import { syncBeehiiv as realSyncBeehiiv } from "./beehiiv.js";

export type IssueCard = {
  issueId: string;
  title: string;
  dek: string;
  tags: string[];
  readMinutes: number;
  publishedAt: string;
};

type Issue = Omit<SharedIssue, "sections"> & {
  sections?: SharedIssue["sections"];
};

type BeehiivCache = { issues: Issue[] };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const localIssuesDir = path.join(repoRoot, "packages", "content", "issues");
const beehiivCacheFile = path.join(repoRoot, "services", "hub", "data", "sg-beehiiv.json");
const beehiivCacheTtlMs = Number(process.env.BEEHIIV_CACHE_TTL_MS ?? 15 * 60 * 1000);
const warmBeehiivCacheOnLoad = process.env.SG_DISABLE_BEEHIIV_WARMUP === "1" ? false : true;

let cachedLocal: Issue[] | null = null;

let cachedExternal: Issue[] | null = null;
let externalMtime = 0;
let pendingBeehiivSync: Promise<void> | null = null;
let beehiivSync = realSyncBeehiiv;

function hasBeehiivCredentials(): boolean {
  return Boolean(process.env.BEEHIIV_API_KEY && process.env.BEEHIIV_PUBLICATION_ID);
}

async function runBeehiivSync(reason: string, wait: boolean) {
  if (!hasBeehiivCredentials()) return;
  if (!pendingBeehiivSync) {
    pendingBeehiivSync = (async () => {
      console.info(`[content] Beehiiv sync starting (${reason})`);
      try {
        await beehiivSync();
        cachedExternal = null;
        externalMtime = 0;
        let refreshed: Issue[] | null = null;
        try {
          refreshed = await loadExternal({ skipTtl: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`[content] Beehiiv cache reload failed: ${message}`);
        }
        if (refreshed) {
          console.info(`[content] Beehiiv cache refreshed with ${refreshed.length} issues`);
        } else {
          console.info(`[content] Beehiiv cache refresh completed with no data`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[content] Beehiiv sync failed (${reason}): ${message}`);
      } finally {
        pendingBeehiivSync = null;
      }
    })();
  }
  if (wait && pendingBeehiivSync) {
    await pendingBeehiivSync;
  }
}

// Try to load external Beehiiv cache if present
async function loadExternal(opts: { force?: boolean; skipTtl?: boolean } = {}): Promise<Issue[] | null> {
  try {
    let stat = await fs.stat(beehiivCacheFile).catch(() => null as any);
    if ((opts.force || !stat) && hasBeehiivCredentials()) {
      await runBeehiivSync(!stat ? "bootstrap" : "force", true);
      stat = await fs.stat(beehiivCacheFile).catch(() => null as any);
    }
    if (!stat) return null;

    const ageMs = Date.now() - stat.mtimeMs;
    let cacheIsFresh = true;
    if (!opts.skipTtl && hasBeehiivCredentials() && beehiivCacheTtlMs > 0 && ageMs > beehiivCacheTtlMs) {
      console.info(
        `[content] Beehiiv cache stale (age=${Math.round(ageMs)}ms > ttl=${beehiivCacheTtlMs}ms); scheduling refresh`
      );
      cachedExternal = null;
      externalMtime = 0;
      cacheIsFresh = false;
      // Fire-and-forget refresh; the current cache is still usable.
      void runBeehiivSync("stale", false);
    }

    const mtime = stat.mtimeMs;
    if (cachedExternal && mtime === externalMtime) {
      return cachedExternal;
    }
    const buf = await fs.readFile(beehiivCacheFile, "utf-8");
    const json = JSON.parse(buf) as BeehiivCache;
    if (!json?.issues || !Array.isArray(json.issues)) return null;
    const filtered = json.issues.filter((i) => i && i.issueId && i.title && i.bodyHtml);
    cachedExternal = filtered;
    externalMtime = cacheIsFresh ? mtime : 0;
    return filtered;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[content] loadExternal failed: ${message}`);
    return null;
  }
}

function loadLocalFromDisk(): Issue[] {
  try {
    const entries = readdirSync(localIssuesDir, { withFileTypes: true });
    const issues: Issue[] = [];
    for (const pub of entries) {
      if (!pub.isDirectory()) continue;
      const pubDir = path.join(localIssuesDir, pub.name);
      const files = readdirSync(pubDir, { withFileTypes: true });
      for (const file of files) {
        if (!file.isFile() || !file.name.endsWith(".json")) continue;
        try {
          const raw = readFileSync(path.join(pubDir, file.name), "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed && parsed.issueId && parsed.bodyHtml) {
            issues.push(parsed as Issue);
          }
        } catch {
          // skip malformed issue file
        }
      }
    }
    return issues;
  } catch {
    return [];
  }
}

function localIssues(): Issue[] {
  if (!cachedLocal) {
    cachedLocal = loadLocalFromDisk();
  }
  const arr = cachedLocal ?? [];
  // newest first by publishedAt
  return [...arr].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
}

async function ensureExternalLoaded(force = false): Promise<void> {
  if (force) {
    await loadExternal({ force: true });
    return;
  }
  if (cachedExternal === null) {
    await loadExternal();
  }
}

async function combinedIssues(): Promise<Issue[]> {
  await ensureExternalLoaded(false);
  if (cachedExternal) return cachedExternal;
  return localIssues();
}

export async function getDaily(_: string): Promise<IssueCard | null> {
  await ensureExternalLoaded(false);
  const externalFirst = cachedExternal && cachedExternal.length ? cachedExternal[0] : null;
  if (externalFirst) return toCard(externalFirst);
  const first = localIssues()[0];
  return first ? toCard(first) : null;
}

export async function listIssues(_: string): Promise<IssueCard[]> {
  const issues = await combinedIssues();
  return issues.map(toCard);
}

export async function getIssue(_: string, idOrSlug: string): Promise<Issue | null> {
  await ensureExternalLoaded(false);
  const pick = (arr: Issue[]) =>
    arr.find((i) => i.issueId === idOrSlug || (i as any).slug === idOrSlug) || null;

  if (cachedExternal && cachedExternal.length) {
    const hit = pick(cachedExternal);
    if (hit) return hit;
  }
  const hit = pick(localIssues());
  return hit || null;
}

export async function searchIssues(_: string, q: string): Promise<IssueCard[]> {
  const issues = await combinedIssues();
  const needle = q.trim().toLowerCase();
  if (!needle) return issues.map(toCard);
  return issues
    .filter(i =>
      (i.title?.toLowerCase().includes(needle)) ||
      (i.dek?.toLowerCase().includes(needle)) ||
      (Array.isArray(i.tags) ? i.tags : []).some(t => t.toLowerCase().includes(needle))
    )
    .map(toCard);
}

function toCard(i: Issue): IssueCard {
  return {
    issueId: i.issueId,
    title: i.title,
    dek: i.dek || "",
    tags: Array.isArray(i.tags) ? i.tags : [],
    readMinutes: i.readMinutes || 5,
    publishedAt: i.publishedAt || new Date().toISOString()
  };
}

// Optional: warm external cache on module load (non-blocking)
if (warmBeehiivCacheOnLoad) {
  ensureExternalLoaded(true).catch(() => {});
}

export function __resetContentCacheForTests(): void {
  cachedLocal = null;
  cachedExternal = null;
  externalMtime = 0;
}

export function __setBeehiivSyncForTests(fn: typeof realSyncBeehiiv | null): void {
  beehiivSync = fn ?? realSyncBeehiiv;
}
