document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    // GitHub Repository Configuration Elements
    const githubOwnerInput = document.getElementById('github-owner');
    const githubResearchRepoInput = document.getElementById('github-research-repo');
    const githubBranchInput = document.getElementById('github-branch');
    const githubPathInput = document.getElementById('github-path');
    const githubMemoryRepoInput = document.getElementById('github-memory-repo');
    const githubMemoryBranchInput = document.getElementById('github-memory-branch');
    const githubMemoryPathInput = document.getElementById('github-memory-path');
    const saveResearchRepoSettingsBtn = document.getElementById('save-research-repo-settings');
    const saveMemoryRepoSettingsBtn = document.getElementById('save-memory-repo-settings');
    const saveGithubTokenBtn = document.getElementById('save-github-token');
    const githubTokenInput = document.getElementById('github-token');

    // GitHub Status and Actions Elements
    const githubApiStatus = document.getElementById('github-api-status');
    const githubStatusDetails = document.getElementById('github-status-details');
    const verifyConnectionBtn = document.getElementById('verify-connection');
    const syncAllResearchBtn = document.getElementById('sync-all-research');
    const uploadResearchBtn = document.getElementById('upload-research-btn');
    const testGithubUploadBtn = document.getElementById('test-github-upload');
    const refreshActivityBtn = document.getElementById('refresh-activity');
    const githubActivity = document.getElementById('github-activity');
    const uploadFileBtn = document.getElementById('upload-file-btn');
    const uploadResult = document.getElementById('upload-result');
    const filePathInput = document.getElementById('file-path-input');
    const commitMessageInput = document.getElementById('commit-message-input');
    const fileContentInput = document.getElementById('file-content-input');

    // System and API Elements
    const systemLog = document.getElementById('system-log');
    const refreshStatusBtn = document.getElementById('refresh-status');
    const clearLogsBtn = document.getElementById('clear-logs');
    const veniceApiKeyInput = document.getElementById('venice-api-key');
    const braveApiKeyInput = document.getElementById('brave-api-key');
    const saveVeniceKeyBtn = document.getElementById('save-venice-key');
    const saveBraveKeyBtn = document.getElementById('save-brave-key');
    const veniceStatusEl = document.getElementById('venice-status');
    const searchStatusEl = document.getElementById('search-status');
    const githubStatusEl = document.getElementById('github-status');
    const storageStatusEl = document.getElementById('storage-status');
    const veniceDetailsEl = document.getElementById('venice-details');
    const searchDetailsEl = document.getElementById('search-details');
    const githubDetailsEl = document.getElementById('github-details');
    const storageDetailsEl = document.getElementById('storage-details');
    const defaultDepthInput = document.getElementById('default-depth');
    const defaultBreadthInput = document.getElementById('default-breadth');
    const publicResearchSelect = document.getElementById('public-research');
    const saveResearchSettingsBtn = document.getElementById('save-research-settings');

    // Add log entry to system log
    function addLogEntry(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';

        let prefix;
        switch(type) {
            case 'error':
                prefix = '[ERROR]';
                break;
            case 'warning':
                prefix = '[WARNING]';
                break;
            case 'success':
                prefix = '[SUCCESS]';
                break;
            default:
                prefix = '[INFO]';
        }

        logEntry.textContent = `${prefix} ${message}`;
        systemLog.appendChild(logEntry);
        systemLog.scrollTop = systemLog.scrollHeight;
    }

    // Check API status on page load
    function checkAPIStatus() {
        addLogEntry('Checking API connections...');
        socket.emit('check-api-status');
    }

    // Save API key
    function saveAPIKey(key, value) {
        if (!value.trim()) {
            addLogEntry(`${key} cannot be empty`, 'error');
            return;
        }

        const data = {};
        data[key.toLowerCase()] = value;

        addLogEntry(`Saving ${key}...`);
        socket.emit('save-config', data);
    }

    // Event Listeners
    saveVeniceKeyBtn.addEventListener('click', () => {
        saveAPIKey('venice', veniceApiKeyInput.value);
    });

    saveBraveKeyBtn.addEventListener('click', () => {
        saveAPIKey('brave', braveApiKeyInput.value);
    });

    saveGithubTokenBtn.addEventListener('click', () => {
        saveAPIKey('github', githubTokenInput.value);
    });

    // Save GitHub Research Repository Settings
    saveResearchRepoSettingsBtn.addEventListener('click', () => {
        const owner = githubOwnerInput.value.trim();
        const repo = githubResearchRepoInput.value.trim();
        const branch = githubBranchInput.value.trim() || 'main';
        const path = githubPathInput.value.trim() || 'research';

        if (owner && repo) {
            socket.emit('save-github-settings', {
                owner: owner,
                researchRepo: repo,
                branch: branch,
                path: path
            });
            addLogEntry('Saving GitHub Research Repository settings...');
        } else {
            addLogEntry('Please enter valid GitHub owner and repository name', 'error');
        }
    });

    // Save GitHub Memory Repository Settings
    saveMemoryRepoSettingsBtn.addEventListener('click', () => {
        const owner = githubOwnerInput.value.trim(); // Use same owner
        const repo = githubMemoryRepoInput.value.trim();
        const branch = githubMemoryBranchInput.value.trim() || 'main';
        const path = githubMemoryPathInput.value.trim() || 'memory';

        if (owner && repo) {
            socket.emit('save-github-memory-settings', {
                owner: owner,
                memoryRepo: repo,
                branch: branch,
                path: path
            });
            addLogEntry('Saving GitHub Memory Repository settings...');
        } else {
            addLogEntry('Please enter valid GitHub owner and repository name', 'error');
        }
    });

    saveResearchSettingsBtn.addEventListener('click', () => {
        const depth = defaultDepthInput.value.trim();
        const breadth = defaultBreadthInput.value.trim();
        const publicResearch = publicResearchSelect.value === 'true';

        socket.emit('save-research-settings', {
            defaultDepth: depth,
            defaultBreadth: breadth,
            publicResearch: publicResearch
        });
        addLogEntry('Saving research settings...');
    });

    refreshStatusBtn.addEventListener('click', checkAPIStatus);

    clearLogsBtn.addEventListener('click', () => {
        systemLog.innerHTML = '';
        addLogEntry('Logs cleared');
    });

    // Socket.io event handlers
    socket.on('connect', () => {
        addLogEntry('Connected to server', 'success');
        checkAPIStatus();
    });

    socket.on('disconnect', () => {
        addLogEntry('Disconnected from server', 'error');
        updateStatus(veniceStatusEl, 'OFFLINE', 'error');
        updateStatus(searchStatusEl, 'OFFLINE', 'error');
        updateStatus(githubStatusEl, 'OFFLINE', 'error');
        const storageStatus = document.getElementById('storage-status');
        if (storageStatus) {
            updateStatus(storageStatus, 'OFFLINE', 'error');
        }
        updatePluginStatus(venicePluginStatus, 'OFFLINE');
        updatePluginStatus(githubPluginStatus, 'OFFLINE');
    });

    socket.on('api-status', (data) => {
        updateAPIStatus(data);
    });

    socket.on('config-saved', (data) => {
        addLogEntry(data.message, 'success');
        checkAPIStatus();
    });

    socket.on('config-error', (data) => {
        addLogEntry(data.message, 'error');
    });

    socket.on('research-settings-saved', (data) => {
        addLogEntry('Research settings saved', 'success');
    });

    socket.on('github-settings-saved', (data) => {
        addLogEntry('GitHub settings saved', 'success');
    });

    socket.on('github-memory-settings-saved', (data) => {
        addLogEntry('GitHub memory settings saved', 'success');
    });

    socket.on('plugin-status', (data) => {
        updatePluginStatus(
            data.plugin === 'venice' ? venicePluginStatus : githubPluginStatus, 
            data.status
        );
        addLogEntry(`Plugin ${data.plugin} status: ${data.status}`);
    });

    // GitHub activity events
    socket.on('github:activity', (activity) => {
        addGitHubActivity(activity.text, activity.timestamp);
    });

    // Helper Functions
    function updateStatus(element, status, className = 'warning') {
        if (!element) return;

        element.textContent = status;
        element.className = 'status-value';

        if (className) {
            element.classList.add(className);
        }

        if (status === 'ONLINE' || status === 'CONNECTED') {
            element.classList.add('active');
        } else if (status === 'OFFLINE' || status === 'ERROR') {
            element.classList.add('error');
        }
    }

    function updatePluginStatus(element, status) {
        if (!element) return;

        element.textContent = status;
        element.className = 'plugin-status';

        if (status === 'ACTIVE') {
            element.classList.add('active');
        } else if (status === 'ERROR' || status === 'OFFLINE') {
            element.classList.add('error');
        }
    }

    function updateAPIStatus(data) {
        // Venice API Status
        if (data.venice) {
            updateStatus(veniceStatusEl, 'CONNECTED', 'active');
            veniceDetailsEl.textContent = 'API Key Configured';
            updatePluginStatus(venicePluginStatus, 'ACTIVE');
        } else {
            updateStatus(veniceStatusEl, 'NOT CONFIGURED');
            veniceDetailsEl.textContent = 'API Key Missing';
            updatePluginStatus(venicePluginStatus, 'INACTIVE');
        }

        // Brave Search API Status
        if (data.brave) {
            updateStatus(searchStatusEl, 'CONNECTED', 'active');
            searchDetailsEl.textContent = 'API Key Configured';
        } else {
            updateStatus(searchStatusEl, 'NOT CONFIGURED');
            searchDetailsEl.textContent = 'API Key Missing';
        }

        // Update Memory System Status (GitHub + Local Cache)
        const storageStatus = document.getElementById('storage-status');
        const storageDetails = document.getElementById('storage-details');
        if (storageStatus && storageDetails) {
            if (data.github) {
                updateStatus(storageStatus, 'MULTI-LAYERED', 'active');
                storageDetails.textContent = 'Local cache + GitHub long-term storage';
            } else {
                updateStatus(storageStatus, 'LOCAL ONLY', 'warning');
                storageDetails.textContent = 'Local cache only (no persistent storage)';
            }
        }

        // GitHub API Status
        if (data.github) {
            updateStatus(githubStatusEl, 'CONNECTED', 'active');
            githubDetailsEl.textContent = 'Token Configured';
            updatePluginStatus(githubPluginStatus, 'ACTIVE');
        } else {
            updateStatus(githubStatusEl, 'NOT CONFIGURED');
            githubDetailsEl.textContent = 'Token Missing';
            updatePluginStatus(githubPluginStatus, 'INACTIVE');
        }

        addLogEntry('API status check complete');
    }

    // GitHub specific helper functions
    function updateGitHubConnectionStatus(status) {
        if (githubApiStatus) {
            if (status.connected) {
                githubApiStatus.textContent = 'CONNECTED';
                githubApiStatus.className = 'status-value active';
            } else {
                githubApiStatus.textContent = 'DISCONNECTED';
                githubApiStatus.className = 'status-value inactive';
            }
        }

        if (githubStatusDetails) {
            if (status.connected) {
                githubStatusDetails.textContent = `Connected to repository: ${status.user}/${status.repo}`;
            } else {
                githubStatusDetails.textContent = status.error || 'Unknown error';
            }
        }

        if (githubStatusEl) {
            githubStatusEl.textContent = status.connected ? 'ACTIVE' : 'INACTIVE';
            githubStatusEl.className = status.connected ? 'status-value active' : 'status-value inactive';
        }

        if (githubDetailsEl) {
            githubDetailsEl.textContent = status.connected ? 
                `Repository: ${status.user}/${status.repo}` : 
                'Not configured';
        }

        addLogEntry(status.connected ? 
            `GitHub connection verified: ${status.user}/${status.repo}` : 
            `GitHub connection failed: ${status.error || 'Unknown error'}`, 
            status.connected ? 'success' : 'error');
    }

    function addGitHubActivity(text, timestamp = new Date().toISOString()) {
        if (!githubActivity) return;

        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';

        const timeEl = document.createElement('span');
        timeEl.className = 'timestamp';
        timeEl.textContent = new Date(timestamp).toLocaleString();

        const textEl = document.createElement('span');
        textEl.className = 'activity-text';
        textEl.textContent = text;

        activityItem.appendChild(timeEl);
        activityItem.appendChild(textEl);

        // Add to the top of the list
        if (githubActivity.firstChild) {
            githubActivity.insertBefore(activityItem, githubActivity.firstChild);
        } else {
            githubActivity.appendChild(activityItem);
        }
    }

    function updateGitHubActivity(response) {
        if (!githubActivity || !response.success) return;

        // Clear existing activities
        githubActivity.innerHTML = '';

        // Add new activities
        if (response.activities && response.activities.length > 0) {
            response.activities.forEach(activity => {
                addGitHubActivity(activity.text, activity.timestamp);
            });
        } else {
            addGitHubActivity('No recent activity found');
        }
    }

    // Initial GitHub connection verification
    if (verifyConnectionBtn) {
        // Verify connection when the page loads
        setTimeout(() => {
            verifyConnectionBtn.click();
        }, 500);
    }

    // Initial GitHub activity load
    if (refreshActivityBtn) {
        // Load activity when the page loads
        setTimeout(() => {
            refreshActivityBtn.click();
        }, 1000);
    }

    // Event listeners for saved settings
    socket.on('config-saved', (data) => {
        addLogEntry(data.message, 'success');
    });

    socket.on('config-error', (data) => {
        addLogEntry(data.message, 'error');
    });

    socket.on('github-settings-saved', (data) => {
        addLogEntry(data.message, 'success');
    });

    socket.on('research-settings-saved', (data) => {
        addLogEntry(data.message, 'success');
    });

    socket.on('plugin-status', (data) => {
        const element = document.getElementById(`${data.plugin}-plugin-status`);
        if (element) {
            element.textContent = data.status;
            element.className = data.status.toLowerCase() === 'active' ? 'plugin-status active' : 'plugin-status inactive';
        }
    });


    // Add log entry to system log
    function addLogEntry(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

        if (systemLog) {
            systemLog.appendChild(entry);
            systemLog.scrollTop = systemLog.scrollHeight;
        }
    }
});