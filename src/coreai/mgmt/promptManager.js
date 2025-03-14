/**
 * Prompt Manager Module
 * Manages system prompts for different system components
 */

import fs from 'fs/promises';
import path from 'path';
import { getSelfModuleFromGitHub } from './selfIntegration.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store active prompts
const activePrompts = {
  research: null,
  terminal: null
};

// Store selected prompt paths
const selectedPromptPaths = {
  research: null,
  terminal: null
};

/**
 * Get the active prompt for a given type
 * @param {string} type - The prompt type ('research' or 'terminal')
 * @returns {object|null} The active prompt, or null if not set
 */
export function getActivePrompt(type) {
  return activePrompts[type] || null;
}

/**
 * Get the selected prompt path for a given type
 * @param {string} type - The prompt type ('research' or 'terminal')
 * @returns {string|null} The selected prompt path, or null if using default
 */
export function getSelectedPromptPath(type) {
  return selectedPromptPaths[type] || null;
}

/**
 * Load the default prompt for a given type
 * @param {string} type - The prompt type ('research' or 'terminal')
 * @returns {Promise<object>} The default prompt
 */
export async function loadDefaultPrompt(type) {
  try {
    let defaultPath;

    if (type === 'research') {
      defaultPath = path.join(__dirname, '..', 'prompt.js');
      const { systemPrompt } = await import(defaultPath);
      activePrompts.research = systemPrompt;
      selectedPromptPaths.research = null; // null indicates default
      return systemPrompt;
    } else if (type === 'terminal') {
      defaultPath = path.join(__dirname, '..', 'prompt.js');
      const { systemPrompt } = await import(defaultPath);
      activePrompts.terminal = systemPrompt;
      selectedPromptPaths.terminal = null; // null indicates default
      return systemPrompt;
    } else {
      throw new Error(`Invalid prompt type: ${type}`);
    }
  } catch (error) {
    console.error(`Error loading default ${type} prompt:`, error);
    throw error;
  }
}

/**
 * Reset to the default prompt for a given type
 * @param {string} type - The prompt type ('research' or 'terminal')
 * @returns {Promise<void>}
 */
export async function resetToDefaultPrompt(type) {
  await loadDefaultPrompt(type);
  console.log(`Reset to default ${type} prompt`);
}

/**
 * Load a prompt from the specified path
 * @param {string} type - The prompt type ('research' or 'terminal')
 * @param {string} promptPath - Path to the prompt file
 * @returns {Promise<object>} The loaded prompt
 */
export async function loadPrompt(type, promptPath) {
  try {
    if (!type || (type !== 'research' && type !== 'terminal')) {
      throw new Error(`Invalid prompt type: ${type}`);
    }

    if (!promptPath) {
      return await loadDefaultPrompt(type);
    }

    let promptContent;

    // Check if this is a GitHub path
    if (promptPath.startsWith('prompts/')) {
      // Fetch from GitHub
      const result = await getSelfModuleFromGitHub(promptPath);

      if (!result.success) {
        throw new Error(`Failed to load prompt from GitHub: ${result.error}`);
      }

      promptContent = result.content;
    } else {
      // Load from filesystem
      promptContent = await fs.readFile(promptPath, 'utf8');
    }

    // Parse the prompt
    let prompt;

    if (promptPath.endsWith('.json')) {
      prompt = JSON.parse(promptContent);
    } else if (promptPath.endsWith('.js')) {
      // For .js files, we need to evaluate them
      // This is a security risk, but we're assuming trusted prompts
      const tempFilePath = path.join(__dirname, `temp_prompt_${Date.now()}.js`);
      await fs.writeFile(tempFilePath, promptContent);

      try {
        const module = await import(tempFilePath + '?v=' + Date.now());
        prompt = module.default || module.systemPrompt || module;

        // Clean up temp file
        await fs.unlink(tempFilePath);
      } catch (evalError) {
        // Clean up temp file
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          console.error('Error cleaning up temp file:', unlinkError);
        }

        throw evalError;
      }
    } else {
      // Assume it's a text/markdown prompt
      prompt = { content: promptContent };
    }

    // Set as active prompt
    activePrompts[type] = prompt;
    selectedPromptPaths[type] = promptPath;

    console.log(`Loaded ${type} prompt from ${promptPath}`);
    return prompt;
  } catch (error) {
    console.error(`Error loading ${type} prompt:`, error);
    throw error;
  }
}

/**
 * Save a prompt to GitHub
 * @param {string} type - The prompt type ('research' or 'terminal')
 * @param {string} content - The prompt content
 * @param {string} name - The prompt name
 * @returns {Promise<{success: boolean, path: string, error: string}>}
 */
export async function savePromptToGitHub(type, content, name) {
  try {
    if (!type || (type !== 'research' && type !== 'terminal')) {
      throw new Error(`Invalid prompt type: ${type}`);
    }

    if (!content) {
      throw new Error('No prompt content provided');
    }

    if (!name) {
      throw new Error('No prompt name provided');
    }

    // Sanitize name for use in filename
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();

    // Create path
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const promptPath = `prompts/${type}/${sanitizedName}_${timestamp}.js`;

    // Format content as a JS module
    const formattedContent = `/**
 * ${type.charAt(0).toUpperCase() + type.slice(1)} System Prompt: ${name}
 * Created: ${new Date().toISOString()}
 */

export const systemPrompt = ${typeof content === 'string' ? '`' + content + '`' : JSON.stringify(content, null, 2)};

export default systemPrompt;
`;

    // Save to GitHub
    const { saveSelfModuleToGitHub } = await import('./selfIntegration.js');
    const result = await saveSelfModuleToGitHub({
      path: promptPath,
      content: formattedContent,
      message: `Add ${type} prompt: ${name}`
    });

    if (result.success) {
      return {
        success: true,
        path: promptPath
      };
    } else {
      throw new Error(result.error || 'Failed to save prompt to GitHub');
    }
  } catch (error) {
    console.error('Error saving prompt to GitHub:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  getActivePrompt,
  getSelectedPromptPath,
  loadDefaultPrompt,
  resetToDefaultPrompt,
  loadPrompt,
  savePromptToGitHub
};