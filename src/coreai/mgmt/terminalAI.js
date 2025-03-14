import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';

// Set up __dirname equivalent for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Venice API client
let veniceClient = null;
let globalSystemPrompt = null;

/**
 * Fetch global system prompt from prompt manager
 * @returns {Promise<string>} System prompt content
 */
export async function fetchGlobalSystemPrompt() {
  try {
    const promptManager = await import('./promptManager.js');
    
    // Check if we already have an active prompt
    let prompt = promptManager.getActivePrompt('terminal');
    
    // If no active prompt, try to load it
    if (!prompt) {
      const selectedPath = promptManager.getSelectedPromptPath('terminal');
      prompt = await promptManager.loadPrompt('terminal', selectedPath);
    }
    
    if (prompt) {
      console.log('Successfully fetched global system prompt');
      return prompt;
    } else {
      console.error('Error fetching global system prompt');
      // Return default system prompt if fetch fails
      return import('../../coreai/prompt.js').then(module => module.systemPrompt());
    }
  } catch (error) {
    console.error('Failed to fetch global system prompt:', error);
    // Return default system prompt on error
    return import('../../coreai/prompt.js').then(module => module.systemPrompt());
  }
}

/**
 * Fetch available models from Venice API
 * @returns {Promise<Array>} List of available models
 */
