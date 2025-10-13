export type PubId = string;

export type Publication = {
  id: PubId;               // "sg"
  slug: string;            // "sleeping-giants"
  name: string;            // "Sleeping Giants"
  provider: "beehiiv" | "substack" | "ghost" | "none";
  subscribe?: {
    kind: "beehiiv";
    apiKeyRef: string;     // env var name, e.g. BEEHIIV_API_KEY_SG
    publicationId?: string;
  };
  theme?: { primary?: string; accent?: string; logoUrl?: string };
};

export type IssueCard = {
  pubId: PubId;
  issueId: string;
  title: string;
  dek: string;
  tags: string[];
  readMinutes: number;
  publishedAt: string; // ISO
};

export type Issue = IssueCard & {
  bodyHtml: string; // NEW: sanitized full body for simple rendering
  sections: {
    hook: string; // sanitized HTML
    discovery: {
      name: string;
      origin: string;
      year: number;
      license: string;
      explanationHtml: string;
    };
    readyToday: {
      status: string;
      implementations: { name: string; lang: string; url: string }[];
      notesHtml: string;
    };
    applications: { title: string; bodyHtml: string }[];
    rabbitHole: { title: string; url: string }[];
  };
};
