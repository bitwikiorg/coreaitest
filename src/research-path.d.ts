import { ResearchConfig, ResearchProgress, ResearchResult } from './deep-research.js';
/**
 * Handles a single research path, managing its progress and results
 */
export declare class ResearchPath {
    private progress;
    private config;
    private totalQueriesAtDepth;
    constructor(config: ResearchConfig, progress: ResearchProgress);
    private search;
    private processQuery;
    private updateProgress;
    research(): Promise<ResearchResult>;
}
//# sourceMappingURL=research-path.d.ts.map