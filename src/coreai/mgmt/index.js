
/**
 * COREAI Management System - GitHub Integration
 * 
 * This module provides integration between the research system and GitHub
 * for storing and managing research outputs.
 */

export { 
  saveFileToGitHub,
  saveResearchToGitHub,
  verifyGitHubConfig
} from './githubIntegration';

export {
  saveResearchToFileWithGitHub,
  checkGitHubIntegration,
  initializeScheduledSync
} from './researchAdapter';

export { GitHubPlugin } from './githubPlugin';

// Default export for easy importing
export default {
  GitHubPlugin,
  
  // Verify GitHub configuration is valid
  verifyConfig: async () => {
    const { verifyGitHubConfig } = await import('./githubIntegration');
    return await verifyGitHubConfig();
  },
  
  // Initialize integration
  initialize: async () => {
    const { checkGitHubIntegration, initializeScheduledSync } = await import('./researchAdapter');
    const config = checkGitHubIntegration();
    
    if (!config.isConfigured) {
      console.warn(`GitHub integration not fully configured. Missing: ${config.missingConfig.join(', ')}`);
      return { success: false, missingConfig: config.missingConfig };
    }
    
    // Start scheduled sync if configured
    const syncScheduler = initializeScheduledSync();
    
    return { 
      success: true, 
      message: 'GitHub integration initialized successfully',
      scheduler: syncScheduler
    };
  }
};