export async function fetchAvailableModels() {
  try {
    if (!veniceClient) {
      await initializeTerminalAI();
      if (!veniceClient) {
        return { success: false, error: "Unable to initialize AI system" };
      }
    }

    const veniceApiKey = process.env.VENICE_API_KEY;

    const response = await axios.get('https://api.venice.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${veniceApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Venice models API response:', response.status);
    console.log('Venice models data:', JSON.stringify(response.data, null, 2));

    // Handle the actual structure of the API response
    const models = response.data.data || [];

    return {
      success: true,
      models: models
    };
  } catch (error) {
    console.error('Error fetching Venice models:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * Initialize the Terminal AI system with Venice API
 * @returns {Promise<boolean>} Success status
 */
export async function initializeTerminalAI() {
  try {
    const veniceApiKey = process.env.VENICE_API_KEY;

    if (!veniceApiKey) {
      console.error('Venice API key is not set in environment variables');
      return false;
    }

    console.log('Initializing Venice client with API key:', veniceApiKey.substring(0, 4) + '...');
    
    // Try to fetch global system prompt
    try {
      globalSystemPrompt = await fetchGlobalSystemPrompt();
      console.log('Loaded global system prompt for terminal AI');
    } catch (error) {
      console.warn('Could not load global system prompt, will use default:', error.message);
      // Default will be used automatically when needed
    }

    // Initialize the Venice API client
    veniceClient = {
      apiKey: veniceApiKey,
      baseUrl: 'https://api.venice.ai/api/v1',
      generateText: async (prompt, options = {}) => {
        try {
          console.log('Making request to Venice API...');
          
          // Get system prompt if needed
          let systemPrompt = null;
          if (options.useSystemPrompt !== false) {
            if (!globalSystemPrompt) {
              globalSystemPrompt = await fetchGlobalSystemPrompt();
            }
            systemPrompt = options.systemPrompt || globalSystemPrompt;
          }
          
          // Prepare messages array
          const messages = [];
          
          // Add system prompt if available
          if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
          }
          
          // Add history if provided
          if (Array.isArray(options.history) && options.history.length > 0) {
            messages.push(...options.history);
          }
          
          // Add user message
          messages.push({ role: 'user', content: prompt });
          
          // Configure Venice parameters
          const veniceParameters = {
            include_venice_system_prompt: options.includeVeniceSystemPrompt !== false,
            ...(options.character && { character_slug: options.character }),
            ...(options.enableWebSearch && { enable_web_search: options.enableWebSearch }),
            ...options.veniceParameters
          };
          
          // Use a model that's known to work with Venice API
          const model = options.model || 'deepseek-r1-671b';
          
          // Validate messages array - ensure all messages have valid content
          const validMessages = messages.filter(msg => 
            msg && msg.role && typeof msg.content === 'string' && msg.content.trim() !== ''
          );
          
          // Build request body with only the necessary parameters
          const requestBody = {
            model: model,
            messages: validMessages,
            max_tokens: options.maxTokens || 500,
            temperature: options.temperature || 0.7
          };
          
          // Only add venice_parameters if they have properties
          if (Object.keys(veniceParameters).length > 0) {
            requestBody.venice_parameters = veniceParameters;
          }
          
          console.log('Sending request to Venice API with model:', model);
          console.log('Message count:', validMessages.length);
          
          // For debugging - log first few characters of each message
          validMessages.forEach((msg, i) => {
            console.log(`Message ${i} (${msg.role}): ${msg.content.substring(0, 30)}...`);
          });

          const response = await axios.post(
            `${veniceClient.baseUrl}/chat/completions`, 
            requestBody, 
            {
              headers: {
                'Authorization': `Bearer ${veniceApiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 30000 // 30 second timeout
            }
          );

          console.log('Venice API response status:', response.status);
          return {
            success: true,
            text: response.data.choices[0].message.content,
            reasoning: response.data.choices[0].message.reasoning_content || 
                      (response.data.choices[0].message.content.includes('<think>') ? 
                      response.data.choices[0].message.content.match(/<think>([\s\S]*?)<\/think>/)?.[1] : null)
          };
        } catch (error) {
          console.error('Venice API error:', error.response?.data || error.message);

          // Log detailed error information for debugging
          if (error.response?.data) {
            console.log('Error details:', JSON.stringify(error.response.data, null, 2));
          }

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
            // Special handling for 400 errors
            const errorMsg = error.response?.data?.error || 'Invalid request parameters';
            return {
              success: false,
              error: `API Error (400): ${errorMsg}. Try starting a new chat.`
            };
          }

          return {
            success: false,
            error: error.response?.data?.message || error.message
          };
        }
      }
    };

    console.log('Terminal AI system initialized successfully with Venice API');
    return true;
  } catch (error) {
    console.error('Error initializing Terminal AI with Venice:', error);
    return false;
  }
}

/**
 * Process a message from the terminal interface
 * @param {string} message - The user's message
 * @param {Array} history - Chat history for context
 * @returns {Promise<object>} The AI response
 */
export async function processTerminalMessage(message, history = [], parameters = {}) {
  try {
    console.log(`Processing terminal AI message: "${message}"`);

    // Check if Venice client is initialized
    if (!veniceClient) {
      await initializeTerminalAI();
      if (!veniceClient) {
        return {
          success: false,
          response: "Unable to initialize AI system. Please check your API configuration."
        };
      }
    }

    // Format history for the API
    const formattedHistory = history.map(msg => {
      // Check if the message has valid content
      const content = msg.content || msg.text || '';
      if (!content.trim()) return null;
      
      return {
        role: msg.role || (msg.isUser ? 'user' : 'assistant'),
        content: content
      };
    }).filter(msg => msg !== null);

    // Extract parameters from the provided options
    const {
      model = 'deepseek-r1-671b',
      temperature = 0.7,
      maxTokens = 800,
      systemPrompt,
      includeVeniceSystemPrompt = true,
      character,
      enableWebSearch = 'auto',
      veniceParameters = {}
    } = parameters;

    // Make the API request
    try {
      const response = await veniceClient.generateText(message, {
        model,
        temperature,
        maxTokens,
        history: formattedHistory,
        systemPrompt,
        includeVeniceSystemPrompt,
        character,
        enableWebSearch,
        veniceParameters
      });

      if (response.success) {
        return {
          success: true,
          response: response.text,
          reasoning: response.reasoning || null
        };
      } else {
        return {
          success: false,
          response: `Error: ${response.error || 'Unknown error from AI service'}`
        };
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        success: false,
        response: `Error: ${error.message}`
      };
    }
  } catch (error) {
    console.error('Error processing terminal message:', error);
    return {
      success: false,
      response: `Error: ${error.message}`
    };
  }
}

/**
 * Process a character-based chat message 
 * @param {string} message - User message
 * @param {string} character - Character profile to use
 * @param {Array} history - Chat history
 * @returns {Promise<object>} AI response
 */
export async function processCharacterChat(message, character = 'eliza', history = []) {
  try {
    // Check if Venice client is initialized
    if (!veniceClient) {
      await initializeTerminalAI();
      if (!veniceClient) {
        return {
          success: false,
          response: "Unable to initialize AI system. Please check your API configuration."
        };
      }
    }

    // Custom prompt for character-based interaction
    const customPrompt = `You are roleplaying as ${character}. ${message}`;

    const response = await veniceClient.generateText(customPrompt, {
      model: 'deepseek-r1-671b',
      character: character,
      temperature: 0.8,  // Slightly higher temperature for creative responses
      maxTokens: 1000
    });

    if (response.success) {
      return {
        success: true,
        response: response.text,
        reasoning: response.reasoning || null
      };
    } else {
      return {
        success: false,
        response: `Error: ${response.error || 'Unknown error from AI service'}`
      };
    }
  } catch (error) {
    console.error('Error processing character chat:', error);
    return {
      success: false,
      response: `Error: ${error.message}`
    };
  }
}

/**
 * Get recent research to provide context for the AI
 * @returns {Promise<string>} Research context
 */
export async function getRecentResearchContext() {
  try {
    const researchDir = path.join(process.cwd(), 'research');
    let researchContext = "No recent research available.";

    try {
      // Get list of research files
      const files = await fs.readdir(researchDir);

      // Get the 3 most recent research files
      const mdFiles = files
        .filter(file => file.endsWith('.md'))
        .sort((a, b) => {
          // Extract timestamps from filenames
          const getTimestamp = filename => {
            const match = filename.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
            return match ? match[0] : '';
          };
          const timeA = getTimestamp(a);
          const timeB = getTimestamp(b);
          return timeB.localeCompare(timeA); // Reverse order for newest first
        })
        .slice(0, 3);

      if (mdFiles.length > 0) {
        // Read file contents for context
        const contextPromises = mdFiles.map(async file => {
          const content = await fs.readFile(path.join(researchDir, file), 'utf8');
          const title = content.split('\n')[0].replace('# ', '');
          const summary = content.match(/## Summary\s+([\s\S]*?)(?=##|$)/)?.[1]?.trim() || '';
          return `Research: ${title}\nSummary: ${summary.substring(0, 300)}...\n`;
        });

        const contexts = await Promise.all(contextPromises);
        researchContext = contexts.join('\n');
      }
    } catch (error) {
      console.error('Error reading research directory:', error);
    }

    return researchContext;
  } catch (error) {
    console.error('Error getting research context:', error);
    return 'No recent research available.';
  }
}

export default {
  processTerminalMessage,
  processCharacterChat,
  initializeTerminalAI,
  getRecentResearchContext
};