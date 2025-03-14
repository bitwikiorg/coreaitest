/**
 * Configuration for a research task
 */
export interface ResearchConfig {
    /** Initial query to research */
    query: string;
    /** Number of parallel research paths to explore */
    breadth: number;
    /** How deep to follow research paths */
    depth: number;
    /** Optional callback for progress updates */
    onProgress?: (progress: ResearchProgress) => void;
}
/**
 * Progress tracking for research tasks
 */
export interface ResearchProgress {
    currentDepth: number;
    totalDepth: number;
    currentBreadth: number;
    totalBreadth: number;
    totalQueries: number;
    completedQueries: number;
    currentQuery?: string;
}
/**
 * Results from a research task
 */
export interface ResearchResult {
    learnings: string[];
    sources: string[];
}
/**
 * Main research engine that coordinates research paths
 */
export declare class ResearchEngine {
    private config;
    constructor(config: ResearchConfig);
    research(): Promise<ResearchResult>;
}
//# sourceMappingURL=deep-research.d.ts.map