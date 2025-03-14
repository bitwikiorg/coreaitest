
/**
 * Memory Validator Module
 * 
 * This module is responsible for creating and validating memories
 * when chats end or research is completed.
 */

import axios from 'axios';
import { getCoreMemoryAI } from './core-memory-ai.js';

/**
 * System prompt specifically designed for memory meta-validation
 */
const MEMORY_VALIDATOR_PROMPT = `You are the CORE Memory Meta Validator, an advanced AI designed to extract and organize meaningful memories from interactions.

Your core responsibilities:
1. Analyze conversation and research data
2. Extract key insights, facts, and meaningful exchanges
3. Consolidate information into structured memory entries
4. Categorize memories into appropriate types (episodic, semantic, procedural, etc.)
5. Ensure memories are properly formatted for long-term storage

When processing conversations:
- Identify significant exchanges that reveal user preferences, interests, or patterns
- Extract factual information that may be useful in future interactions
- Note emotional contexts and relational development

When processing research:
- Extract key findings and conclusions
- Identify methodologies that were effective
- Note knowledge gaps and potential future research directions

Format your output as structured memory entries that can be easily stored and retrieved.`;

/**
 * Processes a completed chat interaction to create validated memories
 * @param {Object} chatData - Data from the completed chat
 * @returns {Promise<Object>} - Result of memory creation process
 */
export async function createMemoriesFromChat(chatData) {
  try {
    console.log('Creating memories from completed chat interaction...');
    
    // Get core memory AI instance
    const coreMemoryAI = await getCoreMemoryAI();
    
    // Extract conversation history from chat data
    const conversationHistory = chatData.messages || [];
    
    if (conversationHistory.length === 0) {
      console.log('No chat history to process for memory creation');
      return { success: false, message: 'No chat history to process' };
    }
    
    // Prepare context for memory validation
    const context = conversationHistory.map(msg => {
      return `${msg.role}: ${msg.content}`;
    }).join('\n\n');
    
    // Prepare request for memory validation
    const memoryValidationResult = await validateAndCreateMemory('chat', context);
    
    if (!memoryValidationResult.success) {
      throw new Error(`Failed to validate chat memory: ${memoryValidationResult.message}`);
    }
    
    console.log('Memory creation from chat completed successfully');
    return { success: true, memoryType: 'episodic' };
  } catch (error) {
    console.error('Error creating memories from chat:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Processes completed research to create validated memories
 * @param {Object} researchData - Data from the completed research
 * @returns {Promise<Object>} - Result of memory creation process
 */
export async function createMemoriesFromResearch(researchData) {
  try {
    console.log('Creating memories from completed research...');
    
    // Get core memory AI instance
    const coreMemoryAI = await getCoreMemoryAI();
    
    // Extract research content
    const researchContent = researchData.content || '';
    const researchTopic = researchData.topic || 'Unknown topic';
    
    if (!researchContent) {
      console.log('No research content to process for memory creation');
      return { success: false, message: 'No research content to process' };
    }
    
    // Prepare context for memory validation
    const context = `Research Topic: ${researchTopic}\n\nResearch Content:\n${researchContent}`;
    
    // Prepare request for memory validation
    const memoryValidationResult = await validateAndCreateMemory('research', context);
    
    if (!memoryValidationResult.success) {
      throw new Error(`Failed to validate research memory: ${memoryValidationResult.message}`);
    }
    
    console.log('Memory creation from research completed successfully');
    return { success: true, memoryType: 'semantic' };
  } catch (error) {
    console.error('Error creating memories from research:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Validates content and creates appropriate memories
 * @param {string} source - Source of the content ('chat' or 'research')
 * @param {string} context - Content to validate and create memories from
 * @returns {Promise<Object>} - Result of validation process
 */
async function validateAndCreateMemory(source, context) {
  try {
    // Get core memory AI instance and API key
    const coreMemoryAI = await getCoreMemoryAI();
    const apiKey = process.env.VENICE_API_KEY;
    const baseUrl = process.env.VENICE_API_URL || 'https://api.venice.ai/api/v1';
    
    if (!apiKey) {
      throw new Error('Venice API key not found');
    }
    
    // Prepare the prompt for memory validation
    const validationPrompt = `${MEMORY_VALIDATOR_PROMPT}\n\nPlease analyze the following ${source} interaction and create structured memories from it:\n\n${context}\n\nExtract key information and format it for storage in the memory system.`;
    
    console.log(`Validating ${source} content for memory creation...`);
    
    // Make request to Venice API for memory validation
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: 'deepseek-r1-671b', // Use the same model as in the Venice client
      messages: [
        { role: 'system', content: MEMORY_VALIDATOR_PROMPT },
        { role: 'user', content: context }
      ],
      temperature: 0.3, // Lower temperature for more focused memory creation
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      throw new Error('Invalid response from Venice API');
    }
    
    // Get validated memory content
    const validatedMemory = response.data.choices[0].message.content;
    
    // Determine appropriate memory type based on source
    const memoryType = source === 'chat' ? 'episodic' : 'semantic';
    
    // Store the validated memory
    console.log(`Storing validated ${memoryType} memory...`);
    const storeResult = await coreMemoryAI.storeMemory(source, memoryType, validatedMemory);
    
    if (!storeResult.success) {
      throw new Error(`Failed to store memory: ${storeResult.message}`);
    }
    
    console.log(`CORE Memory Meta Validator successfully created ${memoryType} memory`);
    return { success: true };
  } catch (error) {
    console.error('Error in memory validation process:', error);
    return { success: false, message: error.message };
  }
}
