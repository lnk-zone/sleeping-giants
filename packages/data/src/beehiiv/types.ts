export interface BeehiivAuthor {
  id?: string;
  name?: string;
  email?: string;
}

export interface BeehiivTag {
  id: string;
  name: string;
  slug?: string;
}

export interface BeehiivPost {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  web_url?: string;
  image_url?: string;
  hero_image_url?: string;
  author?: BeehiivAuthor | null;
  authors?: BeehiivAuthor[];
  html?: string;
  text?: string;
  plaintext?: string;
  preview_text?: string;
  tags?: BeehiivTag[];
  featured_image_url?: string | null;
}

export interface BeehiivPagination {
  next?: string | null;
  previous?: string | null;
  next_cursor?: string | null;
}

export interface BeehiivPostsResponse {
  data: BeehiivPost[];
  pagination?: BeehiivPagination;
  next?: string | null;
  next_cursor?: string | null;
}

export interface BeehiivClientConfig {
  apiKey: string;
  publicationId: string;
  baseUrl?: string;
  pageSize?: number;
  fetchImpl?: typeof fetch;
}

export interface FetchPostsParams {
  cursor?: string | null;
  page?: number;
}
