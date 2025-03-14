export interface ProcessedResult {
    rawContent: string;
    success: boolean;
    error?: string;
}
export declare abstract class BaseProcessor<T extends ProcessedResult> {
    protected cleanText(text: string): string;
    protected extractLines(text: string): string[];
    abstract process(content: string): T;
    abstract getDefault(): T;
}
export interface QueryResult extends ProcessedResult {
    queries: Array<{
        query: string;
        researchGoal: string;
    }>;
}
export declare class QueryProcessor extends BaseProcessor<QueryResult> {
    process(content: string): QueryResult;
    getDefault(): QueryResult;
}
export interface LearningResult extends ProcessedResult {
    learnings: string[];
    followUpQuestions: string[];
}
export declare class LearningProcessor extends BaseProcessor<LearningResult> {
    process(content: string): LearningResult;
    getDefault(): LearningResult;
}
export interface ReportResult extends ProcessedResult {
    reportMarkdown: string;
}
export declare class ReportProcessor extends BaseProcessor<ReportResult> {
    process(content: string): ReportResult;
    getDefault(): ReportResult;
}
//# sourceMappingURL=response-processor.d.ts.map