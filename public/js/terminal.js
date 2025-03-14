document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const outputElement = document.getElementById('output');
    const commandInput = document.getElementById('command-input');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.querySelector('.sidebar');

    // Terminal variables
    const commandHistory = [];
    let historyPos = -1;
    let activeResearch = null;
    let depth = 3;
    let breadth = 5;
    let isResearchInProgress = false;
    let aiChatMode = false;
    window.chatHistory = [];

    function focusInput() {
        commandInput.focus();
    }
    focusInput();
    document.addEventListener('click', focusInput);

    // Toggle sidebar
    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
    });
    closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.add('hidden');
    });
    document.addEventListener('click', (event) => {
        if (
            !sidebar.contains(event.target) &&
            !toggleSidebarBtn.contains(event.target) &&
            !sidebar.classList.contains('hidden')
        ) {
            sidebar.classList.add('hidden');
        }
    });

    /**
     * appendOutput - the main function to display lines in the terminal.
     * @param {string} text - The text to display (e.g., "[USER] Hello")
     * @param {string} type - The message type (system, user, ai, error, analysis, etc.)
     */
    function appendOutput(text, type = 'system') {
        const line = document.createElement('p');
        line.textContent = text;

        // Assign a class based on 'type' instead of substring checks
        switch (type) {
            case 'system':
                line.classList.add('system-message');
                break;
            case 'user':
                line.classList.add('user-message');
                break;
            case 'ai':
                line.classList.add('ai-message');
                break;
            case 'analysis':
                line.classList.add('analysis-message');
                break;
            case 'error':
                line.classList.add('error-message');
                break;
            case 'warning':
                line.classList.add('warning-message');
                break;
            case 'research':
                line.classList.add('research-message');
                break;
            default:
                line.classList.add('system-message');
                break;
        }

        outputElement.appendChild(line);
        outputElement.scrollTop = outputElement.scrollHeight;
        console.log(`Terminal message [${type}]:`, text);
    }

    function appendHTML(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        outputElement.appendChild(div);
        outputElement.scrollTop = outputElement.scrollHeight;
    }

    function updateProgress(percent, message) {
        progressFill.style.width = `${percent}%`;
        progressText.textContent = message || `${percent}%`;
    }
    function showProgress() {
        progressFill.style.width = '100%';
        progressText.textContent = 'Working...';
    }
    function hideProgress() {
        progressFill.style.width = '0';
        progressText.textContent = 'Ready';
    }

    // Show system line
    function writeSystem(msg) {
        appendOutput(`[SYSTEM] ${msg}`, 'system');
    }
    // Show user line
    function writeUser(msg) {
        appendOutput(`[USER] ${msg}`, 'user');
    }
    // Show AI line
    function writeAI(msg) {
        appendOutput(`[AI] ${msg}`, 'ai');
    }
    // Show error line
    function writeError(msg) {

// When a user exits the chat mode, send the chat history for memory creation
function exitChatMode() {
  const chatHistory = {
    messages: chatMessages
  };
  
  // Signal the server that chat has ended and send chat history for memory creation
  socket.emit('terminal:end-chat', chatHistory);
  
  // Reset chat state
  chatMessages = [];
  inChatMode = false;
  
  terminalOutput.append('\n[SYSTEM] Exiting AI chat mode.');
  updatePrompt();
}

// Add handler for the 'exit' command in chat mode
function handleChatExit() {
  exitChatMode();
  return true; // Command was handled
}

        appendOutput(`[ERROR] ${msg}`, 'error');
    }
    // Show analysis line
    function writeAnalysis(msg) {
        appendOutput(`[ANALYSIS] ${msg}`, 'analysis');
    }
    // Show research line
    function writeResearch(msg) {
        appendOutput(`[RESEARCH] ${msg}`, 'research');
    }
    // Show warning line
    function writeWarning(msg) {
        appendOutput(`[WARNING] ${msg}`, 'warning');
    }

    // Clear terminal but keep ASCII logo
    function clearTerminal() {
        const logo = outputElement.querySelector('.ascii-logo');
        const deepResearch = outputElement.querySelector('.deep-research');
        outputElement.innerHTML = '';
        if (logo) outputElement.appendChild(logo);
        if (deepResearch) outputElement.appendChild(deepResearch);
        writeSystem("Terminal cleared");
    }

    // Show help
    function showHelp() {
        const helpHTML = `
            <div class="help-menu">
                <h3>AVAILABLE COMMANDS</h3>
                <div class="command-group">
                    <h4>RESEARCH</h4>
                    <ul>
                        <li><code>research "query"</code> - Research a topic (quotes required)</li>
                        <li><code>depth 1-5</code> - Set research depth (default: 3)</li>
                        <li><code>breadth 2-10</code> - Set research breadth (default: 5)</li>
                    </ul>
                </div>
                <div class="command-group">
                    <h4>AI ASSISTANT</h4>
                    <ul>
                        <li><code>chat</code> or <code>ai</code> - Toggle AI chat mode</li>
                        <li><code>exit</code> - Exit AI chat mode (when in chat mode)</li>
                    </ul>
                </div>
                <div class="command-group">
                    <h4>GITHUB</h4>
                    <ul>
                        <li><code>github:status</code> - Check GitHub connection</li>
                        <li><code>github:sync</code> - Sync research to GitHub</li>
                        <li><code>github:test</code> - Test GitHub connection</li>
                    </ul>
                </div>
                <div class="command-group">
                    <h4>SYSTEM</h4>
                    <ul>
                        <li><code>help</code> - Show this help menu</li>
                        <li><code>clear</code> - Clear terminal</li>
                        <li><code>status</code> - Check system status</li>
                        <li><code>models</code> - Show available AI models</li>
                    </ul>
                </div>
            </div>
        `;
        appendHTML(helpHTML);
    }

    // Check system status
    function checkStatus() {
        writeSystem("Checking system status...");
        socket.emit('get-system-stats');
        socket.emit('check-api-status');
    }

    // Show models
    function showModels() {
        writeSystem("Fetching available models from Venice API...");
        showProgress();
        socket.emit('fetch-venice-models');
    }

    // Start research
    function startResearch(query) {
        writeSystem(`Starting research for: "${query}"`);
        writeSystem(`Depth: ${depth}, Breadth: ${breadth}`);

        updateProgress(5, 'Initializing research...');
        writeResearch(`Starting research on: "${query}" (depth: ${depth}, breadth: ${breadth})`);
        writeResearch("Initializing research paths...");

        activeResearch = { id: null, query, depth, breadth };
        isResearchInProgress = true;
        commandInput.disabled = true;
        commandInput.classList.add('input-locked');
        commandInput.placeholder = 'Research in progress...';

        socket.emit('research-query', activeResearch);
    }

    // Toggle AI chat mode
    function toggleAIChat() {
        aiChatMode = !aiChatMode;
        commandInput.placeholder = aiChatMode ? 'Ask me anything...' : '';
        if (aiChatMode) {
            writeSystem("Entering AI chat mode. Type 'exit' to leave.");
            if (window.chatHistory.length === 0) {
                window.chatHistory.push({
                    user: 'system',
                    message: 'Chat session initialized',
                });
            }
        } else {
            writeSystem("Exiting AI chat mode.");
        }
    }

    // Process command
    function processCommand(command) {
        // Store in history
        if (command.trim()) {
            commandHistory.push(command);
            historyPos = commandHistory.length;
        } else return;

        // Lowercase for checking
        const cmd = command.trim().toLowerCase();
        const args = cmd.split(' ');
        const mainCmd = args[0];

        switch (mainCmd) {
            case 'help':
                showHelp();
                break;
            case 'clear':
                clearTerminal();
                break;
            case 'status':
                checkStatus();
                break;
            case 'research': {
                // Must have quotes
                const match = command.match(/research\s+"([^"]+)"/);
                if (match && match[1]) {
                    startResearch(match[1]);
                } else {
                    writeError('Research query must be in quotes. Example: research "quantum computing"');
                }
                break;
            }
            case 'chat':
            case 'ai':
                toggleAIChat();
                break;
            case 'exit':
                if (aiChatMode) toggleAIChat();
                else writeError("Not in AI chat mode");
                break;
            case 'github:status':
                appendOutput("[SYSTEM] Checking GitHub connection status...", "system");
                socket.emit('github:verify-connection', {}, (response) => {
                    if (response.connected) {
                        appendOutput(`[GITHUB] Connected to repository: ${response.user}/${response.repo}`, "system");
                    } else {
                        appendOutput(`[GITHUB] Not connected: ${response.error}`, "system");
                    }
                });
                break;
            case 'github:sync':
                appendOutput("[SYSTEM] Syncing research files with GitHub...", "system");
                socket.emit('github:sync-all-research', {}, (response) => {
                    if (response.success) {
                        appendOutput(`[GITHUB] Synced ${response.count} of ${response.total} files to GitHub`, "system");
                    } else {
                        appendOutput(`[GITHUB] Sync failed: ${response.error}`, "system");
                    }
                });
                break;
            case 'github:test':
                appendOutput("[SYSTEM] Testing GitHub connectivity with sample file...", "system");
                socket.emit('github:test-upload', {}, (response) => {
                    if (response.success) {
                        appendOutput(`[GITHUB] Test successful. File uploaded to: ${response.url}`, "system");
                    } else {
                        appendOutput(`[GITHUB] Test failed: ${response.error}`, "system");
                    }
                });
                break;
            case 'depth': {
                const d = parseInt(args[1]);
                if (d >= 1 && d <= 5) {
                    depth = d;
                    writeSystem(`Research depth set to ${depth}`);
                } else {
                    writeError("Depth must be between 1 and 5");
                }
                break;
            }
            case 'breadth': {
                const b = parseInt(args[1]);
                if (b >= 2 && b <= 10) {
                    breadth = b;
                    writeSystem(`Research breadth set to ${breadth}`);
                } else {
                    writeError("Breadth must be between 2 and 10");
                }
                break;
            }
            case 'models':
                showModels();
                break;
            default:
                writeError(`Unknown command: ${command}`);
                writeSystem(`Type "help" for available commands`);
                break;
        }
    }

    // Process AI chat message
    function processChatMessage(message) {
        // Show user line
        writeUser(message);

        // Show AI "thinking"
        const thinkingEl = document.createElement('p');
        thinkingEl.textContent = "[AI] Thinking...";
        thinkingEl.className = "message-ai";
        outputElement.appendChild(thinkingEl);
        outputElement.scrollTop = outputElement.scrollHeight;

        socket.emit('terminal:ai-message', {
            message: message,
            history: window.chatHistory.filter(item => item.user !== 'system'),
            model: 'deepseek-r1-671b'
        }, (response) => {
            outputElement.removeChild(thinkingEl);

            const responseText = response.text || '';
            // If there's a <think> block
            const analysisMatch = responseText.match(/<think>([\s\S]*?)<\/think>/);
            if (analysisMatch && analysisMatch[1]) {
                writeAnalysis(analysisMatch[1].trim());
                // Then the rest
                const actualResponse = responseText.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                if (actualResponse) writeAI(actualResponse);
            } else {
                writeAI(responseText);
            }

            if (response && response.success) {
                window.chatHistory.push({ user: 'ai', message: response.response });
                const parts = response.response.split(/<think>([\s\S]*?)<\/think>/);
                if (parts.length > 1) {
                    writeAnalysis(parts[1]);
                    writeAI(parts[2]);
                } else {
                    writeAI(response.response);
                }
                if (response.thinkingTags) {
                    write(`[THINKING] Thinking tags: ${response.thinkingTags.join(', ')}`, 'thinking');
                }
            } else {
                writeError(`AI response error: ${response ? response.response : 'Unknown error'}`);
            }
        });
    }

    // Command input handling
    commandInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const command = commandInput.value.trim();
            if (!command) return;
            if (aiChatMode && !command.startsWith('/')) {
                processChatMessage(command);
            } else if (aiChatMode && command === '/exit') {
                aiChatMode = false;
                writeSystem("Exiting AI chat mode. Type 'chat' to re-enter.");
            } else {
                processCommand(command);
            }
            commandInput.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyPos > 0) {
                historyPos--;
                commandInput.value = commandHistory[historyPos];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyPos < commandHistory.length - 1) {
                historyPos++;
                commandInput.value = commandHistory[historyPos];
            } else {
                historyPos = commandHistory.length;
                commandInput.value = '';
            }
        }
    });

    // Socket events
    socket.on('connect', () => {
        writeSystem("Connection established");
    });

    socket.on('research-progress', (data) => {
        if (!activeResearch) return;
        if (!activeResearch.id && data.id) {
            activeResearch.id = data.id;
        }
        updateProgress(data.progress, data.message);
        writeResearch(data.message);

        if (data.thoughtProcess) {
            appendHTML(`
                <div class="thought-process">
                    <div class="thought-process-header">Chain of Thought:</div>
                    <div class="thought-process-content">${data.thoughtProcess}</div>
                </div>
            `);
        }
        if (data.intermediateResults) {
            appendHTML(`
                <div class="intermediate-results">
                    <div class="intermediate-results-header">Intermediate Results:</div>
                    <div class="intermediate-results-content">${data.intermediateResults}</div>
                </div>
            `);
        }
    });

    socket.on('research-complete', (data) => {
        if (!activeResearch || activeResearch.id !== data.id) return;
        progressFill.style.width = '100%';
        progressText.textContent = 'Research complete!';
        setTimeout(() => {
            progressFill.style.width = '0%';
            progressText.textContent = 'Ready';
        }, 3000);

        commandInput.disabled = false;
        commandInput.classList.remove('input-locked');
        commandInput.placeholder = '';
        commandInput.focus();
        isResearchInProgress = false;

        if (data.results) {
            appendOutput(`[RESEARCH] ${data.results}`, 'success');
        }
    });

    socket.on('research-error', (data) => {
        commandInput.disabled = false;
        commandInput.classList.remove('input-locked');
        commandInput.placeholder = '';
        commandInput.focus();
        isResearchInProgress = false;

        progressText.textContent = 'Error';
        progressFill.style.width = '0%';
        progressFill.style.backgroundColor = '#ff6b6b';

        if (data.message) {
            writeError(data.message);
        }
    });

    socket.on('system-stats', (stats) => {
        appendHTML(`
            <div class="system-stats">
                <h3>SYSTEM STATUS</h3>
                <div class="stat-item">
                    <span class="stat-label">Memory Usage:</span>
                    <span class="stat-value">${stats.memory}%</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${stats.memory}%"></div>
                    </div>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Uptime:</span>
                    <span class="stat-value">${stats.uptime}</span>
                </div>
            </div>
        `);
    });

    socket.on('api-status', (status) => {
        appendHTML(`
            <div class="api-status">
                <h3>API STATUS</h3>
                <div class="stat-item">
                    <span class="stat-label">Venice AI:</span>
                    <span class="stat-value ${status.venice ? 'active' : 'inactive'}">${status.venice ? 'CONNECTED' : 'DISCONNECTED'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Brave Search:</span>
                    <span class="stat-value ${status.brave ? 'active' : 'inactive'}">${status.brave ? 'CONNECTED' : 'DISCONNECTED'}</span>
                </div>
            </div>
        `);
    });

    socket.on('research-status', (data) => {
        const percent = data.progress || 0;
        updateProgress(percent, data.message || 'Processing...');
        if (data.message) {
            writeResearch(data.message);
        }

        if (data.thoughtProcess) {
            let processContainer = document.querySelector('.research-process-container');
            if (!processContainer) {
                processContainer = document.createElement('div');
                processContainer.className = 'research-process-container';
                outputElement.appendChild(processContainer);

                const header = document.createElement('div');
                header.className = 'research-step-header';
                header.textContent = '=== RESEARCH PROCESS ===';
                processContainer.appendChild(header);
            }
            processContainer.innerHTML = '';
            const header = document.createElement('div');
            header.className = 'research-step-header';
            header.textContent = '=== RESEARCH PROCESS ===';
            processContainer.appendChild(header);

            const thoughts = data.thoughtProcess.split('<br>');
            thoughts.forEach(thought => {
                if (thought.trim()) {
                    const thoughtElement = document.createElement('div');
                    thoughtElement.className = 'ai-thought';
                    thoughtElement.textContent = thought;
                    processContainer.appendChild(thoughtElement);
                }
            });
            processContainer.scrollTop = processContainer.scrollHeight;
            outputElement.scrollTop = outputElement.scrollHeight;
        }
    });

    // Additional “chat-reasoning” or “chat-response” events, if needed
    socket.on('chat-reasoning', (data) => {
        if (data.success && data.reasoning) {
            write(`[THINKING] ${data.reasoning}`, 'thinking');
        }
    });
    socket.on('chat-response', (data) => {
        hideProgress();
        if (data.success) {
            writeAI(data.response);
        } else {
            writeError(data.response || 'Unknown error');
        }
    });
});
