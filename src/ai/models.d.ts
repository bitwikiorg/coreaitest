/**
 * Traits that describe a model's capabilities and characteristics.
 * These help in selecting the most appropriate model for different tasks.
 */
export type ModelTrait = 'function_calling_default' | 'default' | 'fastest' | 'most_uncensored' | 'most_intelligent' | 'default_code';
/**
 * Specification for a Venice.ai model, including its capabilities and source.
 */
export interface ModelSpec {
    availableContextTokens: number;
    traits: readonly ModelTrait[];
    modelSource: string;
}
export declare const VENICE_MODELS: {
    readonly 'llama-3.3-70b': {
        readonly availableContextTokens: 65536;
        readonly traits: readonly ["function_calling_default", "default"];
        readonly modelSource: "https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct";
    };
    readonly 'llama-3.2-3b': {
        readonly availableContextTokens: 131072;
        readonly traits: readonly ["fastest"];
        readonly modelSource: "https://huggingface.co/meta-llama/Llama-3.2-3B";
    };
    readonly 'dolphin-2.9.2-qwen2-72b': {
        readonly availableContextTokens: 32768;
        readonly traits: readonly ["most_uncensored"];
        readonly modelSource: "https://huggingface.co/cognitivecomputations/dolphin-2.9.2-qwen2-72b";
    };
    readonly 'llama-3.1-405b': {
        readonly availableContextTokens: 63920;
        readonly traits: readonly ["most_intelligent"];
        readonly modelSource: "https://huggingface.co/meta-llama/Meta-Llama-3.1-405B-Instruct";
    };
    readonly qwen32b: {
        readonly availableContextTokens: 131072;
        readonly traits: readonly ["default_code"];
        readonly modelSource: "https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF";
    };
    readonly 'deepseek-r1-llama-70b': {
        readonly availableContextTokens: 65536;
        readonly traits: readonly [];
        readonly modelSource: "https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-70B";
    };
    readonly 'deepseek-r1-671b': {
        readonly availableContextTokens: 131072;
        readonly traits: readonly [];
        readonly modelSource: "https://huggingface.co/deepseek-ai/DeepSeek-R1";
    };
};
export type VeniceModel = keyof typeof VENICE_MODELS;
export declare function isValidModel(model: string): model is VeniceModel;
export declare function getModelSpec(model: VeniceModel): ModelSpec;
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
export declare function suggestModel(params: {
    needsFunctionCalling?: boolean;
    needsLargeContext?: boolean;
    needsSpeed?: boolean;
    isCodeTask?: boolean;
}): VeniceModel;
//# sourceMappingURL=models.d.ts.map