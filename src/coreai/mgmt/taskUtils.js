import fs from 'fs/promises';
import path from 'path';
import { saveSelfModuleToGitHub } from './selfIntegration.js';

/**
 * Load mission file and return tasks
 * @param {string} filePath - Path to the mission file
 * @returns {Promise<Array>} - Array of tasks
 */
export async function loadMissionsFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');

    return lines.map(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return null;

      // Parse format: query|depth|breadth
      const parts = trimmedLine.split('|');
      if (parts.length >= 3) {
        return {
          query: parts[0].trim(),
          depth: parseInt(parts[1], 10) || 2,
          breadth: parseInt(parts[2], 10) || 3
        };
      }

      // Default if no special format
      return {
        query: trimmedLine,
        depth: 2,
        breadth: 3
      };
    }).filter(task => task !== null);
  } catch (error) {
    console.error(`Error loading missions file ${filePath}:`, error);
    return [];
  }
}

/**
 * Create a missions file with multiple research queries
 * @param {Array} queries - Array of query objects {query, depth, breadth}
 * @param {string} fileName - Name of the file (without extension)
 * @returns {Promise<Object>} - Result of file creation
 */
export async function createMissionsFile(queries, fileName = 'research-missions') {
  try {
    if (!Array.isArray(queries) || queries.length === 0) {
      return { success: false, error: 'No queries provided' };
    }

    const missionsDir = path.join(process.cwd(), 'missions');
    await fs.mkdir(missionsDir, { recursive: true });

    const filePath = path.join(missionsDir, `${fileName}.missionos`);

    // Format each query as: query|depth|breadth
    const content = queries.map(q => {
      if (typeof q === 'string') {
        return q;
      }
      return `${q.query}|${q.depth || 2}|${q.breadth || 3}`;
    }).join('\n');

    await fs.writeFile(filePath, content, 'utf8');

    return { 
      success: true, 
      filePath, 
      message: `Created missions file with ${queries.length} queries` 
    };
  } catch (error) {
    console.error('Error creating missions file:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Synchronize tasks with GitHub
 * @returns {Promise<Object>} - Result of synchronization
 */
export async function syncTasksWithGitHub() {
  try {
    if (!global.taskScheduler) {
      return { success: false, error: 'Task scheduler not initialized' };
    }

    // First pull tasks from GitHub
    const pullResult = await global.taskScheduler.pullTasksFromGitHub();

    // Then push local tasks to GitHub
    const pushResult = await global.taskScheduler.pushTasksToGitHub();

    return {
      success: true,
      pull: pullResult,
      push: pushResult,
      message: `Synchronized tasks with GitHub. Downloaded ${pullResult.count}, uploaded ${pushResult.count} tasks.`
    };
  } catch (error) {
    console.error('Error synchronizing tasks with GitHub:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new task in the GitHub repository
 */
export async function createTask(taskData) {
  try {
    // Validate task data
    if (!taskData.task) {
      throw new Error('Task description is required');
    }
    
    // Generate task ID based on timestamp and first few characters of description
    const timestamp = Date.now();
    const taskSlug = taskData.task.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30);
    
    const taskId = `task-${taskSlug}-${timestamp}`;
    const taskPath = `missions/tasks/${taskId}.md`;
    
    // Get priority number from text
    let priorityNum = 2; // Medium is default
    if (taskData.priority) {
      const priority = taskData.priority.toLowerCase();
      priorityNum = priority === 'high' ? 3 : (priority === 'low' ? 1 : 2);
    }
    
    // Create task content
    const taskContent = `# ${taskData.task.substring(0, 50)}${taskData.task.length > 50 ? '...' : ''}
Status: Pending
Priority: ${taskData.priority || 'Medium'}
Schedule: ${taskData.schedule || 'As needed'}
Created: ${new Date().toISOString()}

## Description

${taskData.task}

## Execution Log

*No execution records yet.*
`;
    
    // Save task to GitHub
    const result = await saveSelfModuleToGitHub({
      path: taskPath,
      content: taskContent,
      message: `Create task: ${taskData.task.substring(0, 50)}`
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create task');
    }
    
    console.log(`Task created: ${taskPath}`);
    
    return {
      success: true,
      path: taskPath,
      taskId: taskId,
      message: `Task created: ${taskData.task.substring(0, 50)}`
    };
  } catch (error) {
    console.error('Error creating task:', error);
    return {
      success: false,
      error: error.message || 'Unknown error creating task'
    };
  }
}

/**
 * Prioritize tasks based on priority and status
 */
export function prioritizeTasks(tasks) {
  // First, we'll make sure each task has the correct properties
  const processedTasks = tasks.map(task => {
    return {
      ...task,
      // Ensure priority is a number (1-3)
      priority: typeof task.priority === 'number' ? task.priority : 
                (task.priority === 'High' ? 3 : 
                 task.priority === 'Low' ? 1 : 2),
      // Ensure status is a string
      status: task.status || 'Pending'
    };
  });

  // Sort tasks by:
  // 1. Status (Pending first, then In Progress, then Completed, then Failed)
  // 2. Priority (High to Low)
  // 3. Created date (newer first)
  return processedTasks.sort((a, b) => {
    // Status order: Pending > In Progress > Completed > Failed
    const statusOrder = {
      'Pending': 0,
      'In Progress': 1,
      'Completed': 2,
      'Failed': 3,
      'Cancelled': 4
    };

    const aStatus = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 999;
    const bStatus = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 999;

    // Compare by status first
    if (aStatus !== bStatus) {
      return aStatus - bStatus;
    }

    // If same status, compare by priority (higher priority first)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // If same priority, compare by created date (newer first)
    const aDate = new Date(a.created || 0).getTime();
    const bDate = new Date(b.created || 0).getTime();
    return bDate - aDate;
  });
}