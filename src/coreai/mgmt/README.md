
# COREAI Management System

## Overview

The COREAI Management System serves as the meta-research layer that orchestrates interactions between the research core and external storage. It maintains separation of concerns while enabling seamless integration between:

1. **Research Core** - The untouched research processing pipeline
2. **Interface System** - Manages user interactions and data flow
3. **GitHub Integration** - Handles synchronization of research and self-architecture

## Architecture

```
┌─────────────────┐     ┌───────────────────┐     ┌────────────────────┐
│  Research Core  │<────│  Interface System  │────>│  GitHub Integration│
│  (src/*.js)     │     │  (server.js)       │     │  (mgmt/*.js)       │
└─────────────────┘     └───────────────────┘     └────────────────────┘
                                                  /             \
                                                 /               \
                                   ┌───────────────────┐  ┌───────────────────┐
                                   │ Research Repository│  │ Self Architecture │
                                   │ (research/*.md)    │  │ (self/*)          │
                                   └───────────────────┘  └───────────────────┘
```

## Key Components

### GitHub Integration
- `githubIntegration.js`: Core GitHub API interactions for file operations
- `selfIntegration.js`: Self-system GitHub integration for memory management
- `researchAdapter.js`: Adapter for connecting research output to GitHub

### Memory Management
- Handles the AI's self-architecture and memory stored in GitHub
- Provides persistence for the system's cognitive structure
- Enables self-determined tasks and memory operations

## Usage

### Research Management Flow
1. User initiates research through web interface
2. Interface system invokes the research core
3. Research core processes the query and returns results
4. Interface system displays results to user
5. Management system syncs results to GitHub repository

### Self-Architecture Management Flow
1. System loads self-architecture components from GitHub
2. Self-system analyzes research to update its architecture
3. Management system syncs updated architecture to GitHub
4. Changes persist across sessions, enabling continuous learning

## API

### GitHub Integration API
- `verifyGitHubConfig()`: Validates GitHub configuration
- `uploadFileToGitHub(path, content, message)`: Saves a file to GitHub
- `fetchResearchFilesFromGitHub()`: Retrieves research files list

### Self System API
- `listSelfModulesFromGitHub(directory)`: Lists self-system modules
- `fetchSelfModuleFromGitHub(path)`: Retrieves a specific module
- `saveSelfModuleToGitHub(path, content, message)`: Updates a module

## Configuration

The management system requires GitHub configuration in `.env`:

```
# Research repository
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_research_repository
GITHUB_BRANCH=main
GITHUB_PATH=research

# Self repository (can be same or different)
GITHUB_MEMORY_REPO=your_memory_repository
GITHUB_MEMORY_BRANCH=main
GITHUB_MEMORY_PATH=self
```
