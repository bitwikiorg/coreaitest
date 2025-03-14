/**
 * Generic rate limiter for API requests
 */
export class RateLimiter {
    lastRequestTime = 0;
    minDelay;
    constructor(delayMs) {
        this.minDelay = delayMs;
    }
    async waitForNextSlot() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const waitTime = Math.max(0, this.minDelay - timeSinceLastRequest);
        if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.lastRequestTime = Date.now();
    }
}
/**
 * Removes common prefixes and question marks to focus on key terms
 */
export function cleanQuery(query) {
    return query
        .replace(/^(what are |tell me about |explain |describe )/i, '')
        .replace(/\?+$/, '')
        .trim();
}
/**
 * Ensures a directory exists, creating it if necessary
 */
export async function ensureDir(fs, path) {
    try {
        await fs.access(path);
    }
    catch {
        await fs.mkdir(path, { recursive: true });
    }
}
