// services/hub/src/index.ts
import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { requirePub } from "./pubs.js";
import { listIssues, getIssue as getIssueFromStore, getDaily, searchIssues } from "./content.js";
import { sanitize } from "./sanitize.js";
import { syncBeehiiv } from "./beehiiv.js";


const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/healthz", async () => ({ ok: true }));

// Today’s card (single-tenant; pubId ignored if provided)
app.get("/tools/get_daily_giant", async (_req, reply) => {
  const card = await getDaily("sg");
  if (!card) return reply.code(404).send({ error: "NO_DAILY_CONTENT" });
  return card;
});

// Full issue (sanitized bodyHtml)
app.get("/tools/get_issue", async (req, reply) => {
  const schema = z.object({
    issueId: z.string().optional(),
    slug: z.string().optional(),
    // kept for backward-compat but ignored
    pubId: z.string().optional()
  });
  const q = schema.parse((req as any).query ?? {});
  const idOrSlug = q.issueId ?? q.slug;
  if (!idOrSlug) return reply.code(400).send({ error: "MISSING_ID_OR_SLUG" });

  const issue = await getIssueFromStore("sg", idOrSlug);
  if (!issue) return reply.code(404).send({ error: "NOT_FOUND" });

  try {
    if (issue.sections) {
      if (issue.sections.hook) {
        issue.sections.hook = sanitize(issue.sections.hook);
      }
      if (issue.sections.discovery?.explanationHtml) {
        issue.sections.discovery.explanationHtml = sanitize(issue.sections.discovery.explanationHtml);
      }
      if (issue.sections.readyToday?.notesHtml) {
        issue.sections.readyToday.notesHtml = sanitize(issue.sections.readyToday.notesHtml);
      }
      if (Array.isArray(issue.sections.applications)) {
        issue.sections.applications = issue.sections.applications.map(
          (a: { title: string; bodyHtml: string }) => ({
            ...a,
            bodyHtml: sanitize(a.bodyHtml)
          })
        );
      }
    }
    issue.bodyHtml = sanitize(issue.bodyHtml);
  } catch (e) {
    req.log.error({ e }, "SANITIZATION_FAILED");
    return reply.code(500).send({ error: "SANITIZATION_FAILED" });
  }

  return issue;
});

// List (cursor pagination)
app.get("/tools/list_issues", async (req) => {
  const schema = z.object({
    tag: z.string().optional(),
    cursor: z.coerce.number().optional().default(0),
    pageSize: z.coerce.number().optional().default(10),
    pubId: z.string().optional() // ignored
  });
  const q = schema.parse((req as any).query ?? {});

  let items = await listIssues("sg");
  if (q.tag) items = items.filter(i => i.tags.includes(q.tag!));
  const start = q.cursor;
  const end = Math.min(items.length, start + q.pageSize);
  const page = items.slice(start, end);
  const nextCursor = end < items.length ? end : undefined;
  return { items: page, nextCursor };
});

// Search
app.get("/tools/search_issues", async (req) => {
  const schema = z.object({
    q: z.string().optional(),
    cursor: z.coerce.number().optional().default(0),
    pageSize: z.coerce.number().optional().default(10),
    pubId: z.string().optional() // ignored
  });
  const q = schema.parse((req as any).query ?? {});
  const results = await searchIssues("sg", q.q ?? "");
  const start = q.cursor;
  const end = Math.min(results.length, start + q.pageSize);
  const page = results.slice(start, end);
  const nextCursor = end < results.length ? end : undefined;
  return { items: page, nextCursor, total: results.length };
});

// Subscribe (Beehiiv; single-tenant)
app.post("/tools/subscribe", async (req, reply) => {
  const schema = z.object({
    email: z.string().email(),
    consent: z.boolean().default(true),
    pubId: z.string().optional() // ignored
  });
  const body = schema.parse((req as any).body ?? {});
  const pub = requirePub("sg");

  if (pub.provider !== "beehiiv" || !pub.subscribe?.publicationId || !pub.subscribe?.apiKeyRef) {
    return reply.code(500).send({ error: "SUBSCRIBE_PROVIDER_NOT_CONFIGURED" });
  }

  const apiKey = process.env[pub.subscribe.apiKeyRef];
  const apiUrl = process.env.BEEHIIV_API_URL || "https://api.beehiiv.com/v2";
  if (!apiKey) return reply.code(500).send({ error: "SUBSCRIBE_PROVIDER_KEY_MISSING" });

  try {
    // Beehiiv v2: POST /publications/:publicationId/subscriptions
    const res = await fetch(`${apiUrl}/publications/${pub.subscribe.publicationId}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        email: body.email,
        // Optional:
        // reactivate_existing: true,
        // send_welcome_email: true,
        utm_source: "chatgpt_app",
        utm_medium: pub.id,
        referring_site: "chatgpt_app"
      })
    });

    if (res.status === 409) return { status: "already", pubId: pub.id };
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return reply.code(502).send({ error: "SUBSCRIBE_PROVIDER_ERROR", detail: detail?.slice(0, 500) ?? "" });
    }
    return { status: "ok", pubId: pub.id };
  } catch (err: any) {
    req.log.error({ err }, "subscribe failed");
    return reply.code(502).send({ error: "SUBSCRIBE_NETWORK_ERROR" });
  }
});

// Admin: trigger Beehiiv → cache sync
app.post("/admin/sync_beehiiv", async (req, reply) => {
  const key = (req.headers["x-admin-key"] as string) || "";
  if (!process.env.SG_ADMIN_KEY || key !== process.env.SG_ADMIN_KEY) {
    return reply.code(401).send({ error: "UNAUTHORIZED" });
  }
  try {
    const { count, file } = await syncBeehiiv();
    return { ok: true, count, file };
  } catch (err: any) {
    req.log.error({ err }, "sync_beehiiv failed");
    return reply.code(502).send({ error: "SYNC_FAILED", detail: (err?.message || "").slice(0, 300) });
  }
});


const port = Number(process.env.PORT ?? 8787);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
