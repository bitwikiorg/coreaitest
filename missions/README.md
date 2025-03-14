# AI Workflow Missions

This directory contains all mission-related files for the AI Workflow Organizer.

## Directory Structure

- `tasks/`: Contains individual mission task files in Markdown format
- `logs/`: Contains execution logs from completed tasks
- `memory/`: Contains memory files created by the AI system

## Task Format

Each task in the `tasks/` directory follows this format:

```markdown
# Mission Title

Status: Pending
Priority: Medium|High|Low
Schedule: Hourly|Daily|Weekly|Monthly|As needed|Every 5 minutes|Every 10 minutes|Every 15 minutes

## Description

research "query string" depth 3 breadth 5

## Execution Log
```

## Example Research Mission

```markdown
# Research on Quantum Computing

Status: Pending
Priority: High
Schedule: Daily

## Description

This mission aims to gather the latest information on quantum computing advancements.

research "quantum computing developments" depth 3 breadth 5

## Execution Log
```

## Workflow

1. User creates a research mission through the web interface
2. The scheduler runs according to the specified schedule
3. Research results are saved both locally and to GitHub repository
4. Tasks are marked as completed once research is finished