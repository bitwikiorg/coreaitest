export class OutputManager {
    progressBarWidth = 20;
    spinnerStates = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    spinnerIndex = 0;
    spinnerInterval = null;
    customHandler = null;
    
    constructor() {
        this.spinnerInterval = setInterval(() => {
            this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerStates.length;
        }, 80);
    }
    
    log(...args) {
        console.log(...args);
        if (this.customHandler) {
            this.customHandler(args.join(' '));
        }
    }
    
    setHandler(handler) {
        this.customHandler = handler;
    }
    
    resetHandler() {
        this.customHandler = null;
    }
    updateProgress(progress) {
        const totalSteps = progress.totalDepth * progress.totalBreadth;
        const completedSteps = progress.completedQueries || 0;
        const percent = Math.min(100, Math.max(0, Math.round((completedSteps / totalSteps) * 100)));
        const filledLength = Math.min(this.progressBarWidth, Math.max(0, Math.round((this.progressBarWidth * percent) / 100)));
        const bar = '[' +
            '█'.repeat(filledLength) +
            '░'.repeat(this.progressBarWidth - filledLength) +
            ']';
        process.stdout.write(`\rOverall Progress: ${bar} ${percent}%\nDepth: ${progress.currentDepth}/${progress.totalDepth} | Breadth: ${progress.currentBreadth}/${progress.totalBreadth} | Queries: ${progress.completedQueries}/${progress.totalQueries}\nCurrent Query: ${progress.currentQuery || 'Initializing...'}${this.spinnerStates[this.spinnerIndex]}`);
    }
    cleanup() {
        if (this.spinnerInterval) {
            clearInterval(this.spinnerInterval);
            this.spinnerInterval = null;
        }
    }
}
export const output = new OutputManager();
