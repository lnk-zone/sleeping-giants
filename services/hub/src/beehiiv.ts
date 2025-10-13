import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_LIMIT = 25;
const DEFAULT_STATUSES = ["sent", "published"];

export type RawBeehiivPost = {
  id: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  slug?: string;
  tags?: Array<{ name: string } | string>;
  tag_names?: string[];
  topics?: Array<{ name: string } | string>;
  reading_time?: number;                 // minutes
  words_count?: number;                  // int
  published_at?: string;                 // ISO
  created_at?: string;
  updated_at?: string;
  html?: string | null;                  // sometimes present
  body_html?: string | null;             // alt
  content_html?: string | null;          // alt
};

export type IssueCard = {
  issueId: string;
  title: string;
  dek: string;
  tags: string[];
  readMinutes: number;
  publishedAt: string;
};

export type Issue = IssueCard & {
  bodyHtml: string;
  pubId?: string;
  slug?: string | null;
  sourceId?: string;
};

type BeehiivListResp = {
  data?: RawBeehiivPost[];
  posts?: RawBeehiivPost[]; // be flexible with shape
};

type BeehiivDetailResp = {
  data?: RawBeehiivPost;
  post?: RawBeehiivPost;
};

export async function syncBeehiiv(): Promise<{ count: number; file: string }> {
  const apiUrl = process.env.BEEHIIV_API_URL || "https://api.beehiiv.com/v2";
  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey) throw new Error("Missing BEEHIIV_API_KEY");
  if (!pubId) throw new Error("Missing BEEHIIV_PUBLICATION_ID");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "X-Api-Key": apiKey,
    Accept: "application/json"
  };

  const limitRaw = Number(process.env.BEEHIIV_SYNC_LIMIT ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT;
  const statuses = parseCsv(process.env.BEEHIIV_POST_STATUSES, DEFAULT_STATUSES);
  const typeFilter = process.env.BEEHIIV_POST_TYPE?.trim();

  const collected = new Map<string, RawBeehiivPost>();

  for (const status of statuses) {
    const posts = await fetchPostList({ apiUrl, pubId, headers, limit, status, type: typeFilter });
    for (const post of posts) {
      const key = post?.id || post?.slug;
      if (!key) continue;
      if (!collected.has(key)) {
        collected.set(key, post);
      }
    }
  }

  if (collected.size === 0) {
    // fallback: try without status filter
    const posts = await fetchPostList({ apiUrl, pubId, headers, limit, type: typeFilter });
    for (const post of posts) {
      const key = post?.id || post?.slug;
      if (!key) continue;
      collected.set(key, post);
    }
  }

  const enriched = await enrichPosts(Array.from(collected.values()), { apiUrl, pubId, headers });

  // Map posts → Issues
  const mapped: Issue[] = enriched
    .map(toIssue)
    // Drop items without body
    .filter((x): x is Issue => !!x && !!x.bodyHtml);

  // Sort newest first (by publishedAt)
  mapped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Ensure data dir exists
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "../../..");
  const dataDir = path.join(repoRoot, "services", "hub", "data");
  await fs.mkdir(dataDir, { recursive: true });

  const file = path.join(dataDir, "sg-beehiiv.json");
  await fs.writeFile(file, JSON.stringify({ issues: mapped }, null, 2), "utf-8");

  console.info(`[beehiiv] synced ${mapped.length} posts -> ${file}`);

  return { count: mapped.length, file };
}

function parseCsv(input: string | undefined, fallback: string[]): string[] {
  if (!input) return fallback;
  const values = input
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return values.length ? values : fallback;
}

