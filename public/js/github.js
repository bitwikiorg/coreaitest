/**
 * GitHub Integration Dashboard
 * Manages GitHub integration settings and actions
 */
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // Elements with null checking
    const githubApiStatus = document.getElementById('github-api-status');
    const githubStatusDetails = document.getElementById('github-status-details');
    const verifyConnectionBtn = document.getElementById('verify-connection');
    const saveResearchRepoBtn = document.getElementById('save-research-repo');
    const syncAllResearchBtn = document.getElementById('sync-all-research');
    const uploadResearchBtn = document.getElementById('upload-research-btn');
    const testGithubUploadBtn = document.getElementById('test-github-upload');
    const refreshActivityBtn = document.getElementById('refresh-activity');
    const githubActivity = document.getElementById('github-activity');
    const uploadFileBtn = document.getElementById('upload-file-btn');
    const uploadResult = document.getElementById('upload-result');

    // Check if all critical elements exist before proceeding
    if (!githubApiStatus || !githubStatusDetails) {
        console.error('Critical GitHub UI elements not found');
    }

    // Form inputs
    const researchRepoOwner = document.getElementById('research-repo-owner');
    const researchRepoName = document.getElementById('research-repo-name');
    const researchRepoBranch = document.getElementById('research-repo-branch');
    const researchRepoPath = document.getElementById('research-repo-path');
    const filePathInput = document.getElementById('file-path-input');
    const fileContentInput = document.getElementById('file-content-input');
    const commitMessageInput = document.getElementById('commit-message-input');

    // Load initial settings
    socket.emit('github:get-settings', {}, (response) => {
        if (response.success) {
            const settings = response.settings;
            researchRepoOwner.value = settings.owner || '';
            researchRepoName.value = settings.repo || '';
            researchRepoBranch.value = settings.branch || 'main';
            researchRepoPath.value = settings.path || 'research';

            updateConnectionStatus(settings.status);
        } else {
            addActivity('Failed to load GitHub settings');
        }
    });

    // Check GitHub connection
    if (verifyConnectionBtn) {
        verifyConnectionBtn.addEventListener('click', () => {
            githubApiStatus.textContent = 'CHECKING...';
            githubApiStatus.className = 'status-value checking';
            githubStatusDetails.textContent = 'Verifying connection to GitHub...';

            socket.emit('github:verify-connection', {}, (response) => {
                updateConnectionStatus(response);
            });
        });
    }

    // Save repository settings
    if (saveResearchRepoBtn) {
        saveResearchRepoBtn.addEventListener('click', () => {
            const settings = {
                owner: researchRepoOwner.value,
                repo: researchRepoName.value,
                branch: researchRepoBranch.value,
                path: researchRepoPath.value
            };

            socket.emit('github:save-settings', settings, (response) => {
                if (response.success) {
                    addActivity('GitHub settings saved successfully');
                    updateConnectionStatus(response.status);
                } else {
                    addActivity(`Failed to save settings: ${response.error}`);
                }
            });
        });
    }

    // Sync all research files (bidirectional - pull then push)
    if (syncAllResearchBtn) {
        syncAllResearchBtn.addEventListener('click', () => {
            addActivity('Starting full synchronization (pull then push)...');

            // First pull from GitHub, then push local changes
            socket.emit('github:pull-research', {}, (pullResponse) => {
                if (pullResponse.success) {
                    addActivity(`Successfully pulled ${pullResponse.count} research files from GitHub`);

                    // After pulling, push local changes
                    socket.emit('github:sync-all-research', {}, (pushResponse) => {
                        if (pushResponse.success) {
                            addActivity(`Successfully uploaded ${pushResponse.count} of ${pushResponse.total} research files`);
                        } else {
                            addActivity(`Upload failed: ${pushResponse.error}`);
                        }
                    });
                } else {
                    addActivity(`Pull failed: ${pullResponse.error}`);
                }
            });
        });
    }

    // Upload research files to GitHub (push only)
    if (uploadResearchBtn) {
        uploadResearchBtn.addEventListener('click', () => {
            addActivity('Uploading local research files to GitHub...');

            socket.emit('github:sync-all-research', {}, (response) => {
                if (response.success) {
                    addActivity(`Successfully uploaded ${response.count} of ${response.total} research files`);
                } else {
                    addActivity(`Upload failed: ${response.error}`);
                }
            });
        });
    }

    // Test GitHub upload
    if (testGithubUploadBtn) {
        testGithubUploadBtn.addEventListener('click', () => {
            addActivity('Starting test upload to GitHub...');

            socket.emit('github:test-upload', {}, (response) => {
                if (response.success) {
                    addActivity(`Successfully created test file: ${response.url}`);
                } else {
                    addActivity(`Test upload failed: ${response.error}`);
                }
            });
        });
    } else {
        console.warn('Test GitHub upload button not found in DOM');
    }

    // Custom file upload
    if (uploadFileBtn && filePathInput && fileContentInput) {
        uploadFileBtn.addEventListener('click', () => {
            const filePath = filePathInput.value.trim();
            const fileContent = fileContentInput.value.trim();
            const commitMessage = commitMessageInput ? commitMessageInput.value.trim() : `Upload file: ${filePath}`;

            if (!filePath) {
                if (uploadResult) uploadResult.innerHTML = 'Please enter a file path';
                return;
            }

            if (!fileContent) {
                if (uploadResult) uploadResult.innerHTML = 'Please enter file content';
                return;
            }

            if (uploadResult) uploadResult.innerHTML = 'Uploading file...';

            socket.emit('github:upload-file', {
                filePath,
                content: fileContent,
                message: commitMessage
            }, (response) => {
                if (response.success) {
                    if (uploadResult) {
                        uploadResult.innerHTML = `File uploaded successfully: <a href="${response.url}" target="_blank">${filePath}</a>`;
                    }
                    addActivity(`Uploaded file: ${filePath}`);
                } else {
                    if (uploadResult) {
                        uploadResult.innerHTML = `Upload failed: ${response.error}`;
                    }
                    addActivity(`Upload failed: ${response.error}`);
                }
            });
        });
    } else {
        console.warn('File upload elements not found in DOM:', {
            uploadFileBtn: !!uploadFileBtn,
            filePathInput: !!filePathInput,
            fileContentInput: !!fileContentInput
        });
    }

    // Refresh GitHub activity
    if (refreshActivityBtn) {
        refreshActivityBtn.addEventListener('click', () => {
            githubActivity.innerHTML = '<div class="activity-item"><span class="timestamp">Loading...</span><span class="activity-text">Loading recent activity...</span></div>';

            socket.emit('github:get-activity', {}, (response) => {
                githubActivity.innerHTML = '';

                if (response.success) {
                    response.activities.forEach(activity => {
                        addActivity(activity.text, activity.timestamp);
                    });

                    if (response.activities.length === 0) {
                        addActivity('No recent GitHub activity');
                    }
                } else {
                    addActivity('Failed to load GitHub activity');
                }
            });
        });
    }

    // Listen for GitHub events
    socket.on('github:activity', (activity) => {
        addActivity(activity.text, activity.timestamp);
    });

    // Update connection status display with better error handling
    function updateConnectionStatus(status) {
        if (!githubApiStatus || !githubStatusDetails) {
            console.warn('Status elements not found when updating connection status');
            return;
        }

        try {
            if (status.connected) {
                githubApiStatus.textContent = 'CONNECTED';
                githubApiStatus.className = 'status-value active';
                githubStatusDetails.textContent = `Connected to ${status.repo || 'GitHub'} (${status.user || 'Unknown user'})`;
            } else {
                githubApiStatus.textContent = 'DISCONNECTED';
                githubApiStatus.className = 'status-value inactive';
                githubStatusDetails.textContent = status.error || 'Not connected to GitHub';
            }
        } catch (error) {
            console.error('Error updating connection status:', error);
        }
    }

    // Add activity to the list with better error handling
    function addActivity(text, timestamp = new Date().toISOString()) {
        if (!githubActivity) {
            console.warn('Activity list element not found');
            return;
        }

        try {

        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <span class="timestamp">${formatTimestamp(timestamp)}</span>
            <span class="activity-text">${text}</span>
        `;

        // Insert at the top
        if (githubActivity.firstChild) {
            githubActivity.insertBefore(activityItem, githubActivity.firstChild);
        } else {
            githubActivity.appendChild(activityItem);
        }
    } catch (error) {
        console.error('Error adding activity:', error);
    }
    }

    // Format timestamp for display
    function formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch (e) {
            return timestamp;
        }
    }
});