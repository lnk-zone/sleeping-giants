import React, { useEffect, useMemo, useState } from "react";

const MCP_URL = import.meta.env.VITE_MCP_URL || "http://localhost:8787";

type IssueMeta = {
  issueId: string;
  title: string;
  dek: string;
  tags?: string[];
  readMinutes: number;
  publishedAt: string;
  pubId?: string;
};

type IssueSection = {
  hook?: string;
  discovery?: {
    name: string;
    origin: string;
    year: number;
    license: string;
    explanationHtml: string;
  };
  readyToday?: {
    status: string;
    implementations: { name: string; lang: string; url: string }[];
    notesHtml: string;
  };
  applications?: { title: string; bodyHtml: string }[];
  rabbitHole?: { title: string; url: string }[];
};

type Issue = IssueMeta & {
  bodyHtml: string;
  sections?: IssueSection;
};

type PaginatedIssues = {
  items: IssueMeta[];
  nextCursor?: number;
  total?: number;
};

type SubscribeStatus = "idle" | "ok" | "already" | "error";

type View = "spotlight" | "archive" | "search";

type ToolEndpoint = {
  name: string;
  description: string;
  path: string;
  method?: "GET" | "POST";
};

const palette = {
  background: "#0f172a",
  surface: "#111827",
  surfaceAlt: "#1f2937",
  accent: "#38bdf8",
  accentMuted: "rgba(56, 189, 248, 0.12)",
  accentBorder: "rgba(56, 189, 248, 0.4)",
  textPrimary: "#f8fafc",
  textSecondary: "#cbd5f5",
  textMuted: "#94a3b8",
  border: "rgba(148, 163, 184, 0.2)",
  chipBg: "rgba(148, 163, 184, 0.16)",
  danger: "#f87171",
  success: "#34d399"
};

const toolbelt: ToolEndpoint[] = [
  {
    name: "Get Daily Giant",
    description: "Returns the highlighted issue of the day.",
    path: "/tools/get_daily_giant"
  },
  {
    name: "List Issues",
    description: "Paginated list of issues (cursor, pageSize).",
    path: "/tools/list_issues?cursor=0&pageSize=10"
  },
  {
    name: "Search Issues",
    description: "Full-text search across titles, dek, and tags.",
    path: "/tools/search_issues?q=fft"
  },
  {
    name: "Get Issue",
    description: "Fetches a full issue by issueId (includes sections).",
    path: "/tools/get_issue?issueId=sg-00001"
  }
];

