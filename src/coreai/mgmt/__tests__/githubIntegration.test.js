
import { jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  saveFileToGitHub, 
  saveResearchToGitHub, 
  verifyGitHubConfig 
} from '../githubIntegration';

// Mock Octokit and fs
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      repos: {
        createOrUpdateFileContents: jest.fn().mockResolvedValue({
          data: { 
            content: { 
              html_url: 'https://github.com/user/repo/blob/main/path/to/file.md'
            }
          }
        }),
        getContent: jest.fn().mockImplementation(({ path }) => {
          if (path === 'existing-file.md') {
            return Promise.resolve({ data: { sha: 'abc123' } });
          }
          return Promise.reject(new Error('Not found'));
        }),
        get: jest.fn().mockResolvedValue({ data: { name: 'test-repo' } })
      }
    }))
  };
});

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

describe('GitHub Integration', () => {
  // Save original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Setup test environment variables
    process.env = {
      ...originalEnv,
      GITHUB_TOKEN: 'test-token',
      GITHUB_OWNER: 'test-owner',
      GITHUB_REPO: 'test-repo',
      GITHUB_BRANCH: 'main',
      GITHUB_PATH: 'research'
    };
    
    // Clear mocks between tests
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('saveFileToGitHub', () => {
    it('should save a file to GitHub successfully', async () => {
      const result = await saveFileToGitHub('test-file.md', 'Test content');
      expect(result).toBeDefined();
      expect(result.content.html_url).toBe('https://github.com/user/repo/blob/main/path/to/file.md');
    });
  });

  describe('saveResearchToGitHub', () => {
    it('should save research locally and to GitHub', async () => {
      const research = {
        query: 'Test research query',
        summary: 'This is a test summary',
        details: 'These are test details',
        depth: 3,
        breadth: 5
      };

      const result = await saveResearchToGitHub(research);
      
      // Verify mkdir was called to ensure directory exists
      expect(fs.mkdir).toHaveBeenCalled();
      
      // Verify writeFile was called to save locally
      expect(fs.writeFile).toHaveBeenCalled();
      
      expect(result.success).toBe(true);
      expect(result.githubPath).toBeDefined();
    });

    it('should throw error if research data is invalid', async () => {
      await expect(saveResearchToGitHub(null)).rejects.toThrow('Invalid research data');
      await expect(saveResearchToGitHub({})).rejects.toThrow('Invalid research data');
    });
  });

  describe('verifyGitHubConfig', () => {
    it('should return true when GitHub config is valid', async () => {
      const result = await verifyGitHubConfig();
      expect(result).toBe(true);
    });

    it('should return false when GitHub config is missing', async () => {
      delete process.env.GITHUB_TOKEN;
      const result = await verifyGitHubConfig();
      expect(result).toBe(false);
    });
  });
});
