
/**
 * Venice Memory Client
 * 
 * This module implements a client for the Venice API specifically for memory operations.
 * It handles sending memory-related queries to the Venice AI and processing responses.
 */

import axios from 'axios';
import { getCoreMemoryAI } from './core-memory-ai.js';

class VeniceMemoryClient {
  constructor(config = {}) {
    this.apiKey = process.env.VENICE_API_KEY;
    this.baseUrl = 'https://api.venice.ai/api/v1';
    this.model = config.model || 'deepseek-r1-671b';
    this.maxTokens = config.maxTokens || 800;
    this.temperature = config.temperature || 0.7;
    this.topP = config.topP || 0.9;
  }

  /**
   * Initialize the client and verify API key
   */
  async initialize() {
    if (!this.apiKey) {
      console.error('Venice API key is not set');
      return false;
    }

    try {
      // Test API connection
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Venice API connection verified successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect to Venice API:', error.message);
      return false;
    }
  }

  /**
   * Process a memory-related query
   * @param {string} query - The user's query
   * @param {string} memoryContext - Memory context to include
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The AI response
   */
  async processMemoryQuery(query, memoryContext = '', options = {}) {
    try {
      // Get core memory AI instance
      const coreMemoryAI = await getCoreMemoryAI();
      
      // Determine AI system type (chat or research)
      const aiSystem = options.aiSystem || 'chat';
      
      // Retrieve relevant memory
      const memoryPackage = await coreMemoryAI.retrieveMemory(aiSystem, query);
      
      if (!memoryPackage.success) {
        throw new Error(`Failed to retrieve memory: ${memoryPackage.error}`);
      }
      
      // Get system prompt
      const systemPrompt = await coreMemoryAI.loadSystemPrompt(aiSystem);
      
      // Prepare memory context string
      let formattedMemoryContext = '';
      
      if (aiSystem === 'chat') {
        formattedMemoryContext = `
SHORT-TERM MEMORY:
${memoryPackage.memory.shortTerm || 'No short-term memory available.'}

EPISODIC MEMORY:
${memoryPackage.memory.episodic || 'No episodic memory available.'}
`;
      } else {
        formattedMemoryContext = `
SEMANTIC MEMORY:
${memoryPackage.memory.semantic || 'No semantic memory available.'}

PROCEDURAL MEMORY:
${memoryPackage.memory.procedural || 'No procedural memory available.'}

LONG-TERM MEMORY:
${memoryPackage.memory.longTerm || 'No long-term memory available.'}
`;
      }
      
      // Combine user-provided memory context with retrieved memory
      if (memoryContext) {
        formattedMemoryContext += `\nADDITIONAL CONTEXT:\n${memoryContext}`;
      }
      
      // Create messages array
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `MEMORY CONTEXT:\n${formattedMemoryContext}\n\nUSER QUERY: ${query}` }
      ];
      
      // Configure Venice parameters
      const veniceParameters = {
        include_venice_system_prompt: options.includeVeniceSystemPrompt !== false,
        ...(options.enableWebSearch && { enable_web_search: options.enableWebSearch }),
        ...options.veniceParameters
      };
      
      // Get profile settings
      const profile = memoryPackage.profile || {};
      
      // Build request body
      const requestBody = {
        model: options.model || this.model,
        messages: messages,
        max_tokens: options.maxTokens || profile.maxTokens || this.maxTokens,
        temperature: options.temperature || profile.temperature || this.temperature,
        top_p: options.topP || profile.topP || this.topP
      };
      
      // Only add venice_parameters if they have properties
      if (Object.keys(veniceParameters).length > 0) {
        requestBody.venice_parameters = veniceParameters;
      }
      
      console.log(`Sending memory query to Venice API with model: ${requestBody.model}`);
      
      // Make the API request
      const response = await axios.post(`${this.baseUrl}/chat/completions`, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Store the interaction in memory
      const memoryEntry = {
        timestamp: new Date().toISOString(),
        query: query,
        response: response.data.choices[0].message.content,
        aiSystem: aiSystem
      };
      
      // Store in appropriate memory type
      const memoryType = aiSystem === 'chat' ? 'episodic' : 'long-term';
      console.log(`Creating new ${memoryType} memory from ${aiSystem} interaction: "${query.substring(0, 50)}..."`);
      const result = await coreMemoryAI.storeMemory(aiSystem, memoryType, JSON.stringify(memoryEntry, null, 2));
      console.log(`Memory creation result: ${result.success ? 'Success' : 'Failed - ' + result.message}`);
      
      return {
        success: true,
        content: response.data.choices[0].message.content,
        model: requestBody.model,
        usage: response.data.usage,
        memoryUsed: Object.keys(memoryPackage.memory).filter(key => !!memoryPackage.memory[key]).length
      };
    } catch (error) {
      console.error('Error processing memory query:', error);
      
      // Handle specific Venice API error codes
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Check your Venice API key.'
        };
      } else if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.'
        };
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.error || 'Invalid request parameters';
        return {
          success: false,
          error: `API Error (400): ${errorMsg}`
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
let veniceMemoryClient = null;

export async function getVeniceMemoryClient(config = {}) {
  if (!veniceMemoryClient) {
    veniceMemoryClient = new VeniceMemoryClient(config);
    await veniceMemoryClient.initialize();
  }
  return veniceMemoryClient;
}

export default VeniceMemoryClient;