const styles = {
  app: {
    minHeight: "100vh",
    background: `linear-gradient(160deg, rgba(15,23,42,1) 0%, rgba(17,24,39,1) 40%, rgba(30,41,59,1) 100%)`,
    color: palette.textPrimary,
    fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, sans-serif",
    padding: "24px 16px 48px"
  } as React.CSSProperties,
  maxWidth: {
    maxWidth: 1024,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 24
  } as React.CSSProperties,
  header: {
    border: `1px solid ${palette.border}`,
    borderRadius: 24,
    padding: "24px 28px",
    background: `linear-gradient(160deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.92) 100%)`,
    boxShadow: "0 25px 80px rgba(15, 23, 42, 0.35)",
    display: "flex",
    flexDirection: "column",
    gap: 20
  } as React.CSSProperties,
  headerRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 16,
    alignItems: "center",
    justifyContent: "space-between"
  },
  brand: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  } as React.CSSProperties,
  brandName: {
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: 0.4
  },
  tagline: {
    color: palette.textMuted,
    fontSize: 14,
    maxWidth: 540
  },
  subscribeForm: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
    alignItems: "center"
  },
  input: {
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${palette.border}`,
    background: "rgba(15, 23, 42, 0.6)",
    color: palette.textPrimary,
    minWidth: 240
  } as React.CSSProperties,
  primaryButton: {
    padding: "10px 18px",
    borderRadius: 14,
    border: "none",
    background: palette.accent,
    color: "#031525",
    fontWeight: 600,
    cursor: "pointer"
  } as React.CSSProperties,
  subtleButton: {
    padding: "8px 16px",
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    background: "rgba(15,23,42,0.6)",
    color: palette.textSecondary,
    cursor: "pointer"
  } as React.CSSProperties,
  body: {
    display: "grid",
    gap: 24,
    gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)",
    alignItems: "start"
  } as React.CSSProperties,
  stackColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 20
  } as React.CSSProperties,
  panel: {
    background: palette.surface,
    borderRadius: 20,
    padding: 20,
    border: `1px solid ${palette.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 16
  } as React.CSSProperties,
  panelTitle: {
    fontSize: 16,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: palette.textSecondary
  } as React.CSSProperties,
  tabs: {
    display: "flex",
    gap: 8,
    padding: 4,
    background: "rgba(15, 23, 42, 0.6)",
    borderRadius: 999,
    border: `1px solid ${palette.border}`
  } as React.CSSProperties,
  tabButton: (active: boolean): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: active ? palette.accent : "transparent",
    color: active ? "#031525" : palette.textSecondary,
    fontWeight: 600,
    transition: "all 0.2s ease"
  }),
  dailyCard: {
    borderRadius: 18,
    padding: 18,
    background: "rgba(56, 189, 248, 0.08)",
    border: `1px solid ${palette.accentBorder}`,
    display: "flex",
    flexDirection: "column",
    gap: 12
  } as React.CSSProperties,
  issueCard: (active: boolean): React.CSSProperties => ({
    borderRadius: 16,
    padding: 16,
    border: `1px solid ${active ? palette.accentBorder : palette.border}`,
    background: active ? "rgba(56, 189, 248, 0.08)" : "rgba(17, 24, 39, 0.9)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    transition: "border-color 0.2s ease, transform 0.2s ease",
    transform: active ? "translateY(-1px)" : "none"
  }),
  chipRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8
  },
  chip: {
    background: palette.chipBg,
    color: palette.textSecondary,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12
  } as React.CSSProperties,
  metaRow: {
    display: "flex",
    gap: 12,
    fontSize: 12,
    color: palette.textMuted
  },
  reader: {
    background: "rgba(17, 24, 39, 0.9)",
    borderRadius: 24,
    padding: "32px 36px",
    border: `1px solid ${palette.border}`,
    boxShadow: "0 30px 80px rgba(8, 16, 33, 0.4)",
    minHeight: 520,
    display: "flex",
    flexDirection: "column",
    gap: 28
  } as React.CSSProperties,
  readerHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  } as React.CSSProperties,
  hookCard: {
    borderRadius: 16,
    padding: 18,
    background: "rgba(56, 189, 248, 0.1)",
    border: `1px solid ${palette.accentBorder}`,
    lineHeight: 1.6
  } as React.CSSProperties,
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: palette.textSecondary
  } as React.CSSProperties,
  implementations: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "rgba(15, 23, 42, 0.6)",
    borderRadius: 16,
    padding: 16,
    border: `1px solid ${palette.border}`
  } as React.CSSProperties,
  applicationsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 14
  } as React.CSSProperties,
  rabbitLinks: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  } as React.CSSProperties,
  toolButton: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: 12,
    borderRadius: 16,
    border: `1px solid ${palette.border}`,
    background: "rgba(17, 24, 39, 0.85)",
    cursor: "pointer"
  } as React.CSSProperties,
  modalBackdrop: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(2, 6, 23, 0.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 1000
  },
  modal: {
    background: "rgba(15, 23, 42, 0.98)",
    borderRadius: 20,
    border: `1px solid ${palette.border}`,
    padding: 24,
    width: "min(90vw, 720px)",
    maxHeight: "80vh",
    overflow: "auto"
  } as React.CSSProperties,
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12
  },
  modalTitle: {
    fontWeight: 600,
    fontSize: 16
  },
  modalClose: {
    border: `1px solid ${palette.border}`,
    background: "transparent",
    color: palette.textSecondary,
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer"
  },
  pre: {
    background: "rgba(9, 14, 25, 0.9)",
    border: `1px solid ${palette.border}`,
    borderRadius: 16,
    padding: 16,
    fontSize: 12,
    overflowX: "auto" as const,
    lineHeight: 1.6
  }
};

