import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const dataDir = path.join(repoRoot, "services", "hub", "data");
const cacheFile = path.join(dataDir, "sg-beehiiv.json");

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("stale Beehiiv cache refresh repopulates external issues", async (t) => {
  process.env.BEEHIIV_CACHE_TTL_MS = "10";
  process.env.SG_DISABLE_BEEHIIV_WARMUP = "1";
  delete process.env.BEEHIIV_API_KEY;
  delete process.env.BEEHIIV_PUBLICATION_ID;

  await fs.mkdir(dataDir, { recursive: true });

  const issueOne = {
    issueId: "issue-1",
    title: "Issue One",
    bodyHtml: "<p>Old</p>",
    dek: "",
    tags: [],
    readMinutes: 5,
    publishedAt: "2020-01-01T00:00:00.000Z"
  };

  const issueTwo = {
    issueId: "issue-2",
    title: "Issue Two",
    bodyHtml: "<p>New</p>",
    dek: "",
    tags: [],
    readMinutes: 5,
    publishedAt: "2021-01-01T00:00:00.000Z"
  };

  await fs.writeFile(cacheFile, JSON.stringify({ issues: [issueOne] }, null, 2));

  await wait(25);

  t.after(async () => {
    await fs.rm(cacheFile, { force: true });
    delete process.env.BEEHIIV_CACHE_TTL_MS;
    delete process.env.BEEHIIV_API_KEY;
    delete process.env.BEEHIIV_PUBLICATION_ID;
    delete process.env.SG_DISABLE_BEEHIIV_WARMUP;
  });

  const contentModule = await import(`./content.ts?test=${Date.now()}`);

  if (typeof contentModule.__resetContentCacheForTests === "function") {
    contentModule.__resetContentCacheForTests();
  }

  let syncCalls = 0;

  contentModule.__setBeehiivSyncForTests(async () => {
    syncCalls += 1;
    await wait(30);
    await fs.writeFile(cacheFile, JSON.stringify({ issues: [issueTwo, issueOne] }, null, 2));
    return { count: 2, file: cacheFile };
  });

  t.after(() => {
    contentModule.__setBeehiivSyncForTests(null);
  });

  process.env.BEEHIIV_API_KEY = "test-key";
  process.env.BEEHIIV_PUBLICATION_ID = "test-pub";

  const before = await contentModule.listIssues("");
  assert.equal(before[0]?.issueId, "issue-1");

  await wait(50);

  const after = await contentModule.listIssues("");
  assert.equal(after[0]?.issueId, "issue-2");
  assert.ok(syncCalls >= 1);
});
