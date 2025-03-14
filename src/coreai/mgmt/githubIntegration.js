/**
 * GitHub Integration for COREAI Management System
 * 
 * Handles direct interactions with GitHub API for storing research results.
 */

import { Octokit } from '@octokit/rest';
import dotenv from "dotenv";
import * as fs from 'fs/promises';
import * as path from 'path';

dotenv.config();

/**
 * Verifies GitHub configuration and connection
 * @returns {Promise<boolean>} True if GitHub config is valid and connection works
 */
export async function verifyGitHubConfig() {
  try {
    // Check for required environment variables
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      console.log('Missing GitHub configuration');
      return false;
    }

    // Initialize Octokit with the GitHub token
    const octokit = new Octokit({
      auth: token
    });

    // Try to get repository information to verify connection
    const response = await octokit.repos.get({
      owner,
      repo
    });

    console.log(`GitHub repository verification successful: ${owner}/${repo}`);
    return true;
  } catch (error) {
    console.error('GitHub configuration verification failed:', error.message);
    return false;
  }
}

/**
 * Uploads a file to GitHub repository
 * @param {string} filePath - Path where file should be saved in repo
 * @param {string} content - File content to upload
 * @param {string} message - Commit message
 * @returns {Promise<Object>} Upload result
 */
export async function uploadFileToGitHub(filePath, content, message) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (!token || !owner || !repo) {
      return {
        success: false,
        error: 'Missing GitHub configuration'
      };
    }

    // Initialize GitHub client
    const octokit = new Octokit({
      auth: token
    });

    // Check if file already exists to get its SHA
    let fileSha;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch
      });

      fileSha = data.sha;
    } catch (error) {
      // File doesn't exist yet, that's fine
    }

    // Create or update the file
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: message || `Update ${filePath}`,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha: fileSha
    });

    return {
      success: true,
      content: response.data.content
    };
  } catch (error) {
    console.error('Error uploading file to GitHub:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Save a research file to GitHub
 * @param {Object} research - Research data
 * @returns {Promise<Object>} Upload result
 */
export async function saveResearchToGitHub(research) {
  try {
    if (!research || !research.id) {
      return {
        success: false,
        error: 'Invalid research data'
      };
    }

    // Generate markdown content from research
    const content = [
      '# Research Results',
      '----------------\n',
      '## Research Parameters',
      `- Query: ${research.query || 'Unknown'}`,
      `- Depth: ${research.depth || 3}`,
      `- Breadth: ${research.breadth || 5}`,
      `- Date: ${research.date || new Date().toISOString()}`,
      '',
      '## Summary',
      research.summary || 'No summary available',
      '',
      '## Key Learnings',
      ...(research.learnings || []).map((l, i) => `${i + 1}. ${l}`),
      '',
      '## Sources',
      ...(research.sources || []).map(s => `- ${s}`),
      '',
      '## Tags',
      (research.tags || []).join(', ')
    ].join('\n');

    // Define path in GitHub repo
    const path = process.env.GITHUB_PATH || 'research';
    const filePath = `${path}/research-${research.id}.md`;

    // Upload to GitHub
    return await uploadFileToGitHub(
      filePath,
      content,
      `Add research: ${research.query}`
    );
  } catch (error) {
    console.error('Error saving research to GitHub:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fetch list of research files from GitHub
 * @returns {Promise<Array>} - List of research files
 */
export const fetchResearchFilesFromGitHub = async () => {
  try {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GitHub token not configured");
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const path = process.env.GITHUB_PATH || 'research';
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (!owner || !repo) {
      throw new Error("GitHub repository configuration missing");
    }

    // Get directory contents
    const result = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    });

    // Filter for markdown files
    const files = Array.isArray(result.data) 
      ? result.data.filter(file => file.name.endsWith('.md'))
      : [];

    return {
      success: true,
      files: files.map(file => ({
        name: file.name,
        path: file.path,
        sha: file.sha,
        size: file.size,
        url: file.html_url,
        download_url: file.download_url
      }))
    };
  } catch (error) {
    console.error(`Error fetching research files from GitHub: ${error.message}`);
    return {
      success: false,
      error: error.message,
      files: []
    };
  }
};

/**
 * Save file content to GitHub repository
 * @param {string} repo - Repository name
 * @param {string} filePath - Path where file should be saved
 * @param {string} content - Content to save
 * @returns {Promise<Object>} - GitHub API response
 */
//This function is kept as it might be used elsewhere. Removing it might break other functionality.
export const saveFileToGitHub = async (repo, filePath, content) => {
  const owner = process.env.GITHUB_OWNER || 'default-owner';

  try {
    // Check if file exists to get its SHA
    let sha;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
      });
      sha = data.sha;
    } catch (error) {
      // File doesn't exist yet, which is fine
    }

    // Create or update the file
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Research update: ${path.basename(filePath)}`,
      content: Buffer.from(content).toString('base64'),
      sha, // Will be undefined for new files
      committer: {
        name: process.env.GITHUB_COMMITTER_NAME || "COREAI Research System",
        email: process.env.GITHUB_COMMITTER_EMAIL || "research-bot@example.com",
      },
    });

    console.log(`File saved to GitHub: ${response.data.content.html_url}`);
    return response.data;
  } catch (error) {
    console.error("Error saving file to GitHub:", error);
    throw error;
  }
};


/**
 * Verify GitHub configuration is valid
 * @returns {Promise<boolean>} - True if configuration is valid
 */
//This function is kept as it might be used elsewhere. Removing it might break other functionality.
export const verifyGitHubConfig2 = async () => {
  try {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!owner || !repo) {
      console.error('GitHub configuration missing: owner or repo not set');
      return false;
    }

    // Extract just the repository name (without any path)
    const repoName = repo.split('/')[0];

    // Try to get the repository to verify access
    await octokit.repos.get({
      owner,
      repo: repoName
    });

    return true;
  } catch (error) {
    console.error('GitHub configuration verification failed:', error.message);
    return false;
  }
};
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Verifies GitHub configuration and connection
 * @returns {Promise<boolean>} True if configuration is valid
 */
export async function verifyGitHubConfig() {
  try {
    // Check if required environment variables are set
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    
    if (!token || !owner || !repo) {
      console.error('GitHub configuration missing required values');
      return false;
    }
    
    // Test GitHub connection
    const octokit = new Octokit({ auth: token });
    
    // Try to get repository info
    const { data } = await octokit.repos.get({
      owner,
      repo
    });
    
    console.log(`GitHub connection verified: ${data.full_name}`);
    return true;
  } catch (error) {
    console.error('GitHub connection verification failed:', error);
    return false;
  }
}

/**
 * Uploads a file to GitHub
 * @param {string} filePath - Target path in the repository
 * @param {string} content - File content
 * @param {string} message - Commit message
 * @returns {Promise<Object>} Result object
 */
export async function uploadFileToGitHub(filePath, content, message) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    
    if (!token || !owner || !repo) {
      return { 
        success: false, 
        error: 'GitHub configuration missing required values' 
      };
    }
    
    const octokit = new Octokit({ auth: token });
    
    // Check if file exists
    let sha;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch
      });
      
      if (data && data.sha) {
        sha = data.sha;
      }
    } catch (error) {
      // File doesn't exist yet, which is fine
      console.log(`Creating new file: ${filePath}`);
    }
    
    // Create or update file
    const result = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: message || `Update ${filePath}`,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha
    });
    
    return { 
      success: true, 
      content: result.data.content
    };
  } catch (error) {
    console.error('Error uploading file to GitHub:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to upload file to GitHub'
    };
  }
}

/**
 * Fetches research files from GitHub
 * @returns {Promise<Object>} Object containing files array
 */
export async function fetchResearchFilesFromGitHub() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const path = process.env.GITHUB_PATH || 'research';
    const branch = process.env.GITHUB_BRANCH || 'main';
    
    if (!token || !owner || !repo) {
      return { 
        success: false, 
        error: 'GitHub configuration missing required values' 
      };
    }
    
    const octokit = new Octokit({ auth: token });
    
    // Get repository contents
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    });
    
    // Filter for markdown files
    const files = Array.isArray(data) 
      ? data.filter(item => item.type === 'file' && item.name.endsWith('.md'))
      : [];
    
    return { 
      success: true, 
      files: files.map(file => ({
        name: file.name,
        path: file.path,
        url: file.html_url,
        size: file.size,
        sha: file.sha
      }))
    };
  } catch (error) {
    console.error('Error fetching research files from GitHub:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch research files'
    };
  }
}