function formatDate(iso: string | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}

function IssueCardList({
  items,
  activeId,
  onSelect
}: {
  items: IssueMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!items.length) {
    return <div style={{ color: palette.textMuted, fontSize: 14 }}>No issues yet.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((item) => (
        <div
          key={item.issueId}
          style={styles.issueCard(item.issueId === activeId)}
          onClick={() => onSelect(item.issueId)}
        >
          <div style={{ fontWeight: 600 }}>{item.title}</div>
          <div style={{ color: palette.textMuted, fontSize: 13 }}>{item.dek}</div>
          <div style={styles.metaRow}>
            <span>{formatDate(item.publishedAt)}</span>
            <span>· {item.readMinutes || 5} min read</span>
          </div>
          {item.tags?.length ? (
            <div style={styles.chipRow}>
              {item.tags.slice(0, 4).map((tag) => (
                <span key={tag} style={styles.chip}>{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function HookSection({ html }: { html?: string }) {
  if (!html) return null;
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Why this matters</div>
      <div style={styles.hookCard} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function DiscoverySection({ section }: { section?: IssueSection["discovery"] }) {
  if (!section) return null;
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Discovery</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ color: palette.textSecondary, fontSize: 14 }}>
          {section.name} · {section.origin} · {section.year}
        </div>
        <div style={{ color: palette.textMuted, fontSize: 13 }}>
          License: {section.license}
        </div>
        <div dangerouslySetInnerHTML={{ __html: section.explanationHtml }} />
      </div>
    </div>
  );
}

function ReadyTodaySection({ section }: { section?: IssueSection["readyToday"] }) {
  if (!section) return null;
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Ready Today</div>
      <div style={{ color: palette.textSecondary }}>{section.status}</div>
      {section.implementations?.length ? (
        <div style={styles.implementations}>
          <div style={{ fontSize: 13, color: palette.textMuted }}>Implementation picks</div>
          {section.implementations.map((impl) => (
            <div key={impl.url} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>{impl.name}</span>
              <a href={impl.url} target="_blank" rel="noopener" style={{ color: palette.accent }}>
                {impl.lang}
              </a>
            </div>
          ))}
        </div>
      ) : null}
      {section.notesHtml ? (
        <div
          style={{ color: palette.textMuted, lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: section.notesHtml }}
        />
      ) : null}
    </div>
  );
}

function ApplicationsSection({ apps }: { apps?: IssueSection["applications"] }) {
  if (!apps?.length) return null;
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Applications</div>
      <div style={styles.applicationsGrid}>
        {apps.map((app) => (
          <div key={app.title} style={{ borderRadius: 16, border: `1px solid ${palette.border}`, padding: 16, background: "rgba(15,23,42,0.6)" }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{app.title}</div>
            <div dangerouslySetInnerHTML={{ __html: app.bodyHtml }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RabbitHoleSection({ links }: { links?: IssueSection["rabbitHole"] }) {
  if (!links?.length) return null;
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Rabbit Hole</div>
      <div style={styles.rabbitLinks}>
        {links.map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noopener" style={{ color: palette.accent }}>
            {link.title}
          </a>
        ))}
      </div>
    </div>
  );
}

function Reader({ issue, loading }: { issue: Issue | null; loading: boolean }) {
  if (loading) {
    return (
      <div style={styles.reader}>
        <div style={{ color: palette.textMuted }}>Loading the issue…</div>
      </div>
    );
  }
  if (!issue) {
    return (
      <div style={styles.reader}>
        <div style={{ color: palette.textMuted, fontSize: 16 }}>
          Choose an issue from the left to start reading inside ChatGPT.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.reader}>
      <div style={styles.readerHeader}>
        <div style={{ color: palette.textMuted, fontSize: 13 }}>
          {formatDate(issue.publishedAt)} · {issue.readMinutes || 5} min read
        </div>
        <h1 style={{ margin: 0, fontSize: 28 }}>{issue.title}</h1>
        <p style={{ margin: 0, color: palette.textSecondary }}>{issue.dek}</p>
        {issue.tags?.length ? (
          <div style={styles.chipRow}>
            {issue.tags.map((tag) => (
              <span key={tag} style={styles.chip}>{tag}</span>
            ))}
          </div>
        ) : null}
      </div>

      <HookSection html={issue.sections?.hook} />
      <DiscoverySection section={issue.sections?.discovery} />
      <ReadyTodaySection section={issue.sections?.readyToday} />
      <ApplicationsSection apps={issue.sections?.applications} />

      <div style={{ lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: issue.bodyHtml }} />

      <RabbitHoleSection links={issue.sections?.rabbitHole} />

      <div style={{ fontSize: 13, color: palette.textMuted }}>
        Continue exploring: use the archive or search to queue your next read without leaving ChatGPT.
      </div>
    </div>
  );
}

function ToolModal({
  preview,
  onClose
}: {
  preview: { name: string; payload: string } | null;
  onClose: () => void;
}) {
  if (!preview) return null;
  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitle}>{preview.name}</div>
          <button style={styles.modalClose} onClick={onClose}>Close</button>
        </div>
        <pre style={styles.pre}>{preview.payload}</pre>
      </div>
    </div>
  );
}

export default function App() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [view, setView] = useState<View>("spotlight");
  const [daily, setDaily] = useState<IssueMeta | null>(null);
  const [archive, setArchive] = useState<IssueMeta[]>([]);
  const [archiveCursor, setArchiveCursor] = useState<number | undefined>(0);
  const [archiveNext, setArchiveNext] = useState<number | undefined>(undefined);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IssueMeta[]>([]);
  const [searchCursor, setSearchCursor] = useState<number | undefined>(0);
  const [searchNext, setSearchNext] = useState<number | undefined>(undefined);
  const [searchTotal, setSearchTotal] = useState<number>(0);
  const [searchLoading, setSearchLoading] = useState(false);

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState<SubscribeStatus>("idle");
  const [subError, setSubError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [toolPreview, setToolPreview] = useState<{ name: string; payload: string } | null>(null);
  const [toolLoading, setToolLoading] = useState(false);

  const archiveHasMore = archiveNext !== undefined;
  const searchHasMore = searchNext !== undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBootstrapping(true);
        setFetchError("");
        const [dailyRes, archiveRes] = await Promise.all([
          fetch(`${MCP_URL}/tools/get_daily_giant`),
          fetch(`${MCP_URL}/tools/list_issues?cursor=0&pageSize=20`)
        ]);

        if (!dailyRes.ok) throw new Error(`Daily: ${dailyRes.status}`);
        if (!archiveRes.ok) throw new Error(`Archive: ${archiveRes.status}`);

        const dailyJson = (await dailyRes.json()) as IssueMeta | null;
        const archiveJson = (await archiveRes.json()) as PaginatedIssues;

        if (cancelled) return;
        setDaily(dailyJson);
        setArchive(archiveJson.items ?? []);
        setArchiveCursor(0);
        setArchiveNext(archiveJson.nextCursor);

        if (dailyJson?.issueId) {
          await openIssue(dailyJson.issueId, { silent: true });
        }
      } catch (err: any) {
        if (!cancelled) {
          setFetchError(err?.message || "Failed to bootstrap content");
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openIssue(issueId: string, opts?: { silent?: boolean }) {
    try {
      setReaderLoading(true);
      setFetchError("");
      setSelectedIssueId(issueId);
      const res = await fetch(`${MCP_URL}/tools/get_issue?issueId=${encodeURIComponent(issueId)}`);
      if (!res.ok) throw new Error(`Issue ${issueId}: ${res.status}`);
      const json = (await res.json()) as Issue;
      setActiveIssue(json);
      if (!opts?.silent) {
        setView("spotlight");
      }
    } catch (err: any) {
      setFetchError(err?.message || "Unable to load issue");
    } finally {
      setReaderLoading(false);
    }
  }

  async function loadMoreArchive(nextCursor?: number) {
    if (archiveLoading) return;
    try {
      setArchiveLoading(true);
      const cursor = typeof nextCursor === "number" ? nextCursor : archiveNext ?? archiveCursor ?? 0;
      const res = await fetch(`${MCP_URL}/tools/list_issues?cursor=${cursor}&pageSize=20`);
      if (!res.ok) throw new Error(`Archive ${cursor}: ${res.status}`);
      const json = (await res.json()) as PaginatedIssues;
      setArchive((prev) => (cursor === 0 ? json.items ?? [] : [...prev, ...(json.items ?? [])]));
      setArchiveCursor(cursor);
      setArchiveNext(json.nextCursor);
    } catch (err: any) {
      setFetchError(err?.message || "Unable to load more issues");
    } finally {
      setArchiveLoading(false);
    }
  }

  async function runSearch(reset = true) {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchCursor(0);
      setSearchNext(undefined);
      setSearchTotal(0);
      return;
    }
    try {
      setSearchLoading(true);
      const cursor = reset ? 0 : searchNext ?? 0;
      const res = await fetch(`${MCP_URL}/tools/search_issues?q=${encodeURIComponent(trimmed)}&cursor=${cursor}&pageSize=20`);
      if (!res.ok) throw new Error(`Search: ${res.status}`);
      const json = (await res.json()) as PaginatedIssues;
      setSearchResults((prev) => (cursor === 0 ? json.items ?? [] : [...prev, ...(json.items ?? [])]));
      setSearchCursor(cursor);
      setSearchNext(json.nextCursor);
      setSearchTotal(json.total ?? (json.items?.length ?? 0));
    } catch (err: any) {
      setFetchError(err?.message || "Search failed");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    setSubStatus("idle");
    setSubError("");
    try {
      const res = await fetch(`${MCP_URL}/tools/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent: true })
      });
      if (res.ok) {
        const data = await res.json();
        setSubStatus(data.status === "already" ? "already" : "ok");
      } else {
        const text = await res.text();
        setSubStatus("error");
        setSubError(text.slice(0, 200));
      }
    } catch (err: any) {
      setSubStatus("error");
      setSubError(err?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function previewTool(tool: ToolEndpoint) {
    try {
      setToolLoading(true);
      const res = await fetch(`${MCP_URL}${tool.path}`);
      const payload = await res.text();
      setToolPreview({ name: `${tool.method ?? "GET"} ${tool.path}`, payload });
    } catch (err: any) {
      setToolPreview({
        name: `${tool.method ?? "GET"} ${tool.path}`,
        payload: err?.message || "Failed to fetch tool"
      });
    } finally {
      setToolLoading(false);
    }
  }

  const visibleIssues = useMemo(() => {
    if (view === "archive") return archive;
    if (view === "search") return searchResults;
    return daily ? [daily, ...archive.filter((it) => it.issueId !== daily.issueId)] : archive;
  }, [archive, daily, searchResults, view]);

  return (
    <div style={styles.app}>
      <div style={styles.maxWidth}>
        <header style={styles.header}>
          <div style={styles.headerRow}>
            <div style={styles.brand}>
              <span style={styles.brandName}>Sleeping Giants</span>
              <span style={styles.tagline}>
                A ChatGPT-native reading room for the Sleeping Giants newsletter. Explore real Beehiiv posts, search the archive, and subscribe without leaving the conversation.
              </span>
            </div>
            <form style={styles.subscribeForm} onSubmit={handleSubscribe}>
              <input
                style={styles.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" style={styles.primaryButton} disabled={submitting}>
                {submitting ? "Joining…" : "Subscribe"}
              </button>
            </form>
          </div>
          {subStatus !== "idle" ? (
            <div style={{ fontSize: 13, color: subStatus === "ok" ? palette.success : subStatus === "already" ? palette.textMuted : palette.danger }}>
              {subStatus === "ok" && "Welcome aboard! Check your inbox for the next issue."}
              {subStatus === "already" && "You’re already on the Sleeping Giants list."}
              {subStatus === "error" && `Could not subscribe: ${subError}`}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: palette.textMuted }}>
              Powered by Beehiiv · We’ll never send you spam.
            </div>
          )}
        </header>

        {fetchError ? (
          <div style={{ background: palette.surfaceAlt, borderRadius: 16, padding: 16, border: `1px solid ${palette.danger}` }}>
            <div style={{ color: palette.danger, fontWeight: 600 }}>Something went wrong</div>
            <div style={{ color: palette.textMuted }}>{fetchError}</div>
          </div>
        ) : null}

        <main style={{ ...styles.body, gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 24 }}>
          <div style={styles.stackColumn}>
            <div style={{ ...styles.panel, gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={styles.panelTitle}>
                  <span>Navigate</span>
                  <span style={{ color: palette.textMuted, fontSize: 12 }}>
                    {view === "search" ? `${searchTotal} results` : `${archive.length} issues cached`}
                  </span>
                </div>
                <div style={styles.tabs}>
                  {[
                    { key: "spotlight", label: "Spotlight" },
                    { key: "archive", label: "Archive" },
                    { key: "search", label: "Search" }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      style={styles.tabButton(view === key)}
                      onClick={() => setView(key as View)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {view === "spotlight" && daily ? (
                <div style={styles.dailyCard}>
                  <div style={{ fontSize: 12, color: palette.textMuted }}>Today’s Giant</div>
                  <div style={{ fontWeight: 600, fontSize: 18 }}>{daily.title}</div>
                  <div style={{ color: palette.textSecondary, fontSize: 14 }}>{daily.dek}</div>
                  <div style={styles.metaRow}>
                    <span>{formatDate(daily.publishedAt)}</span>
                    <span>· {daily.readMinutes || 5} min read</span>
                  </div>
                  <button style={{ ...styles.primaryButton, alignSelf: "flex-start" }} onClick={() => openIssue(daily.issueId)}>
                    Read inside ChatGPT
                  </button>
                </div>
              ) : null}

              {view === "search" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input
                    style={styles.input}
                    placeholder="Search issues, tags, keywords"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runSearch(true);
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={styles.primaryButton} onClick={() => runSearch(true)} disabled={searchLoading}>
                      {searchLoading ? "Searching…" : "Search"}
                    </button>
                    <button
                      style={styles.subtleButton}
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                        setSearchNext(undefined);
                        setSearchTotal(0);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : null}

              <IssueCardList
                items={visibleIssues}
                activeId={selectedIssueId}
                onSelect={(id) => {
                  openIssue(id);
                  if (view === "search") {
                    setView("spotlight");
                  }
                }}
              />

              {view === "archive" && archiveHasMore ? (
                <button style={styles.subtleButton} onClick={() => loadMoreArchive(archiveNext)} disabled={archiveLoading}>
                  {archiveLoading ? "Loading…" : "Load more"}
                </button>
              ) : null}

              {view === "search" && searchHasMore ? (
                <button style={styles.subtleButton} onClick={() => runSearch(false)} disabled={searchLoading}>
                  {searchLoading ? "Loading…" : "More results"}
                </button>
              ) : null}
            </div>

            <div style={styles.panel}>
              <div style={styles.panelTitle}>
                <span>Developer Toolbelt</span>
                <span style={{ fontSize: 12, color: palette.textMuted }}>
                  Preview hub responses
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {toolbelt.map((tool) => (
                  <button key={tool.path} style={styles.toolButton} onClick={() => previewTool(tool)} disabled={toolLoading}>
                    <span style={{ fontWeight: 600 }}>{tool.name}</span>
                    <span style={{ fontSize: 12, color: palette.textMuted }}>{tool.description}</span>
                    <span style={{ fontSize: 11, color: palette.accent }}>{tool.method ?? "GET"} {tool.path}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Reader issue={activeIssue} loading={bootstrapping || readerLoading} />
        </main>
      </div>

      <ToolModal preview={toolPreview} onClose={() => setToolPreview(null)} />
    </div>
  );
}
