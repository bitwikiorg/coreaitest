# Tasks

This directory contains individual mission task files.

## Task Format

Each task is defined in a Markdown file with the following structure:

```markdown
# Mission Title

Status: Failed
Priority: Medium|High|Low
Schedule: Hourly|Daily|Weekly|Monthly|As needed|Every 5 minutes

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


### 2025-03-06T14:50:12.981Z
Starting research: "query string" with depth 3, breadth 5

### 2025-03-06T14:50:13.066Z
Research error: API key is required. Provide it in constructor or set VENICE_API_KEY environment variable.