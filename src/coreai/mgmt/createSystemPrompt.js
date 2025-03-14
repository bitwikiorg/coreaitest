
/**
 * System Prompt Management
 * Creates and initializes system prompts in the Self GitHub repository
 */

import { saveSelfModuleToGitHub, fetchSelfModuleFromGitHub } from './selfIntegration.js';
import { systemPrompt as terminalPrompt } from '../prompt.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path for this module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialize or update system prompt in SELF repository
 */
export async function initializeSystemPrompt() {
  try {
    // Create prompts directory if it doesn't exist
    // (implicit through file creation in GitHub)
    
    // Initialize terminal prompt
    const terminalPromptPath = 'prompts/terminal_default.md';
    
    // Check if prompt already exists
    const existingTerminalPrompt = await fetchSelfModuleFromGitHub(terminalPromptPath);
    
    // Create new one if it doesn't exist
    if (!existingTerminalPrompt.success) {
      const terminalContent = `# Terminal AI System Prompt (Default)

## Overview
This file contains the default system prompt used by the Terminal AI.

## Current Prompt
\`\`\`
${terminalPrompt()}
\`\`\`

## Usage
This is the default prompt that gets used when no custom prompt is selected.
`;

      await saveSelfModuleToGitHub({
        path: terminalPromptPath,
        content: terminalContent,
        message: 'Initialize default Terminal AI prompt'
      });
    }
    
    // Initialize research prompt
    const researchPromptPath = 'prompts/research_default.md';
    
    // Get the research prompt
    let researchPromptText;
    try {
      const researchPromptModule = await import('../../ai/prompt.js');
      researchPromptText = researchPromptModule.systemPrompt();
    } catch (error) {
      console.error('Error loading research prompt:', error);
      researchPromptText = 'Error loading research prompt';
    }
    
    // Check if prompt already exists
    const existingResearchPrompt = await fetchSelfModuleFromGitHub(researchPromptPath);
    
    // Create new one if it doesn't exist
    if (!existingResearchPrompt.success) {
      const researchContent = `# Research AI System Prompt (Default)

## Overview
This file contains the default system prompt used by the Research AI.

## Current Prompt
\`\`\`
${researchPromptText}
\`\`\`

## Usage
This is the default prompt that gets used when no custom prompt is selected.
`;

      await saveSelfModuleToGitHub({
        path: researchPromptPath,
        content: researchContent,
        message: 'Initialize default Research AI prompt'
      });
    }
    
    return { 
      success: true, 
      message: 'System prompts initialized' 
    };
  } catch (error) {
    console.error('Error initializing system prompts:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

export default {
  initializeSystemPrompt
};


import { saveSelfModuleToGitHub, fetchSelfModuleFromGitHub } from './selfIntegration.js';
import { systemPrompt } from '../prompt.js';

/**
 * Initialize or update system prompt in SELF repository
 */
export async function initializeSystemPrompt() {
  try {
    const selfModulePath = 'knowledge_synthesis/system_prompt.md';
    
    // Check if system prompt already exists
    const existingPrompt = await fetchSelfModuleFromGitHub(selfModulePath);
    
    if (existingPrompt.success) {
      console.log('System prompt already exists in SELF repository');
      return existingPrompt;
    }
    
    // Create system prompt markdown file
    const content = `# CORE AI System Prompt

## Overview
This file contains the global system prompt used by the CORE AI system when interacting with users through the terminal interface.

## Current Prompt
\`\`\`
${systemPrompt()}
\`\`\`

## Usage
This prompt is automatically loaded when the terminal AI is initialized. It can be edited here to affect all future interactions.

## Last Updated
${new Date().toISOString()}
`;
    
    // Save to SELF repository
    const result = await saveSelfModuleToGitHub({
      path: selfModulePath,
      content,
      message: 'Initialize CORE AI system prompt'
    });
    
    if (result.success) {
      console.log('Successfully initialized system prompt in SELF repository');
      return result;
    } else {
      console.error('Failed to initialize system prompt:', result.error);
      return result;
    }
  } catch (error) {
    console.error('Error initializing system prompt:', error);
    return { success: false, error: error.message };
  }
}

export default { initializeSystemPrompt };
