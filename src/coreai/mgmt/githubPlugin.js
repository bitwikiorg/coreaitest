/**
 * ElizaOS Plugin for GitHub Research Integration
 */
import { saveResearchToGitHub, verifyGitHubConfig } from './githubIntegration.js';

export const GitHubPlugin = {
  name: 'github-research',
  version: '1.0.0',
  description: 'Integrates research output with GitHub repositories',

  /**
   * Initialize the plugin with the ElizaOS runtime
   * @param {Object} runtime - ElizaOS runtime
   */
  start: async (runtime) => {
    console.log('Starting GitHub Research Plugin');

    // Verify GitHub configuration on startup
    const isConfigValid = await verifyGitHubConfig();
    if (!isConfigValid) {
      console.warn('GitHub integration is not properly configured');
    }

    // Register handlers for research events
    if (runtime.events) {
      runtime.events.on('research-completed', async (research) => {
        try {
          const result = await saveResearchToGitHub(research);
          runtime.events.emit('research-saved-to-github', result);
        } catch (error) {
          console.error('Failed to save research to GitHub:', error);
          runtime.events.emit('research-save-error', { 
            error: error.message, 
            research: research.query 
          });
        }
      });
    }

    // Register commands if command system is available
    if (runtime.commands) {
      runtime.commands.register('github:save', async (args, context) => {
        if (!args.research) {
          return { success: false, error: 'No research data provided' };
        }

        try {
          const result = await saveResearchToGitHub(args.research);
          return { success: true, result };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      runtime.commands.register('github:status', async () => {
        const isValid = await verifyGitHubConfig();
        return { 
          success: true, 
          status: isValid ? 'configured' : 'not-configured',
          repository: process.env.GITHUB_OWNER + '/' + process.env.GITHUB_REPO
        };
      });
    }

    return { success: true };
  },

  /**
   * Cleanup when plugin is stopped
   */
  stop: () => {
    console.log('Stopping GitHub Research Plugin');
    return { success: true };
  }
};

export default GitHubPlugin;