
/**
 * CORE MEMORY AI
 * 
 * This module implements the central memory management system for the COREAI ecosystem.
 * It coordinates memory operations between different AI subsystems (Chat AI and Research AI)
 * by classifying, routing, retrieving, and optimizing stored memory data.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from '@octokit/rest';

// Memory types
const MEMORY_TYPES = {
  SEMANTIC: 'semantic',
  PROCEDURAL: 'procedural',
  LONG_TERM: 'long-term',
  EPISODIC: 'episodic',
  SHORT_TERM: 'short-term',
  WORKING: 'working'
};

// Memory paths configuration
const MEMORY_PATHS = {
  [MEMORY_TYPES.SEMANTIC]: 'knowledge_synthesis/semantic_learnings',
  [MEMORY_TYPES.PROCEDURAL]: 'execution_framework/procedures',
  [MEMORY_TYPES.LONG_TERM]: 'memory_management/long_term_registry.md',
  [MEMORY_TYPES.EPISODIC]: 'memory_management/episodic_memories',
  [MEMORY_TYPES.SHORT_TERM]: 'memory_management/short_term_memory.md',
  [MEMORY_TYPES.WORKING]: 'memory_management/working_memory.json'
};

// Configuration defaults
const DEFAULT_CONFIG = {
  memoryStorageLimits: {
    [MEMORY_TYPES.SHORT_TERM]: 10000, // characters
    [MEMORY_TYPES.EPISODIC]: 50000,    // characters
    [MEMORY_TYPES.WORKING]: 5000,      // characters
    [MEMORY_TYPES.SEMANTIC]: 100000,   // characters
    [MEMORY_TYPES.PROCEDURAL]: 50000,  // characters
    [MEMORY_TYPES.LONG_TERM]: 500000   // characters
  },
  aiProfiles: {
    chat: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 800,
      promptTemplate: 'chat-default'
    },
    research: {
      temperature: 0.3,
      topP: 0.8,
      maxTokens: 1500,
      promptTemplate: 'research-default'
    }
  },
  cleanupSchedule: {
    shortTerm: '0 0 * * *',      // Daily at midnight
    episodic: '0 0 * * 0',       // Weekly on Sunday
    working: '0 * * * *',        // Hourly
    longTerm: '0 0 1 * *'        // Monthly
  }
};

class CoreMemoryAI {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialized = false;
    this.githubClient = null;
    this.__dirname = path.dirname(fileURLToPath(import.meta.url));
    this.memoryBasePath = path.join(this.__dirname, '../../missions');
    
    // Memory caches
    this.memoryCache = {
      [MEMORY_TYPES.SHORT_TERM]: null,
      [MEMORY_TYPES.EPISODIC]: null,
      [MEMORY_TYPES.WORKING]: null,
      [MEMORY_TYPES.SEMANTIC]: null,
      [MEMORY_TYPES.PROCEDURAL]: null,
      [MEMORY_TYPES.LONG_TERM]: null
    };
  }

  /**
   * Initialize the memory system
   */
  async initialize() {
    console.log('Initializing CORE Memory AI system...');
    
    try {
      // Ensure memory directories exist
      this._ensureMemoryDirectories();
      
      // Initialize GitHub client for version-controlled memory
      await this._initializeGitHubClient();
      
      // Load memory caches
      await this._loadMemoryCaches();
      
      this.initialized = true;
      console.log('CORE Memory AI system initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize CORE Memory AI:', error);
      return false;
    }
  }

  /**
   * Ensure all required memory directories exist
   */
  _ensureMemoryDirectories() {
    // Create memory directories if they don't exist
    const memoriesDir = path.join(this.memoryBasePath, 'memory');
    if (!fs.existsSync(memoriesDir)) {
      fs.mkdirSync(memoriesDir, { recursive: true });
    }
    
    // Create subdirectories for each memory type
    Object.values(MEMORY_TYPES).forEach(type => {
      const typeDir = path.join(memoriesDir, type.replace('-', '_'));
      if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
      }
    });
  }

  /**
   * Initialize GitHub client for version-controlled memory
   */
  async _initializeGitHubClient() {
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      const githubRepo = process.env.GITHUB_REPO;
      const githubOwner = process.env.GITHUB_OWNER;
      
      if (!githubToken || !githubRepo || !githubOwner) {
        console.warn('GitHub credentials not fully configured. Version-controlled memory will be limited to local storage.');
        return;
      }
      
      this.githubClient = new Octokit({
        auth: githubToken
      });
      
      this.githubConfig = {
        owner: githubOwner,
        repo: githubRepo
      };
      
      console.log(`GitHub client initialized for ${githubOwner}/${githubRepo}`);
    } catch (error) {
      console.error('Failed to initialize GitHub client:', error);
      this.githubClient = null;
    }
  }

  /**
   * Load memory caches from storage
   */
  async _loadMemoryCaches() {
    try {
      // Load from local files first
      for (const type in MEMORY_TYPES) {
        const memoryType = MEMORY_TYPES[type];
        await this._loadMemoryType(memoryType);
      }
      
      // If GitHub is configured, sync with remote
      if (this.githubClient) {
        await this._syncWithGitHub();
      }
    } catch (error) {
      console.error('Error loading memory caches:', error);
    }
  }

  /**
   * Load a specific memory type from storage
   */
  async _loadMemoryType(memoryType) {
    try {
      const localPath = this._getLocalMemoryPath(memoryType);
      
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf8');
        
        // Parse JSON for working memory, keep as text for others
        if (memoryType === MEMORY_TYPES.WORKING) {
          this.memoryCache[memoryType] = JSON.parse(content);
        } else {
          this.memoryCache[memoryType] = content;
        }
        
        console.log(`Loaded ${memoryType} memory from local storage`);
      } else {
        // Initialize empty memory
        if (memoryType === MEMORY_TYPES.WORKING) {
          this.memoryCache[memoryType] = {};
        } else {
          this.memoryCache[memoryType] = '';
        }
        
        // Create the file
        this._saveMemoryType(memoryType);
        console.log(`Initialized empty ${memoryType} memory`);
      }
    } catch (error) {
      console.error(`Error loading ${memoryType} memory:`, error);
      
      // Initialize with empty values on error
      if (memoryType === MEMORY_TYPES.WORKING) {
        this.memoryCache[memoryType] = {};
      } else {
        this.memoryCache[memoryType] = '';
      }
    }
  }

  /**
   * Save a specific memory type to storage
   */
  async _saveMemoryType(memoryType) {
    try {
      const localPath = this._getLocalMemoryPath(memoryType);
      const content = this.memoryCache[memoryType];
      
      // Convert to string for file storage
      const dataToWrite = memoryType === MEMORY_TYPES.WORKING 
        ? JSON.stringify(content, null, 2) 
        : content;
      
      fs.writeFileSync(localPath, dataToWrite, 'utf8');
      console.log(`Saved ${memoryType} memory to local storage`);
      
      // Push to GitHub if configured
      if (this.githubClient) {
        await this._pushMemoryToGitHub(memoryType);
      }
      
      return true;
    } catch (error) {
      console.error(`Error saving ${memoryType} memory:`, error);
      return false;
    }
  }

  /**
   * Get the local file path for a memory type
   */
  _getLocalMemoryPath(memoryType) {
    const fileName = memoryType === MEMORY_TYPES.WORKING 
      ? 'working_memory.json' 
      : `${memoryType.replace('-', '_')}_memory.md`;
    
    return path.join(this.memoryBasePath, 'memory', memoryType.replace('-', '_'), fileName);
  }

  /**
   * Sync memory with GitHub repository
   */
  async _syncWithGitHub() {
    if (!this.githubClient) return;
    
    try {
      console.log('Syncing memories with GitHub...');
      
      // Pull latest memories from GitHub
      await this._pullMemoriesFromGitHub();
      
      // Push local changes to GitHub
      for (const type in MEMORY_TYPES) {
        const memoryType = MEMORY_TYPES[type];
        // Skip working memory as it's session-based
        if (memoryType !== MEMORY_TYPES.WORKING) {
          await this._pushMemoryToGitHub(memoryType);
        }
      }
      
      console.log('Memory sync with GitHub completed');
    } catch (error) {
      console.error('Error syncing with GitHub:', error);
    }
  }

  /**
   * Pull memories from GitHub repository
   */
  async _pullMemoriesFromGitHub() {
    if (!this.githubClient) return;
    
    try {
      // For each memory type that's version-controlled
      for (const type of [MEMORY_TYPES.LONG_TERM, MEMORY_TYPES.SEMANTIC, 
                          MEMORY_TYPES.PROCEDURAL, MEMORY_TYPES.EPISODIC]) {
        const remotePath = MEMORY_PATHS[type];
        
        // Get content from GitHub
        const response = await this.githubClient.repos.getContent({
          ...this.githubConfig,
          path: remotePath,
        });
        
        if (Array.isArray(response.data)) {
          // Directory of files
          for (const file of response.data) {
            if (file.type === 'file' && file.name.endsWith('.md')) {
              const contentResponse = await this.githubClient.repos.getContent({
                ...this.githubConfig,
                path: file.path,
              });
              
              const content = Buffer.from(contentResponse.data.content, 'base64').toString();
              
              // Update memory cache with this content
              if (this.memoryCache[type]) {
                this.memoryCache[type] += '\n\n' + content;
              } else {
                this.memoryCache[type] = content;
              }
            }
          }
        } else if (response.data && response.data.content) {
          // Single file
          const content = Buffer.from(response.data.content, 'base64').toString();
          this.memoryCache[type] = content;
        }
        
        // Save to local storage
        await this._saveMemoryType(type);
      }
      
      console.log('Successfully pulled memories from GitHub');
    } catch (error) {
      console.error('Error pulling memories from GitHub:', error);
    }
  }

  /**
   * Push a memory type to GitHub repository
   */
  async _pushMemoryToGitHub(memoryType) {
    if (!this.githubClient || memoryType === MEMORY_TYPES.WORKING) return;
    
    try {
      const remotePath = MEMORY_PATHS[memoryType];
      const content = this.memoryCache[memoryType];
      
      // Check if file exists on GitHub
      try {
        const response = await this.githubClient.repos.getContent({
          ...this.githubConfig,
          path: remotePath,
        });
        
        // Update existing file
        await this.githubClient.repos.createOrUpdateFileContents({
          ...this.githubConfig,
          path: remotePath,
          message: `Update ${memoryType} memory`,
          content: Buffer.from(content).toString('base64'),
          sha: response.data.sha
        });
      } catch (error) {
        // File doesn't exist, create it
        if (error.status === 404) {
          await this.githubClient.repos.createOrUpdateFileContents({
            ...this.githubConfig,
            path: remotePath,
            message: `Create ${memoryType} memory`,
            content: Buffer.from(content).toString('base64')
          });
        } else {
          throw error;
        }
      }
      
      console.log(`Successfully pushed ${memoryType} memory to GitHub`);
    } catch (error) {
      console.error(`Error pushing ${memoryType} memory to GitHub:`, error);
    }
  }

  /**
   * Retrieve memory for a specific AI system and query
   * @param {string} aiSystem - 'chat' or 'research'
   * @param {string} query - The user's query
   * @returns {Object} - Memory package tailored for the AI system
   */
  async retrieveMemory(aiSystem, query) {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log(`Retrieving memory for ${aiSystem} AI with query: "${query}"`);
      
      let memoryPackage = {};
      
      if (aiSystem === 'chat') {
        // For chat AI: short-term, episodic, and working memory
        memoryPackage = {
          shortTerm: this.memoryCache[MEMORY_TYPES.SHORT_TERM],
          episodic: this._retrieveRelevantEpisodicMemory(query),
          working: this.memoryCache[MEMORY_TYPES.WORKING]
        };
      } else if (aiSystem === 'research') {
        // For research AI: semantic, procedural, and long-term memory
        memoryPackage = {
          semantic: this._retrieveRelevantSemanticMemory(query),
          procedural: this._retrieveRelevantProceduralMemory(query),
          longTerm: this._retrieveRelevantLongTermMemory(query)
        };
      } else {
        throw new Error(`Unknown AI system: ${aiSystem}`);
      }
      
      return {
        success: true,
        memory: memoryPackage,
        profile: this.config.aiProfiles[aiSystem]
      };
    } catch (error) {
      console.error('Error retrieving memory:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store new memory
   * @param {string} aiSystem - 'chat' or 'research'
   * @param {string} memoryType - Type of memory to store
   * @param {string|Object} content - Memory content
   * @returns {Object} - Success status
   */
  async storeMemory(aiSystem, memoryType, content) {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log(`Storing ${memoryType} memory for ${aiSystem} AI`);
      
      if (!Object.values(MEMORY_TYPES).includes(memoryType)) {
        throw new Error(`Unknown memory type: ${memoryType}`);
      }
      
      // Format content based on memory type
      let formattedContent = content;
      
      if (memoryType === MEMORY_TYPES.WORKING) {
        // Working memory is stored as an object
        if (typeof content === 'string') {
          try {
            formattedContent = JSON.parse(content);
          } catch (e) {
            formattedContent = { data: content };
          }
        }
        this.memoryCache[memoryType] = formattedContent;
      } else {
        // Other memory types are stored as text
        if (typeof content !== 'string') {
          formattedContent = JSON.stringify(content, null, 2);
        }
        
        // Append to existing memory with timestamp
        const timestamp = new Date().toISOString();
        const entry = `\n\n## Memory Entry [${timestamp}]\n\n${formattedContent}`;
        
        // Check if we need to consolidate due to size limits
        const currentSize = this.memoryCache[memoryType] ? this.memoryCache[memoryType].length : 0;
        const newSize = currentSize + entry.length;
        
        if (newSize > this.config.memoryStorageLimits[memoryType]) {
          await this._consolidateMemory(memoryType);
        }
        
        // Append new content
        this.memoryCache[memoryType] = (this.memoryCache[memoryType] || '') + entry;
      }
      
      // Save to storage
      await this._saveMemoryType(memoryType);
      
      return {
        success: true,
        message: `Memory stored successfully in ${memoryType}`
      };
    } catch (error) {
      console.error('Error storing memory:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Consolidate memory to stay within size limits
   */
  async _consolidateMemory(memoryType) {
    try {
      console.log(`Consolidating ${memoryType} memory to stay within size limits`);
      
      const content = this.memoryCache[memoryType];
      
      if (!content) return;
      
      // Split into entries
      const entries = content.split(/\n\n## Memory Entry \[/);
      
      if (entries.length <= 1) return;
      
      // Keep most recent entries
      const numEntriesToKeep = Math.max(1, Math.floor(entries.length / 2));
      const recentEntries = entries.slice(-numEntriesToKeep);
      
      // Rejoin with proper headers
      let consolidatedContent = recentEntries[0].startsWith('20') 
        ? '## Memory Entry [' + recentEntries[0]
        : recentEntries[0];
      
      for (let i = 1; i < recentEntries.length; i++) {
        consolidatedContent += '\n\n## Memory Entry [' + recentEntries[i];
      }
      
      // Update memory cache
      this.memoryCache[memoryType] = consolidatedContent;
      
      // Add consolidation note
      const timestamp = new Date().toISOString();
      const note = `\n\n## System Note [${timestamp}]\nMemory consolidated to stay within size limits. Older entries have been archived.`;
      
      this.memoryCache[memoryType] += note;
      
      console.log(`${memoryType} memory consolidated successfully`);
    } catch (error) {
      console.error(`Error consolidating ${memoryType} memory:`, error);
    }
  }

  /**
   * Retrieve relevant episodic memory based on query
   */
  _retrieveRelevantEpisodicMemory(query) {
    // Simple implementation - return all episodic memory
    // In a production system, this would use semantic search or embeddings
    return this.memoryCache[MEMORY_TYPES.EPISODIC] || '';
  }

  /**
   * Retrieve relevant semantic memory based on query
   */
  _retrieveRelevantSemanticMemory(query) {
    // Simple implementation - return all semantic memory
    // In a production system, this would use semantic search or embeddings
    return this.memoryCache[MEMORY_TYPES.SEMANTIC] || '';
  }

  /**
   * Retrieve relevant procedural memory based on query
   */
  _retrieveRelevantProceduralMemory(query) {
    // Simple implementation - return all procedural memory
    // In a production system, this would use semantic search or embeddings
    return this.memoryCache[MEMORY_TYPES.PROCEDURAL] || '';
  }

  /**
   * Retrieve relevant long-term memory based on query
   */
  _retrieveRelevantLongTermMemory(query) {
    // Simple implementation - return all long-term memory
    // In a production system, this would use semantic search or embeddings
    return this.memoryCache[MEMORY_TYPES.LONG_TERM] || '';
  }

  /**
   * Load system prompt for an AI system
   */
  async loadSystemPrompt(aiSystem) {
    try {
      const profileName = this.config.aiProfiles[aiSystem].promptTemplate;
      
      // Import prompt manager
      const promptManager = await import('../coreai/mgmt/promptManager.js');
      
      // Get the prompt
      const prompt = await promptManager.loadPrompt(aiSystem, profileName);
      
      return prompt || '';
    } catch (error) {
      console.error('Error loading system prompt:', error);
      return '';
    }
  }

  /**
   * Run maintenance tasks (cleanup, consolidation)
   */
  async runMaintenance() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('Running memory maintenance tasks...');
      
      // Consolidate each memory type if needed
      for (const type in MEMORY_TYPES) {
        const memoryType = MEMORY_TYPES[type];
        
        // Skip working memory as it's transient
        if (memoryType !== MEMORY_TYPES.WORKING) {
          const currentSize = this.memoryCache[memoryType] ? this.memoryCache[memoryType].length : 0;
          
          // If memory is getting large (over 75% of limit), consolidate
          if (currentSize > this.config.memoryStorageLimits[memoryType] * 0.75) {
            await this._consolidateMemory(memoryType);
          }
        }
      }
      
      // Sync with GitHub if configured
      if (this.githubClient) {
        await this._syncWithGitHub();
      }
      
      console.log('Memory maintenance completed successfully');
      return true;
    } catch (error) {
      console.error('Error during memory maintenance:', error);
      return false;
    }
  }
}

// Export singleton instance
let coreMemoryAI = null;

export async function getCoreMemoryAI(config = {}) {
  if (!coreMemoryAI) {
    coreMemoryAI = new CoreMemoryAI(config);
    await coreMemoryAI.initialize();
  }
  return coreMemoryAI;
}

export default CoreMemoryAI;
