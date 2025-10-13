/** Minimal local copy of the pub config shape (single-tenant). */
export type PubConfig = {
  id: "sg";
  name: "Sleeping Giants";
  provider: "beehiiv" | "none";
  subscribe?: {
    publicationId: string;
    apiKeyRef: string; // env var name, e.g. "BEEHIIV_API_KEY"
  };
};

/** Single-tenant SG config. Any pubId passed is ignored. */
export function requirePub(_: string | undefined): PubConfig {
  return {
    id: "sg",
    name: "Sleeping Giants",
    provider: "beehiiv",
    subscribe: {
      publicationId: process.env.BEEHIIV_PUBLICATION_ID || "",
      apiKeyRef: "BEEHIIV_API_KEY"
    }
  };
}
