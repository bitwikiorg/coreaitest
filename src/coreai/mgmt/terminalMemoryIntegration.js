
/**
 * Terminal Memory Integration
 * 
 * This module integrates the CORE Memory AI system with the terminal interface.
 * It allows the terminal to access and manage memories through the CORE Memory AI.
 */

import { getCoreMemoryAI } from '../../memory/core-memory-ai.js';
import { getVeniceMemoryClient } from '../../memory/venice-memory-client.js';

/**
 * Process a memory-related command from the terminal
 * @param {string} command - The command
 * @param {Object} args - Command arguments
 * @returns {Promise<Object>} - Command result
 */
export async function processMemoryCommand(command, args) {
  try {
    // Initialize memory AI if needed
    const coreMemoryAI = await getCoreMemoryAI();
    
    if (!coreMemoryAI.initialized) {
      return {
        success: false,
        message: 'Memory system not initialized. Try again later.'
      };
    }
    
    // Process based on command
    switch (command) {
      case 'recall':
        return await recallMemory(args);
        
      case 'store':
        return await storeMemory(args);
        
      case 'sync':
        return await syncMemories();
        
      case 'status':
        return await getMemoryStatus();
        
      default:
        return {
          success: false,
          message: `Unknown memory command: ${command}`
        };
    }
  } catch (error) {
    console.error('Error processing memory command:', error);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Recall memory based on query
 * @param {Object} args - Command arguments
 * @returns {Promise<Object>} - Recalled memory
 */
async function recallMemory(args) {
  try {
    const { query, aiSystem = 'chat' } = args;
    
    if (!query) {
      return {
        success: false,
        message: 'Query is required for recall command'
      };
    }
    
    // Get core memory AI
    const coreMemoryAI = await getCoreMemoryAI();
    
    // Retrieve memory
    const result = await coreMemoryAI.retrieveMemory(aiSystem, query);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // Format memory for display
    let formattedMemory = '';
    
    if (aiSystem === 'chat') {
      formattedMemory = formatChatMemory(result.memory);
    } else {
      formattedMemory = formatResearchMemory(result.memory);
    }
    
    return {
      success: true,
      message: `Memory recall for "${query}":\n\n${formattedMemory}`
    };
  } catch (error) {
    console.error('Error recalling memory:', error);
    return {
      success: false,
      message: `Error recalling memory: ${error.message}`
    };
  }
}

/**
 * Store memory
 * @param {Object} args - Command arguments
 * @returns {Promise<Object>} - Storage result
 */
async function storeMemory(args) {
  try {
    const { content, type, aiSystem = 'chat' } = args;
    
    if (!content || !type) {
      return {
        success: false,
        message: 'Content and type are required for store command'
      };
    }
    
    // Get core memory AI
    const coreMemoryAI = await getCoreMemoryAI();
    
    // Store memory
    const result = await coreMemoryAI.storeMemory(aiSystem, type, content);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return {
      success: true,
      message: result.message
    };
  } catch (error) {
    console.error('Error storing memory:', error);
    return {
      success: false,
      message: `Error storing memory: ${error.message}`
    };
  }
}

/**
 * Sync memories with GitHub
 * @returns {Promise<Object>} - Sync result
 */
async function syncMemories() {
  try {
    // Get core memory AI
    const coreMemoryAI = await getCoreMemoryAI();
    
    // Run maintenance (includes sync)
    const result = await coreMemoryAI.runMaintenance();
    
    return {
      success: result,
      message: result 
        ? 'Memory sync completed successfully' 
        : 'Memory sync failed'
    };
  } catch (error) {
    console.error('Error syncing memories:', error);
    return {
      success: false,
      message: `Error syncing memories: ${error.message}`
    };
  }
}

/**
 * Get memory system status
 * @returns {Promise<Object>} - Status
 */
async function getMemoryStatus() {
  try {
    // Get core memory AI
    const coreMemoryAI = await getCoreMemoryAI();
    
    // Get status
    const status = {
      initialized: coreMemoryAI.initialized,
      githubConnected: !!coreMemoryAI.githubClient,
      memorySizes: {}
    };
    
    // Calculate memory sizes
    for (const type in coreMemoryAI.memoryCache) {
      const memory = coreMemoryAI.memoryCache[type];
      if (!memory) {
        status.memorySizes[type] = 0;
      } else if (typeof memory === 'string') {
        status.memorySizes[type] = memory.length;
      } else {
        status.memorySizes[type] = JSON.stringify(memory).length;
      }
    }
    
    // Format status for display
    let formattedStatus = 'MEMORY SYSTEM STATUS\n\n';
    formattedStatus += `Initialized: ${status.initialized ? 'Yes' : 'No'}\n`;
    formattedStatus += `GitHub Connected: ${status.githubConnected ? 'Yes' : 'No'}\n\n`;
    formattedStatus += 'MEMORY SIZES:\n';
    
    for (const type in status.memorySizes) {
      const sizeKB = Math.round(status.memorySizes[type] / 1024 * 100) / 100;
      formattedStatus += `${type}: ${sizeKB} KB\n`;
    }
    
    return {
      success: true,
      message: formattedStatus
    };
  } catch (error) {
    console.error('Error getting memory status:', error);
    return {
      success: false,
      message: `Error getting memory status: ${error.message}`
    };
  }
}

/**
 * Format chat memory for display
 * @param {Object} memory - Chat memory
 * @returns {string} - Formatted memory
 */
function formatChatMemory(memory) {
  let formatted = '';
  
  if (memory.shortTerm) {
    formatted += 'SHORT-TERM MEMORY:\n';
    formatted += '-----------------\n';
    formatted += memory.shortTerm.substring(0, 500);
    if (memory.shortTerm.length > 500) {
      formatted += '...(truncated)';
    }
    formatted += '\n\n';
  }
  
  if (memory.episodic) {
    formatted += 'EPISODIC MEMORY:\n';
    formatted += '---------------\n';
    formatted += memory.episodic.substring(0, 500);
    if (memory.episodic.length > 500) {
      formatted += '...(truncated)';
    }
    formatted += '\n\n';
  }
  
  return formatted || 'No memory found.';
}

/**
 * Format research memory for display
 * @param {Object} memory - Research memory
 * @returns {string} - Formatted memory
 */
function formatResearchMemory(memory) {
  let formatted = '';
  
  if (memory.semantic) {
    formatted += 'SEMANTIC MEMORY:\n';
    formatted += '----------------\n';
    formatted += memory.semantic.substring(0, 500);
    if (memory.semantic.length > 500) {
      formatted += '...(truncated)';
    }
    formatted += '\n\n';
  }
  
  if (memory.procedural) {
    formatted += 'PROCEDURAL MEMORY:\n';
    formatted += '------------------\n';
    formatted += memory.procedural.substring(0, 500);
    if (memory.procedural.length > 500) {
      formatted += '...(truncated)';
    }
    formatted += '\n\n';
  }
  
  if (memory.longTerm) {
    formatted += 'LONG-TERM MEMORY:\n';
    formatted += '-----------------\n';
    formatted += memory.longTerm.substring(0, 500);
    if (memory.longTerm.length > 500) {
      formatted += '...(truncated)';
    }
    formatted += '\n\n';
  }
  
  return formatted || 'No memory found.';
}

/**
 * Process a query using Memory AI
 * @param {string} query - The query
 * @param {string} aiSystem - 'chat' or 'research'
 * @returns {Promise<Object>} - Query result
 */
export async function processMemoryQuery(query, aiSystem = 'chat') {
  try {
    // Get Venice memory client
    const veniceClient = await getVeniceMemoryClient();
    
    // Process the query
    const result = await veniceClient.processMemoryQuery(
      query,
      '',
      { aiSystem }
    );
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return {
      success: true,
      message: result.content
    };
  } catch (error) {
    console.error('Error processing memory query:', error);
    return {
      success: false,
      message: `Error processing memory query: ${error.message}`
    };
  }
}
