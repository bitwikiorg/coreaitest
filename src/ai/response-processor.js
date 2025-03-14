export class BaseProcessor {
    cleanText(text) {
        return text
            .replace(/^[\d\-\*•]+\.?\s*/, '') // Remove list markers
            .replace(/^[1-9][0-9]?\.\s*/, '') // Remove numbered list markers
            .replace(/^-\s*/, '') // Remove bullet points
            .trim();
    }
    extractLines(text) {
        return text
            .split('\n')
            .map(line => this.cleanText(line))
            .filter(line => line.length > 0);
    }
}
export class QueryProcessor extends BaseProcessor {
    process(content) {
        try {
            const questions = this.extractLines(content)
                .filter(line => line.includes('?'))
                .filter(line => line.match(/^(what|how|why|when|where|which)/i));
            if (questions.length > 0) {
                return {
                    rawContent: content,
                    success: true,
                    queries: questions.map(query => ({
                        query,
                        researchGoal: `Research and analyze: ${query.replace(/\?$/, '')}`,
                    })),
                };
            }
            const statements = this.extractLines(content).filter(line => !line.includes('?'));
            if (statements.length > 0) {
                return {
                    rawContent: content,
                    success: true,
                    queries: statements.map(statement => ({
                        query: `What are the details of ${statement}?`,
                        researchGoal: `Research and analyze: ${statement}`,
                    })),
                };
            }
            return {
                rawContent: content,
                success: false,
                error: 'No valid questions or statements found',
                queries: [],
            };
        }
        catch (error) {
            return {
                rawContent: content,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                queries: [],
            };
        }
    }
    getDefault() {
        return {
            rawContent: '',
            success: true,
            queries: [
                {
                    query: 'What are the fundamental principles involved?',
                    researchGoal: 'Research and analyze core concepts',
                },
            ],
        };
    }
}
export class LearningProcessor extends BaseProcessor {
    process(content) {
        try {
            const lines = this.extractLines(content);
            const learnings = [];
            const questions = [];
            let isLearningSection = false;
            let isQuestionSection = false;
            for (const line of lines) {
                if (line.toLowerCase().includes('key learning') ||
                    line.toLowerCase().includes('insight') ||
                    line.toLowerCase().includes('finding')) {
                    isLearningSection = true;
                    isQuestionSection = false;
                    continue;
                }
                if (line.toLowerCase().includes('follow-up') ||
                    line.toLowerCase().includes('question')) {
                    isLearningSection = false;
                    isQuestionSection = true;
                    continue;
                }
                if (line.includes('?')) {
                    questions.push(line);
                }
                else if (line.length > 20) {
                    // Minimum length for meaningful content
                    learnings.push(line);
                }
            }
            if (learnings.length === 0 && questions.length === 0) {
                for (const line of lines) {
                    if (line.includes('?')) {
                        questions.push(line);
                    }
                    else if (line.length > 20) {
                        learnings.push(line);
                    }
                }
            }
            if (learnings.length > 0 || questions.length > 0) {
                return {
                    rawContent: content,
                    success: true,
                    learnings,
                    followUpQuestions: questions,
                };
            }
            return {
                rawContent: content,
                success: false,
                error: 'No valid learnings or questions found',
                learnings: [],
                followUpQuestions: [],
            };
        }
        catch (error) {
            return {
                rawContent: content,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                learnings: [],
                followUpQuestions: [],
            };
        }
    }
    getDefault() {
        return {
            rawContent: '',
            success: true,
            learnings: [],
            followUpQuestions: [],
        };
    }
}
export class ReportProcessor extends BaseProcessor {
    process(content) {
        try {
            if (!content.trim()) {
                return {
                    rawContent: content,
                    success: false,
                    error: 'Empty content',
                    reportMarkdown: '',
                };
            }
            return {
                rawContent: content,
                success: true,
                reportMarkdown: content,
            };
        }
        catch (error) {
            return {
                rawContent: content,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                reportMarkdown: '',
            };
        }
    }
    getDefault() {
        return {
            rawContent: '',
            success: true,
            reportMarkdown: '',
        };
    }
}
