import { generateQueries, processResults, trimPrompt } from './ai/providers.js';
import { output } from './output-manager.js';
import { SearchError, suggestSearchProvider, } from './search/providers.js';
import { cleanQuery } from './utils.js';
import { queryExpansionTemplate, systemPrompt as defaultSystemPrompt } from './prompt.js';
/**
 * Handles a single research path, managing its progress and results
 */
export class ResearchPath {
    progress;
    config;
    totalQueriesAtDepth;
    ai; // Added ai property
    constructor(config, progress) {
        this.config = config;
        this.progress = progress;
        // Pre-calculate total queries at each depth level
        this.totalQueriesAtDepth = Array(config.depth).fill(0);
        let queriesAtDepth = config.breadth;
        for (let i = 0; i < config.depth; i++) {
            this.totalQueriesAtDepth[i] = queriesAtDepth;
            queriesAtDepth = Math.ceil(queriesAtDepth / 2);
        }
        // Set total queries to sum of all depths
        this.progress.totalQueries = this.totalQueriesAtDepth.reduce((a, b) => a + b, 0);
    }
    async search(query, attempt = 0) {
        try {
            return await suggestSearchProvider({ type: 'web' }).search(query);
        }
        catch (error) {
            if (error instanceof SearchError &&
                error.code === 'RATE_LIMIT' &&
                attempt < 3) {
                const delay = 10000 * Math.pow(2, attempt); // 10s, 20s, 40s backoff
                output.log(`Rate limited at research level. Waiting ${delay / 1000}s before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.search(query, attempt + 1);
            }
            throw error;
        }
    }
    async processQuery(query, depth, breadth, learnings = [], sources = []) {
        try {
            // Search for content using privacy-focused provider
            const searchResults = await this.search(query);
            const content = searchResults
                .map(item => item.content)
                .filter((text) => !!text)
                .map(text => trimPrompt(text, 25_000));
            output.log(`Ran "${query}", found ${content.length} results`);
            // Extract and track sources
            const newSources = searchResults
                .map(item => item.source)
                .filter((source) => !!source);
            // Calculate next iteration parameters
            const newBreadth = Math.ceil(breadth / 2);
            const newDepth = depth - 1;
            // Process results using AI to extract insights
            const results = await this.ai.processResults({
                query,
                content,
                numFollowUpQuestions: newBreadth,
            });
            // Combine new findings with existing ones
            const allLearnings = [...learnings, ...results.learnings];
            const allSources = [...sources, ...newSources];
            // Update progress tracking
            this.updateProgress({
                currentDepth: depth,
                currentBreadth: breadth,
                completedQueries: this.progress.completedQueries + 1,
                currentQuery: query,
            });
            // Continue research if we haven't reached max depth
            if (newDepth > 0) {
                output.log(`Researching deeper, breadth: ${newBreadth}, depth: ${newDepth}`);
                // Use AI-generated follow-up question or create a related query
                const nextQuery = results.followUpQuestions[0] ||
                    `Tell me more about ${cleanQuery(query)}`;
                return this.processQuery(nextQuery, newDepth, newBreadth, allLearnings, allSources);
            }
            return {
                learnings: allLearnings,
                sources: allSources,
            };
        }
        catch (error) {
            if (error instanceof SearchError && error.code === 'RATE_LIMIT') {
                // Let the rate limit error propagate up to be handled by the retry mechanism
                throw error;
            }
            output.log(`Error processing query "${query}":`, error);
            // For non-rate-limit errors, return empty results but continue research
            return {
                learnings: [`Error researching: ${query}`],
                sources: [],
            };
        }
    }
    updateProgress(update) {
        Object.assign(this.progress, update);
        this.config.onProgress?.(this.progress);
    }
    async setupAI(customPrompt) {
        try {
            const aiModule = await import('./ai/providers.js');
            // Using the module directly as it contains the needed functions
            // rather than expecting a default export with an init function
            
            if (!aiModule) {
                console.error('AI providers module failed to load');
                throw new Error('AI providers module failed to load');
            }
            
            // No need to initialize the module as the functions can be used directly
            return aiModule;
        } catch (error) {
            console.error('Error initializing AI client:', error);
            throw error;
        }
    }
    async research() {
        try {
            this.ai = await this.setupAI(this.config.systemPrompt || defaultSystemPrompt());
            const { query, breadth, depth } = this.config;
        // Generate initial research queries using AI
        const queries = await this.ai.generateQueries({
            query,
            numQueries: breadth,
        });
        this.updateProgress({
            currentQuery: queries[0]?.query,
        });
        // Process queries sequentially with delay to avoid rate limits
        const results = [];
        for (const serpQuery of queries) {
            const result = await this.processQuery(serpQuery.query, depth, breadth);
            results.push(result);
            // Add delay between queries to respect rate limits
            if (queries.indexOf(serpQuery) < queries.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        // Combine and deduplicate results
        return {
            learnings: [...new Set(results.flatMap(r => r.learnings))],
            sources: [...new Set(results.flatMap(r => r.sources))],
        };
        } catch (error) {
            console.error('Error in research path execution:', error);
            return {
                learnings: [`Error researching: ${this.config.query || 'Unknown query'} - ${error.message}`],
                sources: [],
            };
        }
    }
}