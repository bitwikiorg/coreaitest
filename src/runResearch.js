import { generateSummary } from './ai/providers.js';
import { ResearchEngine } from './deep-research.js';
import { output } from './output-manager.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// For file path resolution
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const researchDir = path.join(__dirname, '..', 'research');

/**
 * Run a research process with the provided parameters
 */
export async function runResearch({ query, depth = 3, breadth = 5, socket = null }) {
  try {
    const researchId = `research-${Date.now()}`;
    // If socket is provided, emit research thoughts
    const emitThought = (thought, progress = 0, stage = 'research') => {
      if (socket) {
        try {
          socket.emit('research-thought', {
            thought,
            progress,
            stage,
          });
        } catch (emitError) {
          console.error('Error emitting research thought:', emitError);
        }
      }
    };

    // Initialize the research engine
    emitThought('Initializing research engine...');
    const { ResearchEngine } = await import('./deep-research.js');

    // Create research engine with more resilient progress reporting
    const engine = new ResearchEngine({
      query,
      breadth: breadth || 3,
      depth: depth || 2,
      onProgress: (progress) => {
        // Calculate overall progress percentage
        const percent = Math.round((progress.completedQueries / progress.totalQueries) * 100) || 0;

        // Send progress updates to client if socket is provided and connected
        if (socket && socket.connected) {
          socket.emit('research-status', {
            progress: percent,
            message: progress.currentQuery 
              ? `Researching: ${progress.currentQuery}` 
              : 'Processing...',
            stage: 'researching',
          });
        }

        // Always log to console for tracking
        console.log(`Research progress: ${percent}%, Current query: ${progress.currentQuery || 'Processing...'}`);
      },
    });

    // Run the research
    console.log(`Starting research for: "${query}" (depth: ${depth || 2}, breadth: ${breadth || 3})`);
    const { learnings, sources } = await engine.research();

    // Generate summary
    console.log('Generating research summary...');
    const summary = await generateSummary({
      query,
      learnings,
    });

    // Create research result
    const research = {
      query,
      summary,
      learnings,
      sources,
      tags: [
        'research',
        query.split(' ')[0].toLowerCase(),
        'ai-generated',
      ],
      depth: depth || 2,
      breadth: breadth || 3,
      date: new Date().toISOString()
    };

    // Save research results to file automatically
    await saveResearchToFile(research);

    // Notify client if socket is still connected
    if (socket && socket.connected) {
      // Generate ID for the research
      const subject = query
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const researchId = `${subject}-${timestamp}`;

      // Update global research history 
      if (!global.researchHistory) {
        global.researchHistory = [];
      }

      // Create research object for the frontend
      const researchOutput = {
        id: researchId,
        query,
        depth: depth || 2, 
        breadth: breadth || 3,
        summary,
        learnings,
        sources,
        tags: research.tags,
        date: new Date().toISOString(),
      };

      // Add to history if not already present
      if (!global.researchHistory.some(r => r.id === researchId)) {
        global.researchHistory.unshift(researchOutput);
      }

      socket.emit('research-complete', {
        id: researchId,
        results: `Research complete for: "${query}"`,
        research: researchOutput,
      });
    }

    // Return results
    return research;
  } catch (error) {
    console.error('Error in research process:', error);

    // Try to notify client if socket is connected
    if (socket && socket.connected) {
      socket.emit('research-error', {
        message: `Error during research: ${error.message || 'Unknown error'}`,
      });
    }

    throw error;
  } finally {
    // Reset output handler
    output.resetHandler();

    // No need to remove disconnect handler as it's not defined
  }
}

/**
 * Save research results to a file
 */
async function saveResearchToFile(research) {
  try {
    // Ensure research directory exists
    await fs.mkdir(researchDir, { recursive: true });

    // Create filename
    const subject = research.query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `research-${subject}-${timestamp}.md`;

    // Create report content
    const reportContent = [
      '# Research Results',
      '----------------\n',
      '## Research Parameters',
      `- Query: ${research.query || 'Unknown'}`,
      `- Depth: ${research.depth || 2}`,
      `- Breadth: ${research.breadth || 3}`,
      `- Date: ${research.date}`,
      '',
      '## Summary',
      research.summary,
      '',
      '## Key Learnings',
      ...research.learnings.map((l, i) => `${i + 1}. ${l}`),
      '',
      '## Sources',
      ...research.sources.map(s => `- ${s}`),
      '',
      '## Tags',
      research.tags.join(', '),
    ].join('\n');

    // Write file
    const filePath = path.join(researchDir, filename);
    await fs.writeFile(filePath, reportContent);
    console.log(`Research saved to file: ${filePath}`);

    return filename;
  } catch (error) {
    console.error('Error saving research to file:', error);
    return null;
  }
}