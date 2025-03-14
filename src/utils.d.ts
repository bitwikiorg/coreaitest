/**
 * Generic rate limiter for API requests
 */
export declare class RateLimiter {
    private lastRequestTime;
    private readonly minDelay;
    constructor(delayMs: number);
    waitForNextSlot(): Promise<void>;
}
/**
 * Removes common prefixes and question marks to focus on key terms
 */
export declare function cleanQuery(query: string): string;
/**
 * Ensures a directory exists, creating it if necessary
 */
export declare function ensureDir(fs: typeof import('fs/promises'), path: string): Promise<void>;
//# sourceMappingURL=utils.d.ts.map