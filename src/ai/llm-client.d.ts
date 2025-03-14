import { VeniceModel } from './models.js';
export interface LLMConfig {
    apiKey?: string;
    model?: VeniceModel;
    baseUrl?: string;
    retry?: RetryConfig;
}
export interface RetryConfig {
    maxAttempts: number;
    initialDelay: number;
    useExponentialBackoff: boolean;
}
export interface LLMResponse {
    content: string;
    model: VeniceModel;
    timestamp: string;
}
export interface LLMMessage {
    role: 'system' | 'user';
    content: string;
}
export declare class LLMError extends Error {
    code: string;
    originalError?: unknown | undefined;
    constructor(code: string, message: string, originalError?: unknown | undefined);
}
export declare class LLMClient {
    private config;
    private rateLimitInfo;
    constructor(config?: LLMConfig);
    private getRateLimitDelay;
    complete(params: {
        system: string;
        prompt: string;
        temperature?: number;
        maxTokens?: number;
    }): Promise<LLMResponse>;
}
//# sourceMappingURL=llm-client.d.ts.map