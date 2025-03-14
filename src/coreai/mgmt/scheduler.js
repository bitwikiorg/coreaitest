/**
 * Task Scheduler
 * Manages async research tasks, scheduling, and execution
 */

import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Singleton instance for task scheduler
let taskSchedulerInstance = null;

// Task status constants
const TASK_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress', 
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled'
};

// Priority levels
const PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3
};

/**
 * Initialize the task scheduler
 * @returns {TaskScheduler} Instance of the task scheduler
 */
export function initializeTaskScheduler() {
  if (!taskSchedulerInstance) {
    taskSchedulerInstance = new TaskScheduler();
  }
  return taskSchedulerInstance;
}

/**
 * Task Scheduler Class
 * Manages research mission scheduling and execution
 */
class TaskScheduler {
  constructor() {
    this.tasks = [];
    this.isActive = false;
    this.lastRun = null;
    this.scheduledJobs = {};
    this.tasksDirectory = path.join(process.cwd(), 'missions', 'tasks');

    // Ensure the tasks directory exists
    this.ensureTasksDirectory();

    // Load tasks from disk on startup
    this.loadTasks();
  }

  /**
   * Get the scheduler status
   * @returns {Object} Status object with isActive and lastRun properties
   */
  getStatus() {
    return {
      isActive: this.isActive,
      lastRun: this.lastRun
    };
  }

  /**
   * Delete a task from the scheduler
   * @param {string} taskPath Path to the task file
   * @returns {Promise<Object>} Result of deletion
   */
  async deleteTask(taskPath) {
    try {
      // Remove from memory
      this.tasks = this.tasks.filter(task => task.path !== taskPath);

      // Delete file from disk
      const fs = await import('fs/promises');
      await fs.unlink(taskPath);

      return {
        success: true,
        message: `Task deleted: ${taskPath}`
      };
    } catch (error) {
      console.error(`Error deleting task ${taskPath}:`, error);
      return {
        success: false,
        error: `Failed to delete task: ${error.message}`
      };
    }
  }

  /**
   * Start the scheduler
   * @returns {boolean} Success status
   */
  start() {
    console.log('Starting task scheduler...');
    this.isActive = true;
    this.lastRun = new Date();

    // Set up cron job to check for tasks every minute
    if (!this.schedulerJob) {
      this.schedulerJob = cron.schedule('* * * * *', () => {
        this.checkScheduledTasks();
      });

      console.log('Task scheduler started');
    } else if (this.schedulerJob.isStopped) {
      this.schedulerJob.start();
    }

    // Emit status update
    if (global.io) {
      global.io.emit('self:activity', { 
        text: 'Task scheduler started',
        timestamp: new Date()
      });
    }

    return { isActive: this.isActive };
  }

  /**
   * Stops the scheduler
   */
  stop() {
    console.log('Stopping task scheduler...');
    this.isActive = false;

    if (this.schedulerJob) {
      this.schedulerJob.stop();
    }

    // Emit status update
    if (global.io) {
      global.io.emit('self:activity', { 
        text: 'Task scheduler stopped',
        timestamp: new Date()
      });
    }

    return { isActive: this.isActive };
  }

  /**
   * Ensure the tasks directory exists
   */
  async ensureTasksDirectory() {
    try {
      await fs.mkdir(this.tasksDirectory, { recursive: true });
    } catch (error) {
      console.error('Error creating tasks directory:', error);
    }
  }

