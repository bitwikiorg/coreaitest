export const VENICE_MODELS = {
    'llama-3.3-70b': {
        availableContextTokens: 65536,
        traits: ['function_calling_default', 'default'],
        modelSource: 'https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct',
    },
    'llama-3.2-3b': {
        availableContextTokens: 131072,
        traits: ['fastest'],
        modelSource: 'https://huggingface.co/meta-llama/Llama-3.2-3B',
    },
    'dolphin-2.9.2-qwen2-72b': {
        availableContextTokens: 32768,
        traits: ['most_uncensored'],
        modelSource: 'https://huggingface.co/cognitivecomputations/dolphin-2.9.2-qwen2-72b',
    },
    'llama-3.1-405b': {
        availableContextTokens: 63920,
        traits: ['most_intelligent'],
        modelSource: 'https://huggingface.co/meta-llama/Meta-Llama-3.1-405B-Instruct',
    },
    qwen32b: {
        availableContextTokens: 131072,
        traits: ['default_code'],
        modelSource: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF',
    },
    'deepseek-r1-llama-70b': {
        availableContextTokens: 65536,
        traits: [],
        modelSource: 'https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
    },
    'deepseek-r1-671b': {
        availableContextTokens: 131072,
        traits: [],
        modelSource: 'https://huggingface.co/deepseek-ai/DeepSeek-R1',
    },
};
export function isValidModel(model) {
    return model in VENICE_MODELS;
}
export function getModelSpec(model) {
    return VENICE_MODELS[model];
}
/**
 * Suggests the most appropriate Venice.ai model based on task requirements.
 *
 * @param params Task requirements
 * @param params.needsFunctionCalling - Task requires function calling capability
 * @param params.needsLargeContext - Task requires processing large amounts of text
 * @param params.needsSpeed - Task prioritizes quick responses
 * @param params.isCodeTask - Task involves code generation or analysis
 * @returns The suggested model name
 *
 * Selection logic:
 * - Code tasks → qwen32b (optimized for code)
 * - Speed priority → llama-3.2-3b (fastest model)
 * - Function calling → llama-3.3-70b (supports function API)
 * - Large context → llama-3.2-3b (131k tokens)
 * - Default → llama-3.3-70b (good general purpose)
 */
export function suggestModel(params) {
    const { needsFunctionCalling, needsLargeContext, needsSpeed, isCodeTask } = params;
    if (isCodeTask)
        return 'qwen32b';
    if (needsSpeed)
        return 'llama-3.2-3b';
    if (needsFunctionCalling)
        return 'llama-3.3-70b';
    if (needsLargeContext)
        return 'llama-3.2-3b';
    return 'llama-3.3-70b';
}
