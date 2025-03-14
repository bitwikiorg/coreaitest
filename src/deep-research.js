import { output } from './output-manager.js';
import { ResearchPath } from './research-path.js';
import { systemPrompt as defaultSystemPrompt, queryExpansionTemplate } from './prompt.js';
/**
 * Main research engine that coordinates research paths
 */
export class ResearchEngine {
    config;
    constructor(config) {
        this.config = config;
    }

    /**
     * Get the research system prompt
     * @returns {Promise<string>} System prompt
     */
    async getResearchPrompt() {
        try {
            const promptManager = await import('./coreai/mgmt/promptManager.js');

            // Check if we already have an active prompt
            let prompt = promptManager.getActivePrompt('research');

            // If no active prompt, try to load it
            if (!prompt) {
                const selectedPath = promptManager.getSelectedPromptPath('research');
                prompt = await promptManager.loadPrompt('research', selectedPath);
            }

            return prompt || defaultSystemPrompt();
        } catch (error) {
            console.error('Error loading research prompt:', error);
            return defaultSystemPrompt();
        }
    }

    async research() {
        try {
            // Initialize progress tracking
            const progress = {
                currentDepth: this.config.depth,
                totalDepth: this.config.depth,
                currentBreadth: this.config.breadth,
                totalBreadth: this.config.breadth,
                totalQueries: 0,
                completedQueries: 0,
            };

            // Get the system prompt
            if (typeof this.getResearchPrompt === 'function') {
                this.config.systemPrompt = await this.getResearchPrompt();
            }

            // Create and start research path
            const path = new ResearchPath(this.config, progress);
            return await path.research();
        }
        catch (error) {
            output.log('Error in research:', error);
            return {
                learnings: [`Research attempted on: ${this.config.query}`],
                sources: [],
            };
        }
    }
}