Below is the complete **refactor.md** file that details a comprehensive plan to break apart your server into modular, manageable components. This document includes a proposed directory tree, detailed migration steps, API endpoints, security considerations, and more. You can use this as a blueprint to refactor your entire COREAI Research System.

---

```markdown
# COREAI Research System: Feature-Based Refactor Plan

## 1. Introduction

This document outlines an end-to-end plan for refactoring the COREAI Research System. Our goal is to move from a monolithic server file into a modular, feature-based architecture. This new structure will:
- Organize code by domain/feature (e.g., research, memory, GitHub, terminal, auth)
- Separate concerns for HTTP routes, Socket.io events, and business logic
- Implement user authentication with role-based access (user vs. admin vs. public)
- Securely manage secrets and environment configurations
- Simplify maintenance and facilitate future enhancements

---

## 2. Proposed Directory Structure

Below is an example of how to reorganize the project into clear, self-contained modules. Adjust names as needed.

```
COREAI-Research-System/
├── server/
│   ├── index.js               # Main server entry (creates HTTP & Socket.io instances)
│   ├── app.js                 # Initializes Express app, applies global middleware
│   ├── config/                # Environment configurations (development, production, etc.)
│   │   ├── default.js
│   │   ├── production.js
│   │   └── ...
│   ├── middleware/            # Shared Express middlewares (e.g., errorHandler.js)
│   ├── helpers/               # Utility functions (e.g., systemStats.js)
│   └── socket.js              # Initializes Socket.io and attaches feature-based handlers
│
├── features/
│   ├── auth/                  # Authentication & user management
│   │   ├── auth.routes.js     # Routes for login, logout, registration
│   │   ├── auth.socket.js     # (Optional) Socket events for real-time auth updates
│   │   ├── auth.service.js    # Business logic (password hashing, JWT generation)
│   │   ├── auth.repo.js       # User data access layer (database or file storage)
│   │   └── index.js           # Aggregator for auth module
│   ├── research/              # Research feature
│   │   ├── research.routes.js # REST endpoints for research queries, history, export
│   │   ├── research.socket.js # Socket.io handlers for research events
│   │   ├── research.service.js# Business logic for processing research queries
│   │   ├── research.repo.js   # Handles saving/reading research results (e.g., MD files)
│   │   └── index.js
│   ├── memory/                # Memory system feature
│   │   ├── memory.routes.js   # Endpoints for memory retrieval and configuration
│   │   ├── memory.socket.js   # Socket events for memory queries and updates
│   │   ├── memory.service.js  # Core logic for memory processing and storage
│   │   ├── memory.repo.js     # Data access layer for memory persistence
│   │   └── index.js
│   ├── github/                # GitHub integration feature
│   │   ├── github.routes.js   # REST endpoints for GitHub configuration and sync
│   │   ├── github.socket.js   # Socket events for GitHub tasks (sync, pull, push)
│   │   ├── github.service.js  # Business logic for interacting with GitHub APIs
│   │   ├── github.repo.js     # Low-level GitHub API communication
│   │   └── index.js
│   ├── terminal/              # Terminal AI feature
│   │   ├── terminal.routes.js # Routes for terminal interface pages
│   │   ├── terminal.socket.js # Socket events for terminal AI messages
│   │   ├── terminal.service.js# Logic for processing terminal messages
│   │   └── index.js
│   ├── scheduler/             # Task scheduler feature
│   │   ├── scheduler.socket.js# Socket events for task scheduling and management
│   │   ├── scheduler.service.js# Business logic for scheduling tasks
│   │   ├── scheduler.repo.js  # Low-level scheduler operations (e.g., file access)
│   │   └── index.js
│   └── ...                    # Additional feature modules as needed
│
├── src/                       # Core source code and legacy modules
│   ├── coreai/                # Core AI functionality (terminalAI, promptManager, etc.)
│   │   ├── mgmt/              # Management modules (historyManager, scheduler, etc.)
│   │   └── ...
│   ├── memory/                # Low-level memory components (core-memory-ai, etc.)
│   ├── ai/                    # AI providers (Venice, etc.)
│   ├── search/                # Search integration (e.g., Brave search)
│   ├── runResearch.js         # Research flow coordinator
│   ├── deep-research.js       # Research engine logic
│   └── ...
│
├── prompts/                   # AI prompt templates (research, terminal)
├── research/                  # Output files for research results (markdown files)
├── missions/                  # Task scheduler files: missions, tasks, logs
│   ├── tasks/
│   ├── memory/
│   └── logs/
├── public/                    # Static assets (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── favicon.ico
├── views/                     # EJS templates for UI rendering
│   ├── partials/              # Reusable view components
│   ├── terminal.ejs
│   ├── research.ejs
│   ├── github.ejs
│   ├── self.ejs
│   ├── memory.ejs
│   ├── admin.ejs
│   └── ...
└── package.json
```

---

## 3. Detailed Migration Steps

### Step 1: Create a `features/` Folder
- Identify core domains (e.g., auth, research, memory, GitHub, terminal, scheduler).
- Create a folder for each under `features/`.

### Step 2: Migrate Existing Logic
- **Research**:
  - Move research-related REST endpoints to `features/research/research.routes.js`.
  - Place Socket.io events in `features/research/research.socket.js`.
  - Add business logic into `features/research/research.service.js` and file operations into `features/research/research.repo.js`.
- **Memory**:
  - Move memory endpoints and Socket.io events into `features/memory/`.
  - Add business logic in `memory.service.js` and data persistence logic in `memory.repo.js`.
- **GitHub**:
  - Migrate GitHub configuration endpoints and Socket.io events to `features/github/`.
  - Consolidate GitHub API calls into `github.service.js` and lower-level functions into `github.repo.js`.
- **Terminal**:
  - Move terminal-related routes and Socket.io handlers into `features/terminal/`.
  - Place processing logic in `terminal.service.js`.
- **Scheduler**:
  - Create a dedicated module in `features/scheduler/` to handle all scheduling events and logic.
- **Auth** (New Feature):
  - Create `features/auth/` to handle user registration, login, and session management.
  - Implement password hashing (using libraries like `bcrypt` or `argon2`) in `auth.service.js` and secure user data in `auth.repo.js`.
  - Add Express routes in `auth.routes.js` for login, logout, and registration.
  - (Optional) Add Socket.io events in `auth.socket.js`.

### Step 3: Implement Role-Based Access Control
- In `auth.service.js`, generate sessions or JWTs that include user roles.
- In each feature’s routes (e.g., research.routes.js), implement middleware to check user roles:
  ```js
  function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    next();
  }
  ```
- Protect sensitive endpoints with this middleware.

### Step 4: Secure Secret Management
- Use a `.env` file to store secrets (GITHUB_TOKEN, JWT_SECRET, etc.) and add it to `.gitignore`.
- Create environment-specific configuration files in `server/config/` (e.g., `development.js`, `production.js`) that export settings like:
  ```js
  // server/config/default.js
  export default {
    port: process.env.PORT || 3001,
    jwtSecret: process.env.JWT_SECRET,
    githubToken: process.env.GITHUB_TOKEN,
    // other settings...
  };
  ```

### Step 5: Wire Up Express & Socket.io
- **Express App** (`server/app.js`):
  - Import and mount feature routes:
    ```js
    import express from 'express';
    import authRoutes from '../features/auth/auth.routes.js';
    import researchRoutes from '../features/research/research.routes.js';
    // ...
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/research', researchRoutes);
    // Mount additional feature routes...
    export default app;
    ```
- **Socket.io Handlers** (`server/socket.js`):
  - Import feature-based Socket.io handlers and attach them on connection:
    ```js
    import { Server } from 'socket.io';
    import authSocket from '../features/auth/auth.socket.js';
    import researchSocket from '../features/research/research.socket.js';
    // ...
    export default function initSocket(server) {
      const io = new Server(server);
      io.on('connection', (socket) => {
        authSocket(socket, io);
        researchSocket(socket, io);
        // Attach other feature socket handlers...
      });
      return io;
    }
    ```
- **Main Server Entry** (`server/index.js`):
  ```js
  import http from 'http';
  import app from './app.js';
  import initSocket from './socket.js';
  import config from './config/default.js';
  const server = http.createServer(app);
  const io = initSocket(server);
  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
  ```

### Step 6: Modularize GUI Elements and Components
- **Views**:  
  - Organize EJS templates in the `views/` folder.
  - Create partials for reusable UI components.
  - Render different pages for public, user, and admin roles based on authentication state.
- **Public Assets**:
  - Place all client-side JavaScript, CSS, and images under the `public/` directory.
  - Use client-side routing if building a Single Page Application (SPA).

### Step 7: Testing & Verification
- Write **unit tests** for individual services in each feature folder.
- Create **integration tests** for API endpoints and Socket.io events.
- Conduct a **security audit** to ensure secrets are not committed and roles are properly enforced.

---

## 4. API Endpoints Summary

- **Memory**
  - `GET /api/memory/:type`
  - `GET /api/self/modules`
  - `GET /api/self/module/:path`
  - `POST /api/self/init-system-prompt`
- **Research**
  - `GET /api/research/history`
  - `GET /api/research/:id`
  - `GET /api/research/:id/export`
- **Auth**
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
- **Additional features** will have their own REST endpoints as needed.

---

## 5. Communication Flow

1. **Client**: Accesses pages (public, user, admin) and initiates API requests.
2. **Express Routes**: Serve EJS templates and JSON API responses.
3. **Socket.io**: Provides real-time communication for research updates, GitHub sync, memory events, and scheduler events.
4. **Services**: Process business logic (research queries, memory storage, GitHub synchronization, etc.).
5. **Repositories**: Handle data persistence and external API interactions.
6. **Scheduler**: Manages automated tasks and mission scheduling.

---

## 6. Security Considerations

- **Password Hashing**: Use `bcrypt` or `argon2` in `auth.service.js` to securely store passwords.
- **JWT/Session Management**: Securely generate and validate tokens for authenticated requests.
- **Environment Variables**: Store secrets in `.env` (ensure this file is not committed to source control).
- **Role-Based Access**: Use middleware to restrict access to admin-only endpoints.
- **Input Validation**: Use libraries like `express-validator` to prevent injection attacks.
- **Error Handling**: Implement centralized error handling (e.g., in `server/middleware/errorHandler.js`) to avoid leaking sensitive information.

---

## 7. Deployment Configuration

- **Replit/Production Environment**:
  - Use `process.env.PORT` for the server port.
  - Host on `0.0.0.0` to accept external connections.
  - Securely manage environment variables using Replit Secrets or similar.
  - Automate dependency installation via `package.json`.

---

## 8. Future Enhancements

- **Multi-Factor Authentication (MFA)** for added security.
- **User Profiles** and personal settings management.
- **Advanced Memory Retrieval** using vector embeddings.
- **Enhanced Task Scheduling** with dependency management.
- **API-First Architecture** for external integrations.
- **Improved Analytics & Logging** (e.g., using Winston or similar libraries).

---

## 9. Conclusion

This refactor plan provides a roadmap to transition the COREAI Research System from a monolithic server file into a modular, feature-based architecture. By isolating features such as authentication, research, memory, GitHub integration, terminal interactions, and task scheduling, your codebase will become more maintainable, secure, and scalable. Each module has clear boundaries, making it easier for new developers to navigate the project and for the team to extend functionality in the future.

Use this document as a step-by-step guide to reorganize your application and implement the necessary security, authentication, and role-based access controls for a robust COREAI Research System.

```

---

This **refactor.md** file is a comprehensive guide that covers the full app architecture, the detailed migration steps, the proposed directory tree, and key security and deployment considerations. It is designed to help you break apart your monolithic server into well-organized, maintainable components.