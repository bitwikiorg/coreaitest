
/**
 * Memory Management Frontend Script
 * This script handles the memory management UI and interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Socket.io connection
    const socket = io();

    // DOM elements
    const memoryTypeList = document.getElementById('memoryTypeList');
    const memoryContent = document.getElementById('memoryContent');
    const memoryEntries = document.getElementById('memoryEntries');
    const refreshBtn = document.getElementById('refreshBtn');
    const syncBtn = document.getElementById('syncBtn');
    const githubStatus = document.getElementById('githubStatus');
    const queryInput = document.getElementById('queryInput');
    const submitQueryBtn = document.getElementById('submitQueryBtn');
    const aiSystemSelect = document.getElementById('aiSystemSelect');
    const currentMemorySize = document.getElementById('currentMemorySize');
    const consolidationStatus = document.getElementById('consolidationStatus');
    
    // Memory operations panel elements
    const memoryOperationsPanel = document.getElementById('memoryOperationsPanel');
    const closeOperationsPanel = document.getElementById('closeOperationsPanel');
    const storeSystemSelect = document.getElementById('storeSystemSelect');
    const storeTypeSelect = document.getElementById('storeTypeSelect');
    const storeContentInput = document.getElementById('storeContentInput');
    const storeMemoryBtn = document.getElementById('storeMemoryBtn');
    const profileSelect = document.getElementById('profileSelect');
    const applyProfileBtn = document.getElementById('applyProfileBtn');
    const runMaintenanceBtn = document.getElementById('runMaintenanceBtn');

    // Memory toggle switches
    const enableShortTermMemory = document.getElementById('enableShortTermMemory');
    const enableLongTermMemory = document.getElementById('enableLongTermMemory');
    const enableEpisodicMemory = document.getElementById('enableEpisodicMemory');
    const enableSemanticMemory = document.getElementById('enableSemanticMemory');
    const enableProceduralMemory = document.getElementById('enableProceduralMemory');
    const enableWorkingMemory = document.getElementById('enableWorkingMemory');

    // Check if all elements are found
    if (!memoryTypeList || !memoryContent || !memoryEntries || !refreshBtn || 
        !syncBtn || !githubStatus || !queryInput || !submitQueryBtn || !aiSystemSelect) {
        console.error('Missing core DOM elements');
        if (memoryContent) {
            memoryContent.innerHTML = '<div class="memory-entry"><div class="memory-entry-content">Error loading memory management interface. Please try refreshing the page.</div></div>';
        }
        return;
    }

    let currentMemoryType = 'short-term';
    let memoryStatus = {
        shortTerm: { enabled: true, size: 0 },
        longTerm: { enabled: true, size: 0 },
        episodic: { enabled: true, size: 0 },
        semantic: { enabled: true, size: 0 },
        procedural: { enabled: true, size: 0 },
        working: { enabled: true, size: 0 }
    };
    
    let consolidationThresholds = {
        'short-term': 75,
        'long-term': 75,
        'episodic': 75,
        'semantic': 75, 
        'procedural': 75
    };

    // Add operations button to the memory actions
    const actionsDiv = document.querySelector('.memory-actions');
    if (actionsDiv) {
        actionsDiv.innerHTML = `
            <div class="action-buttons">
                <button id="refreshBtn" class="btn btn-sm">Refresh</button>
                <button id="syncBtn" class="btn btn-sm btn-primary">Sync</button>
            </div>
            <button id="operationsBtn" class="btn btn-sm">Operations</button>
        `;
    }

    const operationsBtn = document.getElementById('operationsBtn');
    if (operationsBtn) {
        operationsBtn.addEventListener('click', () => {
            memoryOperationsPanel.classList.toggle('open');
        });
    }

    if (closeOperationsPanel) {
        closeOperationsPanel.addEventListener('click', () => {
            memoryOperationsPanel.classList.remove('open');
        });
    }

    // Verify memory system connection
    socket.emit('memory:verify-connection', {}, (response) => {
        if (response.connected) {
            githubStatus.innerHTML = `
                <span class="status-badge status-connected">Connected</span>
                Memory system initialized
            `;
            
            // Check if this is first time initialization
            socket.emit('memory:check-first-run', {}, (initResponse) => {
                if (initResponse.firstRun) {
                    // Initialize with default memory content for first run
                    initializeDefaultMemory();
                } else {
                    loadMemories(currentMemoryType);
                }
            });
        } else {
            githubStatus.innerHTML = `
                <span class="status-badge status-disconnected">Disconnected</span>
                ${response.error || 'Memory system not initialized'}
            `;
        }
    });

    // Initialize default memory content for first run
    function initializeDefaultMemory() {
        const defaultMemories = {
            'short-term': "## Initial System Boot\n\nThis is the first activation of the CORE Memory AI system. Short-term memory initialized with standard parameters. Ready to receive and process information.",
            'episodic': "## System Genesis Event\n\nInitial system activation occurred. All core memories initialized and baseline cognitive functions established.",
            'working': JSON.stringify({
                system_status: "Online",
                initialization_time: new Date().toISOString(),
                active_processes: ["memory_indexing", "connection_verification"],
                current_tasks: []
            }, null, 2),
            'semantic': "## Core Knowledge Base\n\nBaseline semantic understanding established. Ready to accumulate and synthesize knowledge domains.",
            'procedural': "## Standard Operating Procedures\n\n1. Memory input processing\n2. Query response generation\n3. Memory consolidation\n4. System maintenance",
            'long-term': "## System Architecture\n\nCORE Memory AI initialized with multi-layered memory architecture designed for cognitive processing, information retrieval, and adaptive learning."
        };

        // Store default memories
        let promises = [];
        for (const type in defaultMemories) {
            const promise = new Promise((resolve) => {
                socket.emit('memory:store-memory', {
                    aiSystem: 'system',
                    memoryType: type,
                    content: defaultMemories[type]
                }, (response) => {
                    console.log(`Default ${type} memory initialization:`, response.success ? 'Success' : 'Failed');
                    resolve();
                });
            });
            promises.push(promise);
        }

        Promise.all(promises).then(() => {
            loadMemories(currentMemoryType);
        });
    }

    // Load memories of specified type
    function loadMemories(type) {
        currentMemoryType = type;

        // Update active class in sidebar
        document.querySelectorAll('.memory-type-item').forEach(item => {
            item.classList.remove('active');
        });

        const typeItem = document.querySelector(`.memory-type-item[data-type="${type}"]`);
        if (typeItem) {
            typeItem.classList.add('active');
        } else {
            console.error(`Memory type item not found for type: ${type}`);
        }

        // Clear current entries
        memoryEntries.innerHTML = '<div class="memory-entry">Loading memories...</div>';

        // Request memory metadata
        socket.emit('memory:get-metadata', { type }, (metaResponse) => {
            if (metaResponse.success) {
                updateMemoryMetrics(type, metaResponse.size, metaResponse.consolidationStatus);
            }
        });

        // Request memory content
        socket.emit('memory:get-memory', { type }, (response) => {
            if (response.success) {
                // Display the memory content
                displayMemoryContent(type, response.content);
            } else {
                memoryEntries.innerHTML = `
                    <div class="memory-entry">
                        <div class="memory-entry-content">
                            No memories found for this type or error loading: ${response.error || 'Unknown error'}
                        </div>
                    </div>
                `;
            }
        });
    }

    // Update memory metrics display
    function updateMemoryMetrics(type, size, consolidationStatus) {
        // Update size display
        const sizeKB = Math.round((size / 1024) * 100) / 100;
        currentMemorySize.textContent = `Size: ${sizeKB} KB`;
        
        // Update memory status object
        const normalizedType = type.replace('-', '');
        if (memoryStatus[normalizedType]) {
            memoryStatus[normalizedType].size = size;
        }
        
        // Update consolidation status
        const threshold = consolidationThresholds[type] || 75;
        const percentage = size > 0 ? Math.round((size / threshold) * 100) : 0;
        const statusDisplay = percentage >= 75 
            ? `${percentage}% (Consolidation needed)`
            : `${percentage}%`;
            
        consolidationStatus.textContent = `Consolidation: ${statusDisplay}`;
        
        // Visual indicator for consolidation status
        if (percentage >= 90) {
            consolidationStatus.style.color = '#ff4d4d'; // Red
        } else if (percentage >= 75) {
            consolidationStatus.style.color = '#ffcc00'; // Yellow
        } else {
            consolidationStatus.style.color = '#4fd1c5'; // Normal teal
        }
    }

    // Display memory content based on type
    function displayMemoryContent(type, content) {
        // Clear current entries
        memoryEntries.innerHTML = '';

        // Add title based on type
        const typeTitle = type.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');

        if (type === 'working' && typeof content === 'string') {
            try {
                content = JSON.parse(content);
            } catch (e) {
                console.error('Error parsing working memory JSON:', e);
            }
        }

        memoryEntries.innerHTML = `
            <h2>${typeTitle} Memory</h2>
            <div class="memory-entry">
                <div class="memory-entry-content markdown-content">
                    ${type === 'working' && typeof content === 'object' 
                        ? formatJSON(content) 
                        : formatMarkdown(content)}
                </div>
            </div>
        `;
    }

    // Format JSON with syntax highlighting for better readability
    function formatJSON(json) {
        if (!json) return 'No content available';
        
        const jsonString = JSON.stringify(json, null, 4);
        
        // Apply syntax highlighting
        const highlighted = jsonString.replace(
            /"([^"]+)":/g, '<span class="json-key">"$1"</span>:'
        ).replace(
            /"([^"]*)"/g, '<span class="json-string">"$1"</span>'
        ).replace(
            /\b(\d+)(?!["])\b/g, '<span class="json-number">$1</span>'
        ).replace(
            /\b(true|false)\b/g, '<span class="json-boolean">$1</span>'
        ).replace(
            /\bnull\b/g, '<span class="json-null">null</span>'
        );
        
        return `<pre>${highlighted}</pre>`;
    }

    // Format markdown content for display
    function formatMarkdown(content) {
        if (!content) return 'No content available';
        
        // This is a very simple markdown formatter
        // For a real application, consider using a library like marked.js
        return content
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/\*\*(.*)\*\*/gm, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gm, '<em>$1</em>')
            .replace(/\n/gm, '<br>');
    }

    // Submit a query to the memory system
    function submitQuery() {
        const query = queryInput.value.trim();
        const aiSystem = aiSystemSelect.value;
        
        if (!query) return;
        
        // Show loading state
        memoryEntries.innerHTML = '<div class="memory-entry">Processing query...</div>';
        
        // Send query to server
        socket.emit('memory:process-query', {
            query,
            aiSystem
        }, (response) => {
            if (response.success) {
                displayQueryResult(response.result);
            } else {
                memoryEntries.innerHTML = `
                    <div class="memory-entry">
                        <div class="memory-entry-content">
                            Error processing query: ${response.error || 'Unknown error'}
                        </div>
                    </div>
                `;
            }
        });
    }

    // Display query result
    function displayQueryResult(result) {
        let html = `
            <h2>Memory Query Result</h2>
            <div class="memory-entry">
                <div class="memory-entry-header">
                    <div class="memory-entry-title">Query Response</div>
                    <div class="memory-entry-date">${new Date().toISOString()}</div>
                </div>
                <div class="memory-entry-content markdown-content">
        `;
        
        if (typeof result === 'object') {
            // Format object result
            for (const key in result) {
                html += `<h3>${key}</h3>`;
                if (typeof result[key] === 'object') {
                    html += formatJSON(result[key]);
                } else {
                    html += formatMarkdown(result[key]);
                }
            }
        } else {
            // Format string result
            html += formatMarkdown(result);
        }
        
        html += '</div></div>';
        
        memoryEntries.innerHTML = html;
    }

    // Toggle memory type enabled/disabled
    function toggleMemoryType(type, enabled) {
        socket.emit('memory:toggle-memory', {
            type,
            enabled
        }, (response) => {
            if (!response.success) {
                console.error(`Failed to toggle ${type} memory:`, response.error);
                // Reset checkbox to previous state
                const checkbox = document.getElementById(`enable${type.charAt(0).toUpperCase() + type.slice(1)}Memory`);
                if (checkbox) {
                    checkbox.checked = !enabled;
                }
            }
        });
    }

    // Apply memory profile
    function applyProfile(profileName) {
        socket.emit('memory:apply-profile', {
            profile: profileName
        }, (response) => {
            if (response.success) {
                alert(`Successfully applied ${profileName} profile`);
                
                // Update memory toggles based on profile configuration
                if (response.config) {
                    for (const type in response.config) {
                        const checkbox = document.getElementById(`enable${type.charAt(0).toUpperCase() + type.slice(1)}Memory`);
                        if (checkbox) {
                            checkbox.checked = response.config[type].enabled;
                        }
                    }
                }
                
                // Reload current memory type
                loadMemories(currentMemoryType);
            } else {
                alert(`Failed to apply profile: ${response.error || 'Unknown error'}`);
            }
        });
    }

    // Store new memory
    function storeMemory(aiSystem, memoryType, content) {
        socket.emit('memory:store-memory', {
            aiSystem,
            memoryType,
            content
        }, (response) => {
            if (response.success) {
                alert('Memory stored successfully');
                if (currentMemoryType === memoryType) {
                    loadMemories(memoryType);
                }
            } else {
                alert(`Failed to store memory: ${response.error || 'Unknown error'}`);
            }
        });
    }

    // Event listeners
    refreshBtn.addEventListener('click', () => loadMemories(currentMemoryType));

    // Click handler for memory types
    memoryTypeList.addEventListener('click', (e) => {
        const item = e.target.closest('.memory-type-item');
        if (item) {
            const type = item.dataset.type;
            loadMemories(type);
        }
    });

    // Sync button handler
    syncBtn.addEventListener('click', () => {
        const oldButtonText = syncBtn.textContent;
        syncBtn.textContent = 'Syncing...';
        syncBtn.disabled = true;

        socket.emit('memory:run-maintenance', {}, (response) => {
            syncBtn.textContent = oldButtonText;
            syncBtn.disabled = false;

            if (response.success) {
                alert('Memory maintenance completed successfully');
                loadMemories(currentMemoryType);
            } else {
                alert(`Memory maintenance failed: ${response.error || 'Unknown error'}`);
            }
        });

// Handle memory temperature slider
const memoryTemperatureSlider = document.getElementById('memoryTemperature');
const memoryTemperatureValue = document.getElementById('memoryTemperatureValue');

if (memoryTemperatureSlider && memoryTemperatureValue) {
    memoryTemperatureSlider.addEventListener('input', function() {
        const value = this.value / 10;
        memoryTemperatureValue.textContent = value.toFixed(1);
    });
}

// Handle memory top p slider
const memoryTopPSlider = document.getElementById('memoryTopP');
const memoryTopPValue = document.getElementById('memoryTopPValue');

if (memoryTopPSlider && memoryTopPValue) {
    memoryTopPSlider.addEventListener('input', function() {
        const value = this.value / 10;
        memoryTopPValue.textContent = value.toFixed(1);
    });
}

// Handle apply settings button
const applyProfileBtn = document.getElementById('applyProfileBtn');

if (applyProfileBtn) {
    applyProfileBtn.addEventListener('click', function() {
        const profile = document.getElementById('profileSelect').value;
        const temperature = parseFloat(memoryTemperatureValue.textContent);
        const topP = parseFloat(memoryTopPValue.textContent);
        
        socket.emit('memory:update-settings', {
            profile,
            temperature,
            topP
        });
        
        showStatusMessage('Memory settings updated', true);
    });
}

    });

    // Query submission
    submitQueryBtn.addEventListener('click', submitQuery);
    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitQuery();
        }
    });

    // Store memory button
    if (storeMemoryBtn) {
        storeMemoryBtn.addEventListener('click', () => {
            const aiSystem = storeSystemSelect.value;
            const memoryType = storeTypeSelect.value;
            let content = storeContentInput.value.trim();
            
            if (!content) {
                alert('Please enter memory content');
                return;
            }
            
            // Parse as JSON for working memory
            if (memoryType === 'working') {
                try {
                    // Try to parse as JSON, but allow string input
                    content = isJSONString(content) ? JSON.parse(content) : content;
                } catch (e) {
                    console.warn('Content is not valid JSON, storing as string');
                }
            }
            
            storeMemory(aiSystem, memoryType, content);
        });
    }

    // Memory toggle switches
    if (enableShortTermMemory) {
        enableShortTermMemory.addEventListener('change', (e) => {
            toggleMemoryType('shortTerm', e.target.checked);
        });
    }
    
    if (enableLongTermMemory) {
        enableLongTermMemory.addEventListener('change', (e) => {
            toggleMemoryType('longTerm', e.target.checked);
        });
    }
    
    if (enableEpisodicMemory) {
        enableEpisodicMemory.addEventListener('change', (e) => {
            toggleMemoryType('episodic', e.target.checked);
        });
    }
    
    if (enableSemanticMemory) {
        enableSemanticMemory.addEventListener('change', (e) => {
            toggleMemoryType('semantic', e.target.checked);
        });
    }
    
    if (enableProceduralMemory) {
        enableProceduralMemory.addEventListener('change', (e) => {
            toggleMemoryType('procedural', e.target.checked);
        });
    }
    
    if (enableWorkingMemory) {
        enableWorkingMemory.addEventListener('change', (e) => {
            toggleMemoryType('working', e.target.checked);
        });
    }

    // Apply profile button
    if (applyProfileBtn) {
        applyProfileBtn.addEventListener('click', () => {
            const profileName = profileSelect.value;
            applyProfile(profileName);
        });
    }

    // Run maintenance button
    if (runMaintenanceBtn) {
        runMaintenanceBtn.addEventListener('click', () => {
            runMaintenanceBtn.textContent = 'Running...';
            runMaintenanceBtn.disabled = true;
            
            socket.emit('memory:run-maintenance', {}, (response) => {
                runMaintenanceBtn.textContent = 'Run Maintenance';
                runMaintenanceBtn.disabled = false;
                
                if (response.success) {
                    alert('Memory maintenance completed successfully');
                    loadMemories(currentMemoryType);
                } else {
                    alert(`Memory maintenance failed: ${response.error || 'Unknown error'}`);
                }
            });
        });
    }

    // Helper function to check if a string is valid JSON
    function isJSONString(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }
});
