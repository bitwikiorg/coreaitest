import { output } from '../output-manager.js';
import { isValidModel, VENICE_MODELS } from './models.js';
import dotenv from 'dotenv'; // Added import for dotenv
const defaultRetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    useExponentialBackoff: true,
};
const defaultConfig = {
    baseUrl: 'https://api.venice.ai/api/v1',
    retry: defaultRetryConfig,
};
export class LLMError extends Error {
    code;
    originalError;
    constructor(code, message, originalError) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.name = 'LLMError';
    }
}
function getRateLimitInfo(headers) {
    const remaining = headers.get('x-ratelimit-remaining');
    const limit = headers.get('x-ratelimit-limit');
    const resetIn = headers.get('x-ratelimit-reset');
    if (remaining && limit && resetIn) {
        return {
            remaining: parseInt(remaining, 10),
            limit: parseInt(limit, 10),
            resetIn: parseInt(resetIn, 10),
        };
    }
    return null;
}
function isRetryableError(error) {
    if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status;
        if (status === 429 || status >= 500)
            return true;
    }
    if (error && typeof error === 'object' && 'code' in error) {
        const code = error.code;
        if (code === 'ECONNRESET' || code === 'ETIMEDOUT')
            return true;
    }
    return false;
}
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export class LLMClient {
    config;
    rateLimitInfo = null;
    constructor(config = {}) {
        // Force reload of environment variables
        dotenv.config();
        const apiKey = config.apiKey || process.env.VENICE_API_KEY;
        console.log("Venice API Key available:", !!apiKey, apiKey ? `(${apiKey.substring(0, 4)}...)` : '');
        if (!apiKey) {
            throw new LLMError('ConfigError', 'API key is required. Provide it in constructor or set VENICE_API_KEY environment variable.');
        }
        const model = config.model || process.env.VENICE_MODEL || 'llama-3.3-70b';
        if (!isValidModel(model)) {
            throw new LLMError('ConfigError', `Invalid model: ${model}. Available models: ${Object.keys(VENICE_MODELS).join(', ')}`);
        }
        this.config = {
            ...defaultConfig,
            ...config,
            apiKey,
            model,
        };
    }
    getRateLimitDelay() {
        if (this.rateLimitInfo?.resetIn) {
            return this.rateLimitInfo.resetIn * 1000 + 100;
        }
        return this.config.retry.initialDelay;
    }
    async complete(params) {
        const { system, prompt, temperature = 0.7, maxTokens = 1000 } = params;
        const retryConfig = this.config.retry;
        let lastError;
        let delay = retryConfig.initialDelay;
        const modelSpec = VENICE_MODELS[this.config.model];
        const maxContextTokens = modelSpec.availableContextTokens;
        for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
            try {
                const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.config.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: this.config.model,
                        messages: [
                            { role: 'system', content: system },
                            { role: 'user', content: prompt },
                        ],
                        temperature,
                        max_tokens: Math.min(maxTokens, maxContextTokens),
                        top_p: 0.95,
                    }),
                });
                this.rateLimitInfo = getRateLimitInfo(response.headers);
                if (!response.ok) {
                    const error = await response
                        .json()
                        .catch(() => ({ error: response.statusText }));
                    throw new LLMError('APIError', `Venice API error: ${error.error || response.statusText}`, { status: response.status, error });
                }
                const data = await response.json();
                if (!data.choices?.[0]?.message?.content) {
                    throw new LLMError('InvalidResponse', 'Invalid response format from Venice API', data);
                }
                return {
                    content: data.choices[0].message.content,
                    model: this.config.model,
                    timestamp: new Date().toISOString(),
                };
            }
            catch (error) {
                lastError = error;
                if (!isRetryableError(error)) {
                    throw error;
                }
                if (attempt === retryConfig.maxAttempts) {
                    throw new LLMError('MaxRetriesExceeded', `Failed after ${retryConfig.maxAttempts} attempts`, lastError);
                }
                if (error &&
                    typeof error === 'object' &&
                    'status' in error &&
                    error.status === 429) {
                    delay = this.getRateLimitDelay();
                    output.log(`Rate limit exceeded, waiting ${delay}ms before retry...`);
                }
                else if (retryConfig.useExponentialBackoff) {
                    delay *= 2;
                }
                await sleep(delay);
            }
        }
        throw new LLMError('UnknownError', 'An unexpected error occurred', lastError);
    }
}