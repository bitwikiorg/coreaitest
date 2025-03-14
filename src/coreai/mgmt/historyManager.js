
/**
 * History Manager Module
 * Manages chat history for terminal and research sessions
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for storing chat history
const HISTORY_DIR = path.join(__dirname, '../../../missions/logs');

/**
 * Get chat history for a specific session
 * @param {string} sessionId - Unique identifier for the chat session
 * @param {number} limit - Maximum number of messages to retrieve
 * @returns {Promise<Array>} - Chat history messages
 */
export async function getChatHistory(sessionId, limit = 50) {
  try {
    // Make sure history directory exists
    await fs.mkdir(HISTORY_DIR, { recursive: true });
    
    const historyPath = path.join(HISTORY_DIR, `${sessionId}.json`);
    
    try {
      const historyData = await fs.readFile(historyPath, 'utf8');
      const history = JSON.parse(historyData);
      
      // Return the most recent messages up to the limit
      return history.slice(-limit);
    } catch (err) {
      // If file doesn't exist or can't be parsed, return empty history
      if (err.code === 'ENOENT' || err instanceof SyntaxError) {
        return [];
      }
      throw err;
    }
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
}

/**
 * Save a new message to the chat history
 * @param {string} sessionId - Unique identifier for the chat session
 * @param {Object} message - Message object to save
 * @param {string} message.role - Role of the message sender ('user', 'assistant', 'system')
 * @param {string} message.content - Message content
 * @returns {Promise<boolean>} - Success status
 */
export async function saveChatMessage(sessionId, message) {
  try {
    if (!sessionId || !message || !message.role || !message.content) {
      console.warn('Invalid message format for history saving');
      return false;
    }
    
    // Make sure history directory exists
    await fs.mkdir(HISTORY_DIR, { recursive: true });
    
    const historyPath = path.join(HISTORY_DIR, `${sessionId}.json`);
    let history = [];
    
    // Try to read existing history
    try {
      const historyData = await fs.readFile(historyPath, 'utf8');
      history = JSON.parse(historyData);
    } catch (err) {
      // If file doesn't exist or can't be parsed, start with empty history
      if (err.code !== 'ENOENT' && !(err instanceof SyntaxError)) {
        throw err;
      }
    }
    
    // Add timestamp to message
    const timestampedMessage = {
      ...message,
      timestamp: new Date().toISOString()
    };
    
    // Add new message to history
    history.push(timestampedMessage);
    
    // Save updated history
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error saving chat message:', error);
    return false;
  }
}

/**
 * Clear chat history for a specific session
 * @param {string} sessionId - Unique identifier for the chat session
 * @returns {Promise<boolean>} - Success status
 */
export async function clearChatHistory(sessionId) {
  try {
    if (!sessionId) {
      return false;
    }
    
    const historyPath = path.join(HISTORY_DIR, `${sessionId}.json`);
    
    try {
      await fs.unlink(historyPath);
    } catch (err) {
      // If file doesn't exist, consider it already cleared
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }
}

export default {
  getChatHistory,
  saveChatMessage,
  clearChatHistory
};
