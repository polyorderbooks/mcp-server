/**
 * Thin HTTP client for the PolyOrderbooks REST API.
 *
 * Kept separate from the tool definitions so the tools stay readable: they
 * describe intent, this handles auth, query building and error shape.
 */

const DEFAULT_BASE_URL = 'https://api.polyorderbooks.com';

export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
        readonly retryAfter?: number
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export class PolyOrderbooksClient {
    private readonly baseUrl: string;

    constructor(
        private readonly apiKey: string,
        baseUrl = process.env.POLYORDERBOOKS_BASE_URL ?? DEFAULT_BASE_URL
    ) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    async get<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
        const url = new URL(this.baseUrl + path);
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, String(value));
            }
        }

        const res = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'X-API-Key': this.apiKey,
                'User-Agent': 'polyorderbooks-mcp/0.1.0'
            }
        });

        if (!res.ok) {
            let message = res.statusText;
            try {
                const body = (await res.json()) as { message?: string; error?: string };
                message = body.message ?? body.error ?? message;
            } catch {
                // non-JSON error body; the status line is all we have
            }
            // Retry-After is the only thing a caller can act on at a 429.
            const retryAfter = Number(res.headers.get('Retry-After')) || undefined;
            throw new ApiError(res.status, message, retryAfter);
        }

        return (await res.json()) as T;
    }
}

/** Turn an error into something a model can act on rather than a stack trace. */
export function describeError(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.status === 401) {
            return 'Authentication failed. Check POLYORDERBOOKS_API_KEY — get a free key at https://polyorderbooks.com/signup';
        }
        if (err.status === 404) {
            return `Not found: ${err.message}. Market slugs look like "btc-updown-5m-1787551200"; use search_markets to find valid ones.`;
        }
        if (err.status === 429) {
            const wait = err.retryAfter ? ` Retry after ${err.retryAfter}s.` : '';
            return `Rate limited.${wait} Plan limits are at https://polyorderbooks.com/pricing`;
        }
        if (err.status === 403) {
            return `Not available on your plan: ${err.message}. See https://polyorderbooks.com/pricing`;
        }
        return `API error ${err.status}: ${err.message}`;
    }
    return err instanceof Error ? err.message : String(err);
}