  /**
   * Load tasks from the filesystem
   */
  async loadTasks() {
    try {
      const files = await fs.readdir(this.tasksDirectory);

      // Only process .md files
      const taskFiles = files.filter(file => file.endsWith('.md'));

      this.tasks = [];

      for (const file of taskFiles) {
        try {
          const filePath = path.join(this.tasksDirectory, file);
          const content = await fs.readFile(filePath, 'utf8');

          // Parse task metadata from markdown content
          const task = this.parseTaskContent(content, filePath);

          if (task) {
            this.tasks.push(task);
          }
        } catch (err) {
          console.error(`Error loading task ${file}:`, err);
        }
      }

      console.log(`Loaded ${this.tasks.length} tasks from filesystem`);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  /**
   * Schedule recurring tasks based on their schedule property
   */
  scheduleRecurringTasks() {
    // Clear existing scheduled jobs
    Object.values(this.scheduledJobs).forEach(job => {
      if (job && typeof job.stop === 'function') {
        job.stop();
      }
    });

    this.scheduledJobs = {};

    // Get pending tasks
    const pendingTasks = this.tasks.filter(task => 
      task.status === TASK_STATUS.PENDING && 
      task.schedule && 
      task.schedule !== 'Now' && 
      task.schedule !== 'As needed'
    );

    // Schedule each task
    pendingTasks.forEach(task => {
      const cronExpression = this.getCronExpression(task.schedule);

      if (cronExpression) {
        try {
          const job = cron.schedule(cronExpression, () => {
            this.executeTask(task.path);
          });

          this.scheduledJobs[task.path] = job;
          console.log(`Scheduled task ${task.path} with cron: ${cronExpression}`);
        } catch (error) {
          console.error(`Error scheduling task ${task.path}:`, error);
        }
      }
    });
  }

  /**
   * Convert human-readable schedule to cron expression
   * @param {string} schedule Human-readable schedule
   * @returns {string|null} Cron expression or null if invalid
   */
  getCronExpression(schedule) {
    switch (schedule) {
      case 'Every 5 minutes':
        return '*/5 * * * *';
      case 'Every 10 minutes':
        return '*/10 * * * *';
      case 'Every 15 minutes':
        return '*/15 * * * *';
      case 'Hourly':
        return '0 * * * *';
      case 'Daily':
        return '0 0 * * *';
      case 'Weekly':
        return '0 0 * * 0';
      case 'Monthly':
        return '0 0 1 * *';
      default:
        return null;
    }
  }

  /**
   * Parse task content from markdown
   * @param {string} content Markdown content
   * @param {string} filePath Path to the task file
   * @returns {Object|null} Task object or null if invalid
   */
  parseTaskContent(content, filePath) {
    try {
      // Extract title from first heading
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');

      // Extract status
      const statusMatch = content.match(/Status: (\w+)/);
      const status = statusMatch ? statusMatch[1] : TASK_STATUS.PENDING;

      // Extract priority
      const priorityMatch = content.match(/Priority: (\w+)/);
      let priority = PRIORITY.MEDIUM;
      if (priorityMatch) {
        if (priorityMatch[1].toLowerCase() === 'high') {
          priority = PRIORITY.HIGH;
        } else if (priorityMatch[1].toLowerCase() === 'low') {
          priority = PRIORITY.LOW;
        }
      }

      // Extract schedule
      const scheduleMatch = content.match(/Schedule: (.+)$/m);
      const schedule = scheduleMatch ? scheduleMatch[1] : 'As needed';

      // Extract description
      const descriptionMatch = content.match(/## Description\s+([\s\S]+?)(?=##|$)/);
      const description = descriptionMatch ? descriptionMatch[1].trim() : '';

      // Get the relative path for the task
      const relativePath = filePath.replace(process.cwd(), '');

      return {
        name: title,
        status,
        priority,
        schedule,
        description,
        path: relativePath
      };
    } catch (error) {
      console.error(`Error parsing task content for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get all tasks sorted by priority and status
   * @returns {Array} Array of prioritized tasks
   */
  getPrioritizedTasks() {
    return [...this.tasks].sort((a, b) => {
      // First sort by priority (high to low)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Then sort by status (pending first)
      if (a.status !== b.status) {
        if (a.status === TASK_STATUS.PENDING) return -1;
        if (b.status === TASK_STATUS.PENDING) return 1;
        if (a.status === TASK_STATUS.IN_PROGRESS) return -1;
        if (b.status === TASK_STATUS.IN_PROGRESS) return 1;
      }

      // Finally sort by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Create a new task
   * @param {Object} taskData Task data
   * @returns {Object} Result with success status
   */
  async createTask(taskData) {
    try {
      if (!taskData.task) {
        return { success: false, error: 'Task description is required' };
      }

      // Generate file name based on task
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const sanitizedTask = taskData.task.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '-');
      const fileName = `${sanitizedTask}-${timestamp}.md`;
      const filePath = path.join(this.tasksDirectory, fileName);

      // Generate file content
      const priority = taskData.priority || 'Medium';
      const schedule = taskData.schedule || 'As needed';

      let fileContent = `# ${taskData.task}\n\n`;
      fileContent += `Status: ${TASK_STATUS.PENDING}\n`;
      fileContent += `Priority: ${priority}\n`;
      fileContent += `Schedule: ${schedule}\n\n`;
      fileContent += `## Description\n\n${taskData.task}\n\n`;
      fileContent += `## Execution Log\n`;

      // Write file
      await fs.writeFile(filePath, fileContent, 'utf8');

      // Get the relative path for the task
      const relativePath = filePath.replace(process.cwd(), '');

      // Add to tasks array
      const newTask = {
        name: taskData.task,
        status: TASK_STATUS.PENDING,
        priority: priority === 'High' ? PRIORITY.HIGH : (priority === 'Low' ? PRIORITY.LOW : PRIORITY.MEDIUM),
        schedule,
        description: taskData.task,
        path: relativePath
      };

      this.tasks.push(newTask);

      // If scheduler is active and task has a recurring schedule, add it to scheduled jobs
      if (this.isActive && schedule !== 'Now' && schedule !== 'As needed') {
        const cronExpression = this.getCronExpression(schedule);
        if (cronExpression) {
          const job = cron.schedule(cronExpression, () => {
            this.executeTask(newTask.path);
          });
          this.scheduledJobs[newTask.path] = job;
        }
      }

      console.log(`Task created: ${relativePath}`);

      return { 
        success: true, 
        message: 'Task created successfully',
        path: relativePath,
        task: newTask
      };
    } catch (error) {
      console.error('Error creating task:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a task
   * @param {string} taskPath Path to the task file
   * @returns {Object} Result with success status
   */
  async executeTask(taskPath) {
    try {
      // Find the task in our array
      const taskIndex = this.tasks.findIndex(t => t.path === taskPath);

      if (taskIndex === -1) {
        return { success: false, error: 'Task not found' };
      }

      const task = this.tasks[taskIndex];

      // If task is not pending, don't execute
      if (task.status !== TASK_STATUS.PENDING) {
        return { 
          success: false, 
          error: `Task is ${task.status.toLowerCase()}, not pending` 
        };
      }

      // Get the full file path
      const filePath = path.join(process.cwd(), taskPath);

      // Update task status to in progress
      const updatedTask = { ...task, status: TASK_STATUS.IN_PROGRESS };
      this.tasks[taskIndex] = updatedTask;

      // Update the file
      await this.updateTaskStatus(filePath, TASK_STATUS.IN_PROGRESS);
      await this.appendToTaskLog(filePath, `Starting research: "${task.description}"`);

      // Check if description contains a research command
      const researchMatch = task.description.match(/research\s+"([^"]+)"\s+depth\s+(\d+)\s+breadth\s+(\d+)/);

      if (researchMatch) {
        const query = researchMatch[1];
        const depth = parseInt(researchMatch[2], 10);
        const breadth = parseInt(researchMatch[3], 10);

        try {
          // Import research module dynamically
          const { default: runResearch } = await import('../../runResearch.js');

          // Execute research
          await this.appendToTaskLog(filePath, `Starting research: "${query}" with depth ${depth}, breadth ${breadth}`);

          // Run the research
          const result = await runResearch(query, depth, breadth);

          if (result.success) {
            // Update task status to completed
            await this.updateTaskStatus(filePath, TASK_STATUS.COMPLETED);
            await this.appendToTaskLog(filePath, `Research completed: ${result.output}`);
            this.tasks[taskIndex].status = TASK_STATUS.COMPLETED;
          } else {
            // Update task status to failed
            await this.updateTaskStatus(filePath, TASK_STATUS.FAILED);
            await this.appendToTaskLog(filePath, `Research error: ${result.error}`);
            this.tasks[taskIndex].status = TASK_STATUS.FAILED;
          }
        } catch (error) {
          console.error('Error executing research:', error);
          await this.updateTaskStatus(filePath, TASK_STATUS.FAILED);
          await this.appendToTaskLog(filePath, `Research error: ${error.message}`);
          this.tasks[taskIndex].status = TASK_STATUS.FAILED;

          return { success: false, error: error.message };
        }
      } else {
        // Not a research task, try generic execution
        try {
          // Execute the task based on its description
          await this.appendToTaskLog(filePath, `Executing task: ${task.description}`);

          // Mark task as completed
          await this.updateTaskStatus(filePath, TASK_STATUS.COMPLETED);
          await this.appendToTaskLog(filePath, `Task completed successfully`);
          this.tasks[taskIndex].status = TASK_STATUS.COMPLETED;
        } catch (error) {
          console.error('Error executing task:', error);
          await this.updateTaskStatus(filePath, TASK_STATUS.FAILED);
          await this.appendToTaskLog(filePath, `Execution error: ${error.message}`);
          this.tasks[taskIndex].status = TASK_STATUS.FAILED;

          return { success: false, error: error.message };
        }
      }

      return { success: true, message: 'Task executed successfully' };
    } catch (error) {
      console.error('Error executing task:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a task
   * @param {string} taskPath Path to the task file
   * @returns {Object} Result with success status
   */
  async cancelTask(taskPath) {
    try {
      // Find the task in our array
      const taskIndex = this.tasks.findIndex(t => t.path === taskPath);

      if (taskIndex === -1) {
        return { success: false, error: 'Task not found' };
      }

      const task = this.tasks[taskIndex];

      // If task is already completed, failed, or cancelled, don't cancel
      if (task.status === TASK_STATUS.COMPLETED || 
          task.status === TASK_STATUS.FAILED || 
          task.status === TASK_STATUS.CANCELLED) {
        return { 
          success: false, 
          error: `Task is already ${task.status.toLowerCase()}` 
        };
      }

      // Get the full file path
      const filePath = path.join(process.cwd(), taskPath);

      // Update task status to cancelled
      await this.updateTaskStatus(filePath, TASK_STATUS.CANCELLED);
      await this.appendToTaskLog(filePath, `Task was manually cancelled`);

      // Update in memory
      this.tasks[taskIndex].status = TASK_STATUS.CANCELLED;

      // If task is scheduled, cancel the job
      if (this.scheduledJobs[taskPath]) {
        this.scheduledJobs[taskPath].stop();
        delete this.scheduledJobs[taskPath];
      }

      console.log(`Task cancelled: ${taskPath}`);

      return { success: true, message: 'Task cancelled successfully' };
    } catch (error) {
      console.error('Error cancelling task:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a task
   * @param {string} taskPath Path to the task file
   * @returns {Object} Result with success status
   */
  async deleteTask2(taskPath) {
    try {
      // Find the task in our array
      const taskIndex = this.tasks.findIndex(t => t.path === taskPath);

      if (taskIndex === -1) {
        return { success: false, error: 'Task not found' };
      }

      // Get the full file path
      const filePath = path.join(process.cwd(), taskPath);

      // If task is scheduled, cancel the job
      if (this.scheduledJobs[taskPath]) {
        this.scheduledJobs[taskPath].stop();
        delete this.scheduledJobs[taskPath];
      }

      // Delete the file
      await fs.unlink(filePath);

      // Remove from tasks array
      this.tasks.splice(taskIndex, 1);

      console.log(`Task deleted: ${taskPath}`);

      return { success: true, message: 'Task deleted successfully' };
    } catch (error) {
      console.error('Error deleting task:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update task status in the file
   * @param {string} filePath Path to the task file
   * @param {string} status New status
   */
  async updateTaskStatus(filePath, status) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const updatedContent = content.replace(/Status: (\w+)/, `Status: ${status}`);
      await fs.writeFile(filePath, updatedContent, 'utf8');
    } catch (error) {
      console.error(`Error updating task status for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Append to task execution log
   * @param {string} filePath Path to the task file
   * @param {string} message Log message
   */
  async appendToTaskLog(filePath, message) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const timestamp = new Date().toISOString();
      const logEntry = `\n### ${timestamp}\n${message}\n`;

      // Check if Execution Log section exists
      if (content.includes('## Execution Log')) {
        // Append to existing log section
        const updatedContent = content.replace(/## Execution Log[\s\S]*$/, `## Execution Log${logEntry}`);
        await fs.writeFile(filePath, updatedContent, 'utf8');
      } else {
        // Create log section and append
        const updatedContent = `${content}\n## Execution Log${logEntry}`;
        await fs.writeFile(filePath, updatedContent, 'utf8');
      }
    } catch (error) {
      console.error(`Error appending to task log for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * View a task
   * @param {string} taskPath Path to the task file
   * @returns {Object} Result with task content
   */
  async viewTask(taskPath) {
    try {
      // Get the full file path
      const filePath = path.join(process.cwd(), taskPath);

      // Read the file
      const content = await fs.readFile(filePath, 'utf8');

      return { 
        success: true, 
        content 
      };
    } catch (error) {
      console.error(`Error viewing task ${taskPath}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pull tasks from GitHub
   * @returns {Object} Result with success status
   */
  async pullTasksFromGitHub() {
    try {
      const { getTasksFromGitHub } = await import('../selfIntegration.js');
      const result = await getTasksFromGitHub();

      if (result.success) {
        // Reload tasks from disk
        await this.loadTasks();

        // Reschedule if active
        if (this.isActive) {
          this.scheduleRecurringTasks();
        }

        return {
          success: true,
          count: result.tasks.length,
          message: `Downloaded ${result.tasks.length} tasks from GitHub`
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to pull tasks from GitHub'
      };
    } catch (error) {
      console.error('Error pulling tasks from GitHub:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Push tasks to GitHub
   * @returns {Object} Result with success status
   */
  async pushTasksToGitHub() {
    try {
      const { pushTasksToGitHub } = await import('../selfIntegration.js');
      const result = await pushTasksToGitHub();

      if (result.success) {
        return {
          success: true,
          count: result.count,
          message: `Uploaded ${result.count} tasks to GitHub`
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to push tasks to GitHub'
      };
    } catch (error) {
      console.error('Error pushing tasks to GitHub:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for tasks that need to be executed
   * Called by the scheduler job every minute
   */
  checkScheduledTasks() {
    if (!this.isActive) {
      return; // Don't check if scheduler is inactive
    }

    console.log("Checking scheduled tasks...");
    this.lastRun = new Date();

    // Get pending tasks only
    const pendingTasks = this.tasks.filter(task => 
      task.status === TASK_STATUS.PENDING
    );

    // Execute 'Now' tasks immediately and only once
    pendingTasks.forEach(task => {
      if (task.schedule === 'Now') {
        this.executeTask(task.path)
          .then(() => {
            console.log(`Executed task with 'Now' schedule: ${task.path}`);
          })
          .catch(error => {
            console.error(`Error executing task ${task.path}:`, error);
          });
      }
    });

    // Emit status update via socket.io if available
    if (global.io) {
      global.io.emit('scheduler:status-update', {
        active: this.isActive,
        lastRun: this.lastRun,
        pendingTaskCount: pendingTasks.length
      });
    }
  }
}

// Default repository path for tasks
const DEFAULT_TASKS_PATH = process.env.GITHUB_PATH ? `missions/${process.env.GITHUB_PATH.replace(/^\/|\/$/g, '')}/tasks` : 'missions/tasks';