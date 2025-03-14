import { ResearchProgress } from './deep-research.js';
export declare class OutputManager {
    private progressBarWidth;
    private spinnerStates;
    private spinnerIndex;
    private spinnerInterval;
    private customHandler;
    constructor();
    log(...args: unknown[]): void;
    setHandler(handler: (message: string) => void): void;
    resetHandler(): void;
    updateProgress(progress: ResearchProgress): void;
    cleanup(): void;
}
export declare const output: OutputManager;
//# sourceMappingURL=output-manager.d.ts.map