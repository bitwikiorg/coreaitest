
import fs from 'fs/promises';
import path from 'path';

async function createMissionStructure() {
  try {
    console.log('Creating missions directory structure...');
    
    // Create main directories
    await fs.mkdir('missions', { recursive: true });
    await fs.mkdir('missions/tasks', { recursive: true });
    await fs.mkdir('missions/memory', { recursive: true });
    
    // Create README files
    const mainReadme = `# Missions

This directory contains automated missions for the COREAI research system.

## Directory Structure

- \`tasks/\` - Individual mission files
- \`memory/\` - Mission execution logs and outputs

## Mission Format

Missions are defined in Markdown files with specific frontmatter and sections:

\`\`\`markdown
# Mission Title

Status: Pending
Priority: Medium|High|Low
Schedule: Hourly|Daily|Weekly|Monthly|As needed|Every 5 minutes

## Description

research "query string" depth 3 breadth 5

## Execution Log
\`\`\`

The system will automatically parse the description to extract research parameters and schedule execution based on the defined schedule.
`;
    
    const tasksReadme = `# Tasks

This directory contains individual mission task files.

## Task Format

Each task is defined in a Markdown file with the following structure:

\`\`\`markdown
# Mission Title

Status: Pending
Priority: Medium|High|Low
Schedule: Hourly|Daily|Weekly|Monthly|As needed|Every 5 minutes

## Description

research "query string" depth 3 breadth 5

## Execution Log
\`\`\`

## Example Research Mission

\`\`\`markdown
# Research on Quantum Computing

Status: Pending
Priority: High
Schedule: Daily

## Description

This mission aims to gather the latest information on quantum computing advancements.

research "quantum computing developments" depth 3 breadth 5

## Execution Log
\`\`\`
`;
    
    const exampleMission = `# Example Research Mission

Status: Pending
Priority: Medium
Schedule: Every 5 minutes

## Description

This is an example research mission that demonstrates the format.

research "artificial intelligence trends" depth 2 breadth 3

## Execution Log
`;
    
    // Write README files
    await fs.writeFile(path.join('missions', 'README.md'), mainReadme);
    await fs.writeFile(path.join('missions', 'tasks', 'README.md'), tasksReadme);
    
    // Create example mission
    await fs.writeFile(path.join('missions', 'tasks', 'example-mission.md'), exampleMission);
    
    console.log('Mission structure created successfully!');
    console.log('Example mission created at: missions/tasks/example-mission.md');
  } catch (error) {
    console.error('Error creating mission structure:', error);
  }
}

createMissionStructure();
