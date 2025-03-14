
import { saveSelfModuleToGitHub } from './src/coreai/mgmt/selfIntegration.js';
import { systemPrompt as terminalPrompt } from './src/coreai/prompt.js';
import fs from 'fs/promises';
import path from 'path';

// Function to check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Get research prompt with proper fallbacks
let researchPrompt;

// Define possible paths for research prompt
const possiblePaths = [
  { path: './src/ai/prompt.js', importPath: './src/ai/prompt.js' },
  { path: './src/ai/prompt.ts', importPath: './src/ai/prompt.ts' },
  { path: './src/coreai/prompt.js', importPath: './src/coreai/prompt.js' }
];

// Try each path in order
let promptLoaded = false;
for (const pathObj of possiblePaths) {
  try {
    if (await fileExists(pathObj.path)) {
      console.log(`Found research prompt file at ${pathObj.path}`);
      const promptModule = await import(pathObj.importPath);
      if (promptModule && typeof promptModule.systemPrompt === 'function') {
        researchPrompt = promptModule.systemPrompt;
        console.log(`Successfully loaded research prompt from ${pathObj.path}`);
        promptLoaded = true;
        break;
      }
    }
  } catch (error) {
    console.warn(`Error loading research prompt from ${pathObj.path}:`, error.message);
  }
}

// If no prompt was loaded, use fallback
if (!promptLoaded) {
  console.warn('Using fallback research prompt');
  researchPrompt = () => 'Default research prompt could not be loaded. Please create src/ai/prompt.js or src/ai/prompt.ts file.';
}

async function createDefaultPrompts() {
  try {
    console.log('Creating default prompt files...');
    
    // Create terminal prompt
    const terminalPromptPath = 'prompts/terminal_default.md';
    const terminalContent = `# Default Terminal Prompt

## Overview
This file contains the default system prompt used by the Terminal AI.

## Current Prompt
\`\`\`
${terminalPrompt()}
\`\`\`

## Usage
This is the default prompt that gets used when no custom prompt is selected.
`;

    console.log('Saving terminal prompt...');
    const terminalResult = await saveSelfModuleToGitHub({
      path: terminalPromptPath,
      content: terminalContent,
      message: 'Initialize default Terminal AI prompt'
    });

    if (terminalResult.success) {
      console.log('Terminal prompt saved successfully');
    } else {
      console.error('Failed to save terminal prompt:', terminalResult.error);
    }
    
    // Create research prompt
    const researchPromptPath = 'prompts/research_default.md';
    const researchContent = `# Research AI System Prompt (Default)

## Overview
This file contains the default system prompt used by the Research AI.

## Current Prompt
\`\`\`
${researchPrompt()}
\`\`\`

## Usage
This is the default prompt that gets used when no custom prompt is selected.
`;

    console.log('Saving research prompt...');
    const researchResult = await saveSelfModuleToGitHub({
      path: researchPromptPath,
      content: researchContent,
      message: 'Initialize default Research AI prompt'
    });

    if (researchResult.success) {
      console.log('Research prompt saved successfully');
    } else {
      console.error('Failed to save research prompt:', researchResult.error);
    }

    console.log('Prompt creation completed');
  } catch (error) {
    console.error('Error creating default prompts:', error);
  }
}

createDefaultPrompts().catch(console.error);
