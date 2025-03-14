
/**
 * Memory Controller
 * 
 * This module provides API endpoints for memory operations.
 * It handles memory retrieval, storage, and management functions.
 */

import { getCoreMemoryAI } from './core-memory-ai.js';
import { getVeniceMemoryClient } from './venice-memory-client.js';

/**
 * Process a memory query
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export async function processMemoryQuery(req, res) {
  try {
    const { query, memoryContext, options } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    // Get Venice memory client
    const veniceClient = await getVeniceMemoryClient();
    
    // Process the query
    const result = await veniceClient.processMemoryQuery(
      query,
      memoryContext || '',
      options || {}
    );
    
    return res.json(result);
  } catch (error) {
    console.error('Error processing memory query:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Retrieve memory
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export async function retrieveMemory(req, res) {
  try {
    const { aiSystem, query } = req.body;
    
    if (!aiSystem) {
      return res.status(400).json({
        success: false,
        error: 'AI system is required'
      });
    }
    
    // Get core memory AI
    const coreMemoryAI = await getCoreMemoryAI();
    
    // Retrieve memory
    const result = await coreMemoryAI.retrieveMemory(aiSystem, query || '');
    
    return res.json(result);
  } catch (error) {
    console.error('Error retrieving memory:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Store memory
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export async function storeMemory(req, res) {
  try {
    const { aiSystem, memoryType, content } = req.body;
    
    if (!aiSystem || !memoryType || !content) {
      return res.status(400).json({
        success: false,
        error: 'AI system, memory type, and content are required'
      });
    }
    
    // Get core memory AI
    const coreMemoryAI = await getCoreMemoryAI();
    
    // Store memory
    const result = await coreMemoryAI.storeMemory(aiSystem, memoryType, content);
    
    return res.json(result);
  } catch (error) {
    console.error('Error storing memory:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Run memory maintenance
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export async function runMaintenance(req, res) {
  try {
    // Get core memory AI
    const coreMemoryAI = await getCoreMemoryAI();
    
    // Run maintenance
    const result = await coreMemoryAI.runMaintenance();
    
    return res.json({
      success: result,
      message: result ? 'Memory maintenance completed successfully' : 'Memory maintenance failed'
    });
  } catch (error) {
    console.error('Error running memory maintenance:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get memory status
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export async function getMemoryStatus(req, res) {
  try {
    // Get core memory AI
    const coreMemoryAI = await getCoreMemoryAI();
    
    // Get memory status
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
    
    return res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting memory status:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