async function fetchPostList(opts: {
  apiUrl: string;
  pubId: string;
  headers: Record<string, string>;
  limit: number;
  status?: string;
  type?: string;
}): Promise<RawBeehiivPost[]> {
  const url = new URL(`${opts.apiUrl}/publications/${opts.pubId}/posts`);
  url.searchParams.set("order", "desc");
  url.searchParams.set("sort", "published_at");
  url.searchParams.set("limit", String(opts.limit));
  if (opts.status) url.searchParams.set("status", opts.status);
  if (opts.type) url.searchParams.set("type", opts.type);

  const res = await fetch(url, { headers: opts.headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Beehiiv posts list failed (${url.toString()}): ${res.status} ${text}`);
  }

  const json = (await res.json()) as BeehiivListResp;
  const arr = Array.isArray(json.data) ? json.data : Array.isArray(json.posts) ? json.posts : [];
  if (!Array.isArray(arr)) {
    console.warn(`[beehiiv] unexpected list response keys=${Object.keys(json ?? {}).join(",")}`);
    return [];
  }
  if (arr.length === 0) {
    console.warn(`[beehiiv] list returned 0 posts for status=${opts.status ?? "(any)"}${opts.type ? ` type=${opts.type}` : ""}`);
  }
  return arr;
}

async function enrichPosts(
  posts: RawBeehiivPost[],
  ctx: { apiUrl: string; pubId: string; headers: Record<string, string> }
): Promise<RawBeehiivPost[]> {
  const result: RawBeehiivPost[] = [];
  for (const post of posts) {
    if (post?.html || post?.body_html || post?.content_html) {
      result.push(post);
      continue;
    }
    if (!post?.id) {
      continue;
    }
    try {
      const detail = await fetchPostDetail(post.id, ctx);
      if (detail) {
        result.push({ ...post, ...detail });
      } else {
        result.push(post);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[beehiiv] detail fetch failed for ${post.id}: ${message}`);
      result.push(post);
    }
  }
  return result;
}

async function fetchPostDetail(id: string, ctx: { apiUrl: string; pubId: string; headers: Record<string, string> }): Promise<RawBeehiivPost | null> {
  const url = new URL(`${ctx.apiUrl}/publications/${ctx.pubId}/posts/${id}`);
  url.searchParams.append("expand[]", "body_html");
  url.searchParams.append("expand[]", "content_html");
  const detailRes = await fetch(url, {
    headers: ctx.headers
  });
  if (detailRes.status === 404) {
    const slugUrl = new URL(`${ctx.apiUrl}/publications/${ctx.pubId}/posts/slug/${id}`);
    slugUrl.searchParams.append("expand[]", "body_html");
    slugUrl.searchParams.append("expand[]", "content_html");
    const slugRes = await fetch(slugUrl, { headers: ctx.headers });
    if (!slugRes.ok) {
      const text = await slugRes.text().catch(() => "");
      throw new Error(`detail slug ${id}: ${slugRes.status} ${text}`);
    }
    return parseDetail(await slugRes.json());
  }
  if (!detailRes.ok) {
    const text = await detailRes.text().catch(() => "");
    throw new Error(`detail ${id}: ${detailRes.status} ${text}`);
  }
  return parseDetail(await detailRes.json());
}

function parseDetail(body: BeehiivDetailResp | RawBeehiivPost | null): RawBeehiivPost | null {
  if (!body) return null;
  if ("data" in body && body.data) return body.data;
  if ("post" in body && body.post) return body.post;
  return body as RawBeehiivPost;
}

function toIssue(p: RawBeehiivPost): Issue | null {
  const slug = p.slug?.trim() || null;
  const id = p.id?.trim() || slug;
  if (!id) return null;

  const html =
    p.html ??
    p.body_html ??
    p.content_html ??
    null;

  if (!html) {
    return null;
  }

  const title = p.title?.trim() || "Untitled";
  const dekRaw = (p.subtitle || p.summary || "").toString().trim();
  const dek = dekRaw || excerpt(html, 160);
  const tags = normaliseTags(p);
  const readMinutes = p.reading_time ||
    (p.words_count ? Math.max(1, Math.round(p.words_count / 220)) : Math.max(1, estimateReadingTime(html)));

  const publishedAt = p.published_at || p.updated_at || p.created_at || new Date().toISOString();

  return {
    issueId: id,
    slug,
    pubId: "sg",
    sourceId: p.id,
    title,
    dek,
    tags,
    readMinutes,
    publishedAt,
    bodyHtml: html
  };
}

function normaliseTags(post: RawBeehiivPost): string[] {
  if (Array.isArray(post.tag_names) && post.tag_names.length) {
    return post.tag_names.filter(Boolean).map((t) => String(t));
  }
  if (Array.isArray(post.tags) && post.tags.length) {
    return post.tags
      .map((t: any) => (typeof t === "string" ? t : t?.name))
      .filter(Boolean)
      .map((t) => String(t));
  }
  if (Array.isArray(post.topics) && post.topics.length) {
    return post.topics
      .map((t: any) => (typeof t === "string" ? t : t?.name))
      .filter(Boolean)
      .map((t) => String(t));
  }
  return [];
}

function estimateReadingTime(html: string): number {
  // strip tags, count words
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 220));
}

function excerpt(html: string, maxLen: number): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}
