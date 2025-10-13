import {
  type BeehiivClientConfig,
  type BeehiivPost,
  type BeehiivPostsResponse,
  type FetchPostsParams,
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.beehiiv.com/v2';
const DEFAULT_PAGE_SIZE = 50;

const isCursorPagination = (response: BeehiivPostsResponse): boolean =>
  Boolean(response.next_cursor ?? response.pagination?.next_cursor ?? response.next);

export class BeehiivClient {
  private readonly apiKey: string;
  private readonly publicationId: string;
  private readonly baseUrl: string;
  private readonly pageSize: number;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(config: BeehiivClientConfig) {
    this.apiKey = config.apiKey;
    this.publicationId = config.publicationId;
    const fetchImpl = config.fetchImpl ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error('Fetch API is not available in this environment. Provide fetchImpl.');
    }

    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.pageSize = config.pageSize ?? DEFAULT_PAGE_SIZE;
    this.fetchImpl = fetchImpl;
  }

  private buildUrl(params: FetchPostsParams = {}): URL {
    const url = new URL(
      `${this.baseUrl.replace(/\/$/, '')}/publications/${this.publicationId}/posts`,
    );
    url.searchParams.set('limit', String(this.pageSize));
    if (params.cursor) {
      url.searchParams.set('cursor', params.cursor);
    }
    if (params.page) {
      url.searchParams.set('page', String(params.page));
    }

    return url;
  }

  private async request(url: URL): Promise<BeehiivPostsResponse> {
    const response = await this.fetchImpl(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-ApiKey': this.apiKey,
      },
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(`Beehiiv request failed (${response.status}): ${message}`);
    }

    return (await response.json()) as BeehiivPostsResponse;
  }

  async fetchAllPosts(): Promise<BeehiivPost[]> {
    const posts: BeehiivPost[] = [];
    let cursor: string | null | undefined;
    let page = 1;

    do {
      const url = this.buildUrl({ cursor: cursor ?? undefined, page });
      const response = await this.request(url);
      posts.push(...response.data);

      if (isCursorPagination(response)) {
        cursor = response.next_cursor ?? response.pagination?.next_cursor ?? response.next ?? null;
        page += 1;
      } else if (response.pagination?.next) {
        cursor = response.pagination.next;
        page += 1;
      } else if (response.data.length === this.pageSize) {
        page += 1;
        cursor = null;
      } else {
        cursor = null;
      }
    } while (cursor);

    return posts;
  }
}
