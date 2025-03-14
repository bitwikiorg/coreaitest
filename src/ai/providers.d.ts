import { LearningResult, QueryResult, ReportResult } from './response-processor.js';
type OutputType = 'query' | 'learning' | 'report';
type ProcessorResult = QueryResult | LearningResult | ReportResult;
export declare function generateOutput(params: {
    type: OutputType;
    system: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
}): Promise<{
    success: true;
    data: ProcessorResult;
} | {
    success: false;
    error: string;
}>;
export declare function trimPrompt(text: string, maxLength?: number): string;
export declare function generateQueries(params: {
    query: string;
    numQueries?: number;
    learnings?: string[];
}): Promise<Array<{
    query: string;
    researchGoal: string;
}>>;
export declare function processResults(params: {
    query: string;
    content: string[];
    numLearnings?: number;
    numFollowUpQuestions?: number;
}): Promise<{
    learnings: string[];
    followUpQuestions: string[];
}>;
export declare function generateSummary(params: {
    query: string;
    learnings: string[];
}): Promise<string>;
export {};
//# sourceMappingURL=providers.d.ts.map