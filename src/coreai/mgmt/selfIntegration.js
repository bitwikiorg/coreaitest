// Import necessary modules
import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// GitHub configuration
const token = process.env.GITHUB_TOKEN?.trim();
const owner = process.env.GITHUB_OWNER?.trim();
const repo = process.env.GITHUB_REPO?.trim();
const branch = process.env.GITHUB_BRANCH || 'main';

// Initialize Octokit
let octokit = null;
try {
  if (token) {
    octokit = new Octokit({
      auth: token,
      userAgent: 'AI-Workflow-Organizer v1.0'
    });
  }
} catch (error) {
  console.error('Error initializing Octokit:', error);
}

/**
 * Verify GitHub connection
 * @returns {Promise<{connected: boolean, user: string, repo: string, error: string}>}
 */
export async function verifyGitHubConnection() {
  try {
    // Check if GitHub configuration is set - trim whitespace to handle potential spacing issues
    const token = process.env.GITHUB_TOKEN?.trim();
    const owner = process.env.GITHUB_OWNER?.trim();
    const repo = process.env.GITHUB_REPO?.trim();
    const branch = process.env.GITHUB_BRANCH?.trim() || 'main';

    if (!token || !owner || !repo) {
      console.error('GitHub configuration missing:', {
        hasToken: !!token,
        hasOwner: !!owner,
        hasRepo: !!repo
      });
      return {
        connected: false,
        error: `GitHub configuration is incomplete. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.`
      };
    }

    console.log(`Checking GitHub connection for ${owner}/${repo}`);

    // Try to connect to GitHub and get repository info
    if (!octokit && token) {
      octokit = new Octokit({ auth: token });
    }

    // Test connection by trying to access the repo
    const response = await octokit.rest.repos.get({
      owner,
      repo
    });

    // Create missions path if it doesn't exist
    try {
      // Check if the missions directory exists
      await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'missions',
        ref: branch
      });
    } catch (dirError) {
      if (dirError.status === 404) {
        // Create missions directory with a README.md file
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: 'missions/README.md',
          message: 'Initialize missions directory',
          content: Buffer.from('# Missions\n\nThis directory contains research missions.').toString('base64'),
          branch
        });
        console.log('Created missions directory in repository');
      }
    }

    return {
      connected: true,
      user: owner,
      repo: repo,
      repoData: response.data
    };
  } catch (error) {
    console.error('Error verifying GitHub connection:', error);
    return {
      connected: false,
      error: error.message || 'Failed to connect to GitHub'
    };
  }
}

/**
 * Get a file from GitHub
 * @param {string} filePath - Path to the file in the repository
 * @returns {Promise<{success: boolean, content: string, sha: string, error: string}>}
 */
export async function getSelfModuleFromGitHub(filePath) {
  try {
    if (!octokit) {
      const connected = await verifyGitHubConnection();
      if (!connected.connected) {
        throw new Error('GitHub not connected: ' + connected.error);
      }
    }

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch
    });

    if (!response.data.content) {
      throw new Error('No content found in response');
    }

    const content = Buffer.from(response.data.content, 'base64').toString('utf8');
    return {
      success: true,
      content,
      sha: response.data.sha
    };
  } catch (error) {
    console.error(`Error fetching file from GitHub: ${error.message}`);
    console.error('File path attempted:', filePath);
    return {
      success: false,
      content: '',
      sha: '',
      error: error.message
    };
  }
}

/**
 * Save a file to GitHub
 * @param {Object} options - Options object
 * @param {string} options.path - Path to the file in the repository
 * @param {string} options.content - Content to save
 * @param {string} options.message - Commit message
 * @param {string} options.sha - SHA of the file (if updating)
 * @returns {Promise<{success: boolean, error: string}>}
 */
export async function saveSelfModuleToGitHub({ path: filePath, content, message, sha }) {
  try {
    if (!octokit) {
      const connected = await verifyGitHubConnection();
      if (!connected.connected) {
        throw new Error('GitHub not connected: ' + connected.error);
      }
    }

    // If no SHA is provided and the file might exist, try to get it
    if (!sha) {
      try {
        const existingFile = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: branch
        });
        if (existingFile.data && existingFile.data.sha) {
          sha = existingFile.data.sha;
        }
      } catch (error) {
        // File doesn't exist, we'll create it
        console.log(`File doesn't exist (${filePath}), creating new file`);
      }
    }

    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: message || `Update ${filePath}`,
      content: Buffer.from(content).toString('base64'),
      sha, // Will be undefined for new files
      branch
    });

    return {
      success: true,
      sha: response.data.content.sha,
      url: response.data.content.html_url
    };
  } catch (error) {
    console.error(`Error saving file to GitHub: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * List files from GitHub
 * @param {string} directory - Directory to list files from
 * @returns {Promise<{success: boolean, files: Array, error: string}>}
 */
export async function listSelfModulesFromGitHub(directory = '') {
  try {
    if (!octokit) {
      const connected = await verifyGitHubConnection();
      if (!connected.connected) {
        throw new Error('GitHub not connected: ' + connected.error);
      }
    }

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: directory,
      ref: branch
    });

    if (!Array.isArray(response.data)) {
      // Handle case where the path is a file, not a directory
      if (response.data && response.data.name) {
        return {
          success: true,
          files: [{
            name: response.data.name,
            path: response.data.path,
            sha: response.data.sha,
            type: response.data.type === 'dir' ? 'dir' : 'file'
          }]
        };
      }
      throw new Error('Path is not a directory or file');
    }

    return {
      success: true,
      files: response.data.map(item => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        type: item.type === 'dir' ? 'dir' : 'file'
      }))
    };
  } catch (error) {
    console.error(`Error listing files from GitHub: ${error.message}`);
    return {
      success: false,
      files: [],
      error: error.message
    };
  }
}

/**
 * Pull files from GitHub to local filesystem
 * @param {string} directory - Directory to pull files from
 * @returns {Promise<{success: boolean, count: number, error: string}>}
 */
export async function pullFilesFromGitHub(directory = 'missions') {
  try {
    if (!octokit) {
      const connected = await verifyGitHubConnection();
      if (!connected.connected) {
        throw new Error('GitHub not connected: ' + connected.error);
      }
    }

    // Create the directory locally if it doesn't exist
    try {
      await fs.mkdir(directory, { recursive: true });
    } catch (mkdirError) {
      console.error(`Error creating directory: ${mkdirError.message}`);
    }

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: directory,
      ref: branch
    });

    if (!Array.isArray(response.data)) {
      throw new Error('Path is not a directory');
    }

    let count = 0;

    // Process each item
    for (const item of response.data) {
      if (item.type === 'dir') {
        // Recursively pull files from subdirectory
        const subResult = await pullFilesFromGitHub(item.path);
        count += subResult.count || 0;
      } else if (item.type === 'file') {
        // Get file content
        const fileResponse = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: item.path,
          ref: branch
        });

        if (!fileResponse.data.content) {
          console.warn(`No content found for file: ${item.path}`);
          continue;
        }

        const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');

        // Create the directory structure locally
        const localDir = path.dirname(item.path);
        await fs.mkdir(localDir, { recursive: true });

        // Save the file locally
        await fs.writeFile(item.path, content, 'utf8');
        count++;
      }
    }

    return {
      success: true,
      count
    };
  } catch (error) {
    console.error(`Error pulling files from GitHub: ${error.message}`);
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
}

/**
 * Sync a directory to GitHub
 * @param {string} directory - Directory to sync
 * @param {string} commitMessage - Commit message
 * @returns {Promise<{success: boolean, count: number, error: string}>}
 */
export async function syncDirectoryToGitHub(directory = 'missions', commitMessage = 'Sync directory') {
  try {
    if (!octokit) {
      const connected = await verifyGitHubConnection();
      if (!connected.connected) {
        throw new Error('GitHub not connected: ' + connected.error);
      }
    }

    // Get local files
    const getFilesRecursively = async (dir) => {
      let files = [];
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });

        for (const item of items) {
          const fullPath = path.join(dir, item.name);

          if (item.isDirectory()) {
            files = [...files, ...(await getFilesRecursively(fullPath))];
          } else {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
      }
      return files;
    };

    const localFiles = await getFilesRecursively(directory);
    let count = 0;

    // Upload each file
    for (const filePath of localFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf8');

        // Convert to repository path format
        const repoPath = filePath.replace(/\\/g, '/');

        // Check if file exists in the repository
        let sha;
        try {
          const existingFile = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: repoPath,
            ref: branch
          });

          if (existingFile.data && existingFile.data.sha) {
            sha = existingFile.data.sha;
          }
        } catch (error) {
          // File doesn't exist, we'll create it
          console.log(`File doesn't exist (${repoPath}), creating new file`);
        }

        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: repoPath,
          message: `${commitMessage}: ${path.basename(filePath)}`,
          content: Buffer.from(content).toString('base64'),
          sha,
          branch
        });

        count++;
      } catch (error) {
        console.error(`Error uploading file ${filePath}:`, error);
      }
    }

    return {
      success: true,
      count
    };
  } catch (error) {
    console.error(`Error syncing directory to GitHub: ${error.message}`);
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
}

/**
 * Initialize the Self system
 * @returns {Promise<{success: boolean, created: string[], error: string}>}
 */
export async function initializeSelfSystem() {
  try {
    // Ensure there's a GitHub connection
    if (!octokit) {
      const connected = await verifyGitHubConnection();
      if (!connected.connected) {
        throw new Error('GitHub not connected: ' + connected.error);
      }
    }

    const created = [];

    // Ensure missions directory structure exists
    try {
      // Create local missions directory
      await fs.mkdir('missions', { recursive: true });
      await fs.mkdir('missions/tasks', { recursive: true });
      await fs.mkdir('missions/logs', { recursive: true });
      await fs.mkdir('missions/memory', { recursive: true });

      // Create README files
      await fs.writeFile('missions/README.md', '# Missions\n\nThis directory contains research missions.', 'utf8');
      await fs.writeFile('missions/tasks/README.md', '# Tasks\n\nThis directory contains scheduled tasks.', 'utf8');
      await fs.writeFile('missions/logs/README.md', '# Logs\n\nThis directory contains mission execution logs.', 'utf8');
      await fs.writeFile('missions/memory/README.md', '# Memory\n\nThis directory contains system memory entries.', 'utf8');

      // Sync to GitHub
      await syncDirectoryToGitHub('missions', 'Initialize missions structure');
      created.push('missions/');
    } catch (error) {
      console.error('Error creating missions structure:', error);
    }

    return {
      success: true,
      created,
      message: 'Self architecture initialized successfully'
    };
  } catch (error) {
    console.error('Error initializing Self architecture:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify GitHub config
 * @returns {Promise<boolean>}
 */
export async function verifyGitHubConfig() {
  try {
    // Check if GitHub configuration is set
    const token = process.env.GITHUB_TOKEN?.trim();
    const owner = process.env.GITHUB_OWNER?.trim();
    const repo = process.env.GITHUB_REPO?.trim();

    if (!token || !owner || !repo) {
      console.error('GitHub configuration missing:', {
        hasToken: !!token,
        hasOwner: !!owner,
        hasRepo: !!repo
      });
      return false;
    }

    // Initialize Octokit if needed
    if (!octokit && token) {
      octokit = new Octokit({ auth: token });
    }

    // Test connection by trying to access the repo
    const response = await octokit.rest.repos.get({
      owner,
      repo
    });

    return true;
  } catch (error) {
    console.error('Error verifying GitHub config:', error);
    return false;
  }
}

export default {
  verifyGitHubConnection,
  getSelfModuleFromGitHub,
  saveSelfModuleToGitHub,
  listSelfModulesFromGitHub,
  pullFilesFromGitHub,
  syncDirectoryToGitHub,
  initializeSelfSystem,
  verifyGitHubConfig
};