import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { processTerminalMessage, initializeTerminalAI, fetchAvailableModels } from './src/coreai/mgmt/terminalAI.js';
import { fileURLToPath } from 'url';
import { runResearch } from './src/runResearch.js'; // Using existing file path
import { getChatHistory, saveChatMessage } from './src/coreai/mgmt/historyManager.js';
import { getCoreMemoryAI } from './src/memory/core-memory-ai.js';
import { getVeniceMemoryClient } from './src/memory/venice-memory-client.js';
import * as memoryController from './src/memory/memory-controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Make io available globally for scheduler status updates
global.io = io;

// Setup express static middleware
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Express routes
app.get('/', (req, res) => {
  res.render('terminal');
});

app.get('/research', (req, res) => {
  res.render('research');
});

app.get('/admin', (req, res) => {
  res.render('admin');
});

app.get('/github', (req, res) => {
  res.render('github');
});

app.get('/memory', (req, res) => {
  res.render('memory');
});

app.get('/self', (req, res) => {
  res.render('self');
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('User connected');

  // Check if research directory exists
  (async () => {
    try {
      await fs.promises.access(path.join(__dirname, 'research'));
      console.log('Research directory exists');
    } catch (err) {
      try {
        await fs.promises.mkdir(path.join(__dirname, 'research'), { recursive: true });
        console.log('Created research directory');
      } catch (err) {
        console.error('Error creating research directory:', err);
      }
    }
  })();

  socket.on('save-config', async data => {
    if (data.github) {
      socket.emit('plugin-status', { plugin: 'github', status: 'ACTIVE' });
    }
    try {
      // Add your code here if needed
    } catch (err) {
      console.error('Error saving configuration:', err);
      socket.emit('config-error', { message: 'Failed to save configuration' });
    }
  });

  socket.on('save-research-settings', async data => {
    try {
      if (!global.researchSettings) global.researchSettings = {};
      if (data.defaultDepth)
        global.researchSettings.defaultDepth = parseInt(data.defaultDepth, 10);
      if (data.defaultBreadth)
        global.researchSettings.defaultBreadth = parseInt(
          data.defaultBreadth,
          10,
        );
      if (data.publicResearch !== undefined)
        global.researchSettings.publicResearch = data.publicResearch;
      const configPath = path.join(__dirname, 'config.json');
      let config = {};
      try {
        const configContent = await fs.promises.readFile(configPath, 'utf8');
        config = JSON.parse(configContent);
      } catch (err) {
        config = {};
      }
      config.researchSettings = global.researchSettings;
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
      socket.emit('research-settings-saved', {
        message: 'Research settings saved successfully',
      });
    } catch (err) {
      console.error('Error saving research settings:', err);
      socket.emit('config-error', {
        message: 'Failed to save research settings',
      });
    }
  });

  socket.on('save-github-settings', async data => {
    try {
      if (!global.githubSettings) global.githubSettings = {};
      if (data.owner) global.githubSettings.owner = data.owner;
      if (data.researchRepo)
        global.githubSettings.researchRepo = data.researchRepo;
      if (data.branch) global.githubSettings.branch = data.branch;
      if (data.path) global.githubSettings.path = data.path;
      const configPath = path.join(__dirname, 'config.json');
      let config = {};
      try {
        const configContent = await fs.promises.readFile(configPath, 'utf8');
        config = JSON.parse(configContent);
      } catch (err) {
        config = {};
      }
      config.githubSettings = global.githubSettings;
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
      let envContent = '';
      try {
        envContent = await fs.promises.readFile('.env', 'utf8');
      } catch (err) {
        envContent = '';
      }
      if (data.owner) {
        process.env.GITHUB_OWNER = data.owner;
        envContent = envContent.includes('GITHUB_OWNER=')
          ? envContent.replace(
              /GITHUB_OWNER=.*\n?/,
              `GITHUB_OWNER=${data.owner}\n`,
            )
          : envContent + `\nGITHUB_OWNER=${data.owner}`;
      }
      if (data.researchRepo) {
        process.env.GITHUB_REPO = data.researchRepo;
        envContent = envContent.includes('GITHUB_REPO=')
          ? envContent.replace(
              /GITHUB_REPO=.*\n?/,
              `GITHUB_REPO=${data.researchRepo}\n`,
            )
          : envContent + `\nGITHUB_REPO=${data.researchRepo}`;
      }
      if (data.branch) {
        process.env.GITHUB_BRANCH = data.branch;
        envContent = envContent.includes('GITHUB_BRANCH=')
          ? envContent.replace(
              /GITHUB_BRANCH=.*\n?/,
              `GITHUB_BRANCH=${data.branch}\n`,
            )
          : envContent + `\nGITHUB_BRANCH=${data.branch}`;
      }
      if (data.path) {
        process.env.GITHUB_PATH = data.path;
        envContent = envContent.includes('GITHUB_PATH=')
          ? envContent.replace(
              /GITHUB_PATH=.*\n?/,
              `GITHUB_PATH=${data.path}\n`,
            )
          : envContent + `\nGITHUB_PATH=${data.path}`;
      }
      await fs.promises.writeFile('.env', envContent.trim());
      socket.emit('github-settings-saved', {
        message: 'GitHub research repository settings saved successfully',
      });
      const githubConfigured =
        !!process.env.GITHUB_TOKEN &&
        !!process.env.GITHUB_OWNER &&
        !!process.env.GITHUB_REPO;
      if (githubConfigured)
        socket.emit('plugin-status', { plugin: 'github', status: 'ACTIVE' });
    } catch (err) {
      console.error('Error saving GitHub settings:', err);
      socket.emit('config-error', {
        message: 'Failed to save GitHub settings',
      });
    }
  });

  socket.on('save-github-memory-settings', async data => {
    try {
      if (!global.githubSettings) global.githubSettings = {};
      if (data.owner) global.githubSettings.owner = data.owner;
      if (data.memoryRepo) global.githubSettings.memoryRepo = data.memoryRepo;
      if (data.branch) global.githubSettings.memoryBranch = data.branch;
      if (data.path) global.githubSettings.memoryPath = data.path;
      const configPath = path.join(__dirname, 'config.json');
      let config = {};
      try {
        const configContent = await fs.promises.readFile(configPath, 'utf8');
        config = JSON.parse(configContent);
      } catch (err) {
        config = {};
      }
      config.githubSettings = global.githubSettings;
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
      let envContent = '';
      try {
        envContent = await fs.promises.readFile('.env', 'utf8');
      } catch (err) {
        envContent = '';
      }
      if (data.memoryRepo) {
        process.env.GITHUB_MEMORY_REPO = data.memoryRepo;
        envContent = envContent.includes('GITHUB_MEMORY_REPO=')
          ? envContent.replace(
              /GITHUB_MEMORY_REPO=.*\n?/,
              `GITHUB_MEMORY_REPO=${data.memoryRepo}\n`,
            )
          : envContent + `\nGITHUB_MEMORY_REPO=${data.memoryRepo}`;
      }
      if (data.branch) {
        process.env.GITHUB_MEMORY_BRANCH = data.branch;
        envContent = envContent.includes('GITHUB_MEMORY_BRANCH=')
          ? envContent.replace(
              /GITHUB_MEMORY_BRANCH=.*\n?/,
              `GITHUB_MEMORY_BRANCH=${data.branch}\n`,
            )
          : envContent + `\nGITHUB_MEMORY_BRANCH=${data.branch}`;
      }
      if (data.path) {
        process.env.GITHUB_MEMORY_PATH = data.path;
        envContent = envContent.includes('GITHUB_MEMORY_PATH=')
          ? envContent.replace(
              /GITHUB_MEMORY_PATH=.*\n?/,
              `GITHUB_MEMORY_PATH=${data.path}\n`,
            )
          : envContent + `\nGITHUB_MEMORY_PATH=${data.path}`;
      }
      await fs.promises.writeFile('.env', envContent.trim());
      socket.emit('github-memory-settings-saved', {
        message: 'GitHub memory repository settings saved successfully',
      });
    } catch (err) {
      console.error('Error saving GitHub memory settings:', err);
      socket.emit('config-error', {
        message: 'Failed to save GitHub memory settings',
      });
    }
  });

  // ----------------------------
  // System & Terminal AI Events
  // ----------------------------
  socket.on('get-system-stats', () => {
    socket.emit('system-stats', getSystemStats());
  });

  socket.on('terminal:ai-message', async (data, callback) => {
    try {
      const terminalAI = await import('./src/coreai/mgmt/terminalAI.js');
      const response = await terminalAI.processTerminalMessage(
        data.message,
        data.history || [],
      );
      callback(response);
    } catch (error) {
      console.error('Error processing terminal AI message:', error);
      callback({
        success: false,
        response: `Error: ${error.message || 'Unknown error'}`,
      });
    }
  });

  socket.on('fetch-venice-models', async () => {
    try {
      const { fetchAvailableModels } = await import(
        './src/coreai/mgmt/terminalAI.js'
      );
      const modelsResponse = await fetchAvailableModels();
      socket.emit('venice-models', modelsResponse);
    } catch (error) {
      console.error('Error handling fetch-venice-models:', error);
      socket.emit('venice-models', {
        success: false,
        error: error.message || 'Failed to fetch models',
      });
    }
  });

  socket.on('chat-message', async (message, options = {}) => {
    try {
      const { processTerminalMessage } = await import(
        './src/coreai/mgmt/terminalAI.js'
      );
      const response = await processTerminalMessage(message, [], options);
      socket.emit('chat-response', response);
      if (response.reasoning) {
        socket.emit('chat-reasoning', {
          success: true,
          reasoning: response.reasoning,
        });
      }
    } catch (error) {
      console.error('Error processing chat message:', error);
      socket.emit('chat-response', {
        success: false,
        response: error.message || 'Error processing your message',
      });
    }
  });

  // ----------------------------
  // Middleware for Research Thought Process
  // ----------------------------
  socket.use((packet, next) => {
    if (packet[0] === 'research-thought' && packet[1]) {
      const timestamp = new Date().toLocaleTimeString();
      const thought = `[${timestamp}] ${packet[1].thought}`;
      socket.emit('research-status', {
        progress: packet[1].progress || 0,
        message: packet[1].message || 'Processing...',
        thoughtProcess: thought,
        stage: packet[1].stage || 'researching',
      });
      socket.emit('research-thought', {
        thought,
        stage: packet[1].stage || 'researching',
      });
      console.log(`Research thought: ${packet[1].thought}`);
    }
    next();
  });

  // ----------------------------
  // Disconnect Handler
  // ----------------------------
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  // ----------------------------
  // Task Scheduler Socket Handlers
  // ----------------------------
  socket.on('self:get-tasks', async (callback) => {
    try {
      if (!global.taskScheduler) {
        await initScheduler();
      }

      if (!global.taskScheduler) {
        throw new Error('Task scheduler not initialized');
      }

      const tasks = global.taskScheduler.getPrioritizedTasks();
      callback({ success: true, tasks });
    } catch (error) {
      console.error('Error getting tasks:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:create-task', async (data, callback) => {
    try {
      if (!global.taskScheduler) {
        await initScheduler();
      }

      if (!global.taskScheduler) {
        throw new Error('Task scheduler not initialized');
      }

      const result = await global.taskScheduler.createTask(data);
      callback(result);
    } catch (error) {
      console.error('Error creating task:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:execute-task', async (data, callback) => {
    try {
      if (!global.taskScheduler) {
        await initScheduler();
      }

      if (!global.taskScheduler) {
        throw new Error('Task scheduler not initialized');
      }

      const result = await global.taskScheduler.executeTask(data.taskPath);
      callback(result);
    } catch (error) {
      console.error('Error executing task:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:cancel-task', async (data, callback) => {
    try {
      if (!global.taskScheduler) {
        await initScheduler();
      }

      if (!global.taskScheduler) {
        throw new Error('Task scheduler not initialized');
      }

      const result = await global.taskScheduler.cancelTask(data.taskPath);
      callback(result);
    } catch (error) {
      console.error('Error cancelling task:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:delete-task', async (data, callback) => {
    try {
      if (!global.taskScheduler) {
        await initScheduler();
      }

      if (!global.taskScheduler) {
        throw new Error('Task scheduler not initialized');
      }

      // Path check and validation
      if (!data.taskPath) {
        throw new Error('Task path is required');
      }

      // Use fs to delete the file directly if the scheduler doesn't have the method
      if (typeof global.taskScheduler.deleteTask !== 'function') {
        try {
          await fs.promises.unlink(data.taskPath);
          console.log(`Task file deleted: ${data.taskPath}`);
          callback({ success: true, message: `Task deleted: ${data.taskPath}` });
          return;
        } catch (fsError) {
          console.error('Error deleting task file:', fsError);
          throw new Error(`Failed to delete task file: ${fsError.message}`);
        }
      } else {
        const result = await global.taskScheduler.deleteTask(data.taskPath);
        callback(result);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:view-task', async (data, callback) => {
    try {
      if (!global.taskScheduler) {
        await initScheduler();
      }

      if (!global.taskScheduler) {
        throw new Error('Task scheduler not initialized');
      }

      // Path check and validation
      if (!data.taskPath) {
        throw new Error('Task path is required');
      }

      // If the scheduler doesn't have the viewTask method, implement a basic one
      if (typeof global.taskScheduler.viewTask !== 'function') {
        try {
          const content = await fs.promises.readFile(data.taskPath, 'utf8');
          callback({
            success: true,
            content,
            path: data.taskPath
          });
          return;
        } catch (fsError) {
          throw new Error(`Failed to read task file: ${fsError.message}`);
        }
      } else {
        const result = await global.taskScheduler.viewTask(data.taskPath);
        callback(result);
      }
    } catch (error) {
      console.error('Error viewing task:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:pull-tasks-from-github', async (callback) => {
    try {
      if (!global.taskScheduler) {
        await initScheduler();
      }

      if (!global.taskScheduler) {
        throw new Error('Task scheduler not initialized');
      }

      // Check for properly configured GitHub integration
      if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
        throw new Error('GitHub is not properly configured. Please set up GitHub integration first.');
      }

      // If scheduler doesn't have the method, use the selfIntegration module directly
      if (typeof global.taskScheduler.pullTasksFromGitHub !== 'function') {
        const { pullFilesFromGitHub } = await import('./src/coreai/mgmt/selfIntegration.js');
        const tasksDir = 'missions/tasks';
        const result = await pullFilesFromGitHub(tasksDir);
        callback({ 
          success: true, 
          count: result.count || 0,
          message: `Pulled ${result.count || 0} tasks from GitHub` 
        });
        return;
      }

      const result = await global.taskScheduler.pullTasksFromGitHub();
      callback(result);
    } catch (error) {
      console.error('Error pulling tasks from GitHub:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:push-tasks-to-github', async (callback) => {
    try {
      if (!global.taskScheduler) {
        await initScheduler();
      }

      if (!global.taskScheduler) {
        throw new Error('Task scheduler not initialized');
      }

      // Check for properly configured GitHub integration
      if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
        throw new Error('GitHub is not properly configured. Please set up GitHub integration first.');
      }

      // If scheduler doesn't have the method, use the selfIntegration module directly
      if (typeof global.taskScheduler.pushTasksToGitHub !== 'function') {
        const { syncDirectoryToGitHub } = await import('./src/coreai/mgmt/selfIntegration.js');
        const tasksDir = 'missions/tasks';
        const result = await syncDirectoryToGitHub(tasksDir, 'Sync tasks to GitHub');
        callback({ 
          success: true, 
          count: result.count || 0,
          message: `Pushed ${result.count || 0} tasks to GitHub` 
        });
        return;
      }

      const result = await global.taskScheduler.pushTasksToGitHub();
      callback(result);
    } catch (error) {
      console.error('Error pushing tasks to GitHub:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:sync-tasks-with-github', async (callback) => {
    try {
      if (!global.taskScheduler) {
        await initScheduler();
      }

      if (!global.taskScheduler) {
        throw new Error('Task scheduler not initialized');
      }

      // First pull tasks from GitHub
      const pullResult = await global.taskScheduler.pullTasksFromGitHub();

      // Then push local tasks to GitHub
      const pushResult = await global.taskScheduler.pushTasksToGitHub();

      callback({
        success: true,
        pull: pullResult,
        push: pushResult,
        message: `Synchronized tasks with GitHub. Downloaded ${pullResult.count}, uploaded ${pushResult.count} tasks.`
      });
    } catch (error) {
      console.error('Error synchronizing tasks with GitHub:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:check-scheduler-status', async (callback) => {
    try {
      if (!global.taskScheduler) {
        await initScheduler();
      }

      if (!global.taskScheduler) {
        callback({
          success: true,
          active: false
        });
        return;
      }

      const status = global.taskScheduler.getStatus();
      callback({
        success: true,
        active: status.isActive,
        lastRun: status.lastRun
      });
    } catch (error) {
      console.error('Error checking scheduler status:', error);
      callback({
        success: false,
        error: error.message,
        active: false
      });
    }
  });

  socket.on('self:start-scheduler', async (callback) => {
    try {
      if (!global.taskScheduler) {
        await initScheduler();
      }

      if (!global.taskScheduler) {
        throw new Error('Failed to initialize task scheduler');
      }

      const result = global.taskScheduler.start();

      // Check if callback is a function before calling it
      if (typeof callback === 'function') {
        callback({ success: true, message: 'Scheduler started successfully' });
      } else {
        console.log('Scheduler started successfully');
      }
    } catch (error) {
      console.error('Error starting scheduler:', error);

      // Check if callback is a function before calling it
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('self:stop-scheduler', async (callback) => {
    try {
      if (!global.taskScheduler) {
        throw new Error('Task scheduler not initialized');
      }

      // Check if the scheduler has a stop method
      if (typeof global.taskScheduler.stop === 'function') {
        global.taskScheduler.stop();
      } else {
        // If no stop method exists, we'll implement a basic one by setting isActive to false
        global.taskScheduler.isActive = false;
      }

      // Check if callback is a function before calling it
      if (typeof callback === 'function') {
        callback({ success: true, message: 'Scheduler stopped successfully' });
      } else {
        console.log('Scheduler stopped successfully');
      }
    } catch (error) {
      console.error('Error stopping scheduler:', error);

      // Check if callback is a function before calling it
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('self:save-module', async (data, callback) => {
    try {
      if (!data.path || !data.content) {
        return callback({ success: false, error: 'Path and content are required' });
      }

      const { saveSelfModuleToGitHub } = await import('./src/coreai/mgmt/selfIntegration.js');
      const result = await saveSelfModuleToGitHub({
        path: data.path,
        content: data.content,
        message: data.message || `Update ${data.path}`
      });

      callback(result);
    } catch (error) {
      console.error('Error saving module:', error);
      callback({ success: false, error: error.message });
    }
  });

  // Prompt management socket handlers
  socket.on('self:get-prompts', async (callback) => {
    try {
      const promptManager = await import('./src/coreai/mgmt/promptManager.js');

      callback({
        success: true,
        prompts: {
          research: {
            active: promptManager.getActivePrompt('research'),
            selectedPath: promptManager.getSelectedPromptPath('research'),
            usingDefault: !promptManager.getSelectedPromptPath('research')
          },
          terminal: {
            active: promptManager.getActivePrompt('terminal'),
            selectedPath: promptManager.getSelectedPromptPath('terminal'),
            usingDefault: !promptManager.getSelectedPromptPath('terminal')
          }
        }
      });
    } catch (error) {
      console.error('Error getting prompts:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:load-default-prompt', async (data, callback) => {
    try {
      const { type } = data;

      if (type !== 'research' && type !== 'terminal') {
        return callback({ success: false, error: 'Invalid prompt type' });
      }

      const promptManager = await import('./src/coreai/mgmt/promptManager.js');
      const prompt = await promptManager.loadDefaultPrompt(type);

      callback({
        success: true,
        prompt,
        message: `Loaded default ${type} prompt`
      });
    } catch (error) {
      console.error('Error loading default prompt:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:set-prompt', async (data, callback) => {
    try {
      const { type, path, useDefault } = data;

      if (type !== 'research' && type !== 'terminal') {
        return callback({ success: false, error: 'Invalid prompt type' });
      }

      const promptManager = await import('./src/coreai/mgmt/promptManager.js');

      if (useDefault) {
        await promptManager.resetToDefaultPrompt(type);
        return callback({ success: true, message: `Reset to default ${type} prompt` });
      }

      if (!path) {
        return callback({ success: false, error: 'No prompt path provided' });
      }

      await promptManager.loadPrompt(type, path);
      callback({ success: true, message: `Set ${type} prompt to ${path}` });
    } catch (error) {
      console.error('Error setting prompt:', error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('self:save-prompt', async (data, callback) => {
    try {
      const { type, content, name } = data;

      if (!type || (type !== 'research' && type !== 'terminal')) {
        return callback({ success: false, error: 'Invalid prompt type' });
      }

      if (!content) {
        return callback({ success: false, error: 'No prompt content provided' });
      }

      if (!name) {
        return callback({ success: false, error: 'No prompt name provided' });
      }

      const promptManager = await import('./src/coreai/mgmt/promptManager.js');
      const result = await promptManager.savePromptToGitHub(type, content, name);

      if (result.success) {
        // Automatically set to use this prompt
        await promptManager.loadPrompt(type, result.path);

        callback({
          success: true,
          path: result.path,
          message: `${type.charAt(0).toUpperCase() + type.slice(1)} prompt saved and activated`
        });
      } else {
        callback({
          success: false,
          error: result.error || 'Failed to save prompt'
        });
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      callback({ success: false, error: error.message });
    }
  });

  // ----------------------------
  // Self-Integration Socket Handlers
  // ----------------------------

  socket.on('self:verify-connection', async (data, callback) => {
    try {
      // Check if GitHub token and settings are configured
      const githubConfigured = !!process.env.GITHUB_TOKEN &&
                               !!process.env.GITHUB_OWNER &&
                               !!process.env.GITHUB_REPO;

      if (!githubConfigured) {
        callback({
          connected: false,
          error: 'GitHub configuration is incomplete. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.'
        });
        return;
      }

      // Try to verify connection by actually calling the GitHub API
      try {
        const { verifyGitHubConfig } = await import('./src/coreai/mgmt/selfIntegration.js');
        const isValid = await verifyGitHubConfig();

        if (isValid) {
          callback({
            connected: true,
            user: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            branch: process.env.GITHUB_BRANCH || 'main'
          });
        } else {
          callback({
            connected: false,
            error: 'GitHub API connection failed. Please check your token and permissions.'
          });
        }
      } catch (apiError) {
        callback({
          connected: false,
          error: `GitHub API error: ${apiError.message}`
        });
      }
    } catch (error) {
      console.error('Error verifying GitHub connection:', error);
      callback({
        connected: false, 
        error: error.message || 'Unknown error verifying GitHub connection'
      });
    }
  });

  // Memory system connection verification
  socket.on('memory:verify-connection', async (data, callback) => {
    try {
      const coreMemoryAI = await getCoreMemoryAI();
      const initialized = coreMemoryAI.initialized;

      if (initialized) {
        callback({ connected: true });
      } else {
        callback({ connected: false, error: 'Memory system not initialized' });
      }
    } catch (error) {
      console.error('Error verifying memory system connection:', error);
      callback({ connected: false, error: error.message });
    }
  });

  // Get memory
  socket.on('memory:get-memory', async (data, callback) => {
    try {
      const { type } = data;

      if (!type) {
        return callback({
          success: false,
          error: 'Memory type is required'
        });
      }

      const coreMemoryAI = await getCoreMemoryAI();

      if (!coreMemoryAI.initialized) {
        return callback({
          success: false,
          error: 'Memory system not initialized'
        });
      }

      // Get memory from cache
      const content = coreMemoryAI.memoryCache[type];

      callback({
        success: true,
        content
      });
    } catch (error) {
      console.error('Error getting memory:', error);
      callback({
        success: false,
        error: error.message
      });
    }
  });

  // Process memory query
  socket.on('memory:process-query', async (data, callback) => {
    try {
      const { query, memoryContext, options } = data;

      if (!query) {
        return callback({
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

      callback(result);
    } catch (error) {
      console.error('Error processing memory query:', error);
      callback({
        success: false,
        error: error.message
      });
    }
  });

  // Run memory maintenance
  socket.on('memory:run-maintenance', async (data, callback) => {
    try {
      // Get core memory AI
      const coreMemoryAI = await getCoreMemoryAI();

      // Run maintenance
      const result = await coreMemoryAI.runMaintenance();

      callback({
        success: result,
        message: result ? 'Memory maintenance completedsuccessfully' : 'Memory maintenance failed'
      });
    } catch (error) {
      console.error('Error running memory maintenance:', error);
      callback({
        success: false,
        error: error.message
      });
    }
  });

  // Get memory metadata (size, consolidation status)
  socket.on('memory:get-metadata', async (data, callback) => {
    try {
      const { type } = data;
      const coreMemoryAI = await getCoreMemoryAI();

      if (!coreMemoryAI) {
        return callback({
          success: false,
          error: 'Memory system not initialized'
        });
      }

      // Get memory content to calculate size
      const memoryType = type.replace('-', '_');
      const content = coreMemoryAI.memoryCache[memoryType];

      // Calculate size - safely handle undefined content
      let size = 0;
      if (content !== undefined) {
        size = typeof content === 'string'
          ? content.length
          : JSON.stringify(content || {}).length;
      }

      // Calculate consolidation percentage
      const limit = coreMemoryAI.config.memoryStorageLimits?.[memoryType] || 100000;
      const percentage = Math.round((size / limit) * 100);

      callback({
        success: true,
        size,
        limit,
        consolidationStatus: percentage >= 75 ? 'needed' : 'not needed',
        percentage
      });
    } catch (error) {
      console.error('Error getting memory metadata:', error);
      callback({
        success: false,
        error: error.message
      });
    }
  });

  // Check if this is first run (no memories yet)
  socket.on('memory:check-first-run', async (data, callback) => {
    try {
      const coreMemoryAI = await getCoreMemoryAI();

      if (!coreMemoryAI) {
        return callback({
          success: false,
          error: 'Memory system not initialized',
          firstRun: true
        });
      }

      // Check if any memory type has content
      const hasContent = Object.values(coreMemoryAI.memoryCache).some(content => {
        if (typeof content === 'string') {
          return content.trim().length > 0;
        }
        return Object.keys(content || {}).length > 0;
      });

      callback({
        success: true,
        firstRun: !hasContent
      });
    } catch (error) {
      console.error('Error checking first run status:', error);
      callback({
        success: false,
        error: error.message,
        firstRun: true
      });
    }
  });

  // Toggle memory type enabled/disabled
  socket.on('memory:toggle-memory', async (data, callback) => {
    try {
      const { type, enabled } = data;
      const coreMemoryAI = await getCoreMemoryAI();

      if (!coreMemoryAI) {
        return callback({
          success: false,
          error: 'Memory system not initialized'
        });
      }

      // In production, this would update the actual memory configuration
      // For this implementation, we'll just acknowledge the change
      console.log(`Memory type ${type} ${enabled ? 'enabled' : 'disabled'}`);

      callback({
        success: true
      });
    } catch (error) {
      console.error('Error toggling memory type:', error);
      callback({
        success: false,
        error: error.message
      });
    }
  });

  // Apply memory profile
  socket.on('memory:apply-profile', async (data, callback) => {
    try {
      const { profile } = data;
      const coreMemoryAI = await getCoreMemoryAI();

      if (!coreMemoryAI) {
        return callback({
          success: false,
          error: 'Memory system not initialized'
        });
      }

      // Define memory profiles
      const profiles = {
        default: {
          shortTerm: { enabled: true },
          longTerm: { enabled: true },
          episodic: { enabled: true },
          semantic: { enabled: true },
          procedural: { enabled: true },
          working: { enabled: true }
        },
        minimal: {
          shortTerm: { enabled: true },
          longTerm: { enabled: false },
          episodic: { enabled: false },
          semantic: { enabled: false },
          procedural: { enabled: false },
          working: { enabled: true }
        },
        comprehensive: {
          shortTerm: { enabled: true },
          longTerm: { enabled: true },
          episodic: { enabled: true },
          semantic: { enabled: true },
          procedural: { enabled: true },
          working: { enabled: true }
        }
      };

      const selectedProfile = profiles[profile] || profiles.default;

      // In production, this would update the actual memory configuration
      console.log(`Applied memory profile: ${profile}`);

      callback({
        success: true,
        config: selectedProfile
      });
    } catch (error) {
      console.error('Error applying memory profile:', error);
      callback({
        success: false,
        error: error.message
      });
    }
  });

  // Process memory query (natural language query against memory)
  socket.on('memory:process-query', async (data, callback) => {
    try {
      const { query, aiSystem } = data;
      const coreMemoryAI = await getCoreMemoryAI();

      if (!coreMemoryAI) {
        return callback({
          success: false,
          error: 'Memory system not initialized'
        });
      }

      // Retrieve memory relevant to the query
      const memoryResponse = await coreMemoryAI.retrieveMemory(aiSystem, query);

      if (!memoryResponse.success) {
        return callback({
          success: false,
          error: memoryResponse.error || 'Failed to retrieve memory'
        });
      }

      callback({
        success: true,
        result: memoryResponse.memory
      });
    } catch (error) {
      console.error('Error processing memory query:', error);
      callback({
        success: false,
        error: error.message
      });
    }
  });

  // Store memory
  socket.on('memory:store-memory', async (data, callback) => {
    try {
      const { aiSystem, memoryType, content } = data;
      const coreMemoryAI = await getCoreMemoryAI();

      if (!coreMemoryAI) {
        return callback({
          success: false,
          error: 'Memory system not initialized'
        });
      }

      // Store the memory
      const result = await coreMemoryAI.storeMemory(aiSystem, memoryType, content);

      callback({
        success: result.success,
        error: result.error,
        message: result.message
      });
    } catch (error) {
      console.error('Error storing memory:', error);
      callback({
        success: false,
        error: error.message
      });
    }
  });

  socket.on('terminal:send-message', async (data) => {
    try {
      const { message } = data;
      console.log(`Processing terminal AI message: "${message}"`);

      const response = await aiManager.processTerminalMessage(message);

      // Emit the AI response
      io.emit('terminal:ai-response', { message: response });
    } catch (error) {
      console.error('Error processing terminal message:', error);
      io.emit('terminal:error', { message: `Error: ${error.message}` });
    }
  });

  // When a chat session ends, create memories from the conversation
  socket.on('terminal:end-chat', async (data) => {
    try {
      console.log('Chat session ended, creating memories...');

      // Import the memory validator
      const { createMemoriesFromChat } = await import('./src/memory/memory-validator.js');

      // Create memories from the chat data
      const result = await createMemoriesFromChat(data);

      if (result.success) {
        io.emit('terminal:system-message', { message: 'CORE Memory Meta Validator has created new memories from your conversation.' });
      } else {
        console.error('Failed to create memories from chat:', result.message);
      }
    } catch (error) {
      console.error('Error creating memories from chat:', error);
    }
  });
});

// ======================================================
// Helper Functions
// ======================================================
function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '< 1m';
}

function getSystemStats() {
  // Get actual CPU usage by sampling load averages
  const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;

  // For disk, we'll use a simple check of the current directory
  // This is a basic implementation that could be improved with a more thorough disk check
  let diskUsage = 0;
  try {
    const { execSync } = require('child_process');
    const diskData = execSync('df -k . | tail -1').toString();
    const diskParts = diskData.trim().split(/\s+/);
    if (diskParts.length >= 5) {
      diskUsage = parseInt(diskParts[4].replace('%', ''), 10);
    }
  } catch (error) {
    console.error('Error getting disk usage:', error);
  }

  return {
    memory: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
    cpu: Math.round(cpuUsage),
    disk: diskUsage,
    uptime: formatUptime(os.uptime()),
  };
}

async function checkAPIStatus() {
  const veniceApiKey = process.env.VENICE_API_KEY;
  const braveKey =
    process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const githubConfig = {
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH,
    path: process.env.GITHUB_PATH,
  };
  const githubConfigured =
    !!githubToken && !!githubConfig.owner && !!githubConfig.repo;
  return {
    venice: !!veniceApiKey,
    brave: !!braveKey,
    github: githubConfigured,
  };
}

// ======================================================
// Initialize Mission Scheduler
// ======================================================
const initScheduler = async () => {
  try {
    // Use dynamic import with cache-busting parameter
    const schedulerModule = await import('./src/coreai/mgmt/scheduler.js?v=' + Date.now());
    const taskScheduler = schedulerModule.initializeTaskScheduler();
    console.log('Mission scheduler initialized successfully');

    // Create a global reference for socket handlers to access
    global.taskScheduler = taskScheduler;

    return taskScheduler;
  } catch (error) {
    console.error('Failed to initialize mission scheduler:', error);
    // Log detailed error for debugging
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    return null;
  }
};

// ======================================================
//// Start Server
// ======================================================
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);

  // Check and trim GitHub environment variables
  if (process.env.GITHUB_TOKEN) process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN.trim();
  if (process.env.GITHUB_OWNER) process.env.GITHUB_OWNER = process.env.GITHUB_OWNER.trim();
  if (process.env.GITHUB_REPO) process.env.GITHUB_REPO = process.env.GITHUB_REPO.trim();
  if (process.env.GITHUB_BRANCH) process.env.GITHUB_BRANCH = process.env.GITHUB_BRANCH.trim();

  // Check GitHub configuration
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
    console.warn('GitHub configuration incomplete. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in environment variables');
  } else {
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    const githubBranch = process.env.GITHUB_BRANCH || 'main';
    const githubPath = process.env.GITHUB_PATH || 'research';
    console.log(`GitHub configuration found: ${githubOwner}/${githubRepo} (${githubBranch})`);
    console.log(`Using path: ${githubPath}`);
  }

  // Initialize mission scheduler after server starts
  initScheduler().then(scheduler => {
    if (scheduler) {
      console.log('Mission scheduler started successfully');
      // Start checking for scheduled tasks
      scheduler.start();
    } else {
      console.error('Failed to start mission scheduler');
    }
  });
});

// End of server.js