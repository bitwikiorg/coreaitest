document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  // DOM elements for task UI
  const schedulerStatus = document.getElementById('schedulerStatus');
  const schedulerLastRun = document.getElementById('schedulerLastRun');
  const scheduledTaskList = document.getElementById('scheduledTaskList');
  const taskFilterPriority = document.getElementById('taskFilterPriority');
  const taskFilterStatus = document.getElementById('taskFilterStatus');
  const createTaskBtn = document.getElementById('createTaskBtn');
  const taskModal = document.getElementById('taskModal');
  const taskDescription = document.getElementById('taskDescription');
  const taskSchedule = document.getElementById('taskSchedule');
  const taskPriority = document.getElementById('taskPriority');
  const cancelTaskBtn = document.getElementById('cancelTaskBtn');
  const executeNowBtn = document.getElementById('executeNowBtn');
  const startSchedulerBtn = document.getElementById('startSchedulerBtn');
  const refreshTasksBtn = document.getElementById('refreshTasksBtn');
  const githubStatus = document.getElementById('githubStatus'); // Added GitHub status element
  const syncGithubTasksBtn = document.getElementById('syncGithubTasksBtn'); // Added GitHub sync button
  const pushTasksBtn = document.getElementById('pushTasksBtn'); // Added GitHub push button
  const pullTasksBtn = document.getElementById('pullTasksBtn'); // Added GitHub pull button
  const welcomeView = document.getElementById('welcomeView');
  const selfEditor = document.getElementById('selfEditor');
  const currentModulePath = document.getElementById('currentModulePath');
  const moduleEditor = document.getElementById('moduleEditor');


  // Initialize UI elements
  initializeSelfUI();

  // Initialize task management
  loadTasks();

  function initializeSelfUI() {
    // Check if scheduler is running
    socket.emit('self:verify-connection', {}, (response) => {
      if (response.connected) {
        console.log("GitHub connection verified");
        startScheduler(); // Auto-start the scheduler
      }
    });

    // Event listeners for task UI
    if (createTaskBtn) {
      createTaskBtn.addEventListener('click', showTaskModal);
    }

    if (cancelTaskBtn) {
      cancelTaskBtn.addEventListener('click', hideTaskModal);
    }

    if (executeNowBtn) {
      executeNowBtn.addEventListener('click', () => createTask(true));
    }

    if (startSchedulerBtn) {
      startSchedulerBtn.addEventListener('click', toggleScheduler);

      // Set initial button text based on scheduler status
      socket.emit('self:check-scheduler-status', (response) => {
        if (response && response.success && response.active) {
          startSchedulerBtn.textContent = 'Stop Scheduler';
          if (schedulerStatus) {
            schedulerStatus.className = 'status-badge status-connected';
            schedulerStatus.textContent = 'Active';
          }
        } else {
          startSchedulerBtn.textContent = 'Start Scheduler';
          if (schedulerStatus) {
            schedulerStatus.className = 'status-badge status-inactive';
            schedulerStatus.textContent = 'Inactive';
          }
        }
      });
    }

    if (refreshTasksBtn) {
      refreshTasksBtn.addEventListener('click', loadTasks);
    }

    if (taskFilterPriority) {
      taskFilterPriority.addEventListener('change', filterTasks);
    }

    if (taskFilterStatus) {
      taskFilterStatus.addEventListener('change', filterTasks);
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === taskModal) {
        hideTaskModal();
      }
    });

    // Close modal button handlers
    document.querySelectorAll('.close-modal').forEach(elem => {
      elem.addEventListener('click', hideTaskModal);
    });

    // GitHub connection and sync buttons
    const checkGithubConnectionBtn = document.getElementById('checkGithubConnectionBtn');
    if (checkGithubConnectionBtn) checkGithubConnectionBtn.addEventListener('click', checkGitHubConnection);
    if (syncGithubTasksBtn) syncGithubTasksBtn.addEventListener('click', syncTasksWithGitHub);
    if (pushTasksBtn) pushTasksBtn.addEventListener('click', pushTasksToGitHub);
    if (pullTasksBtn) pullTasksBtn.addEventListener('click', pullTasksFromGitHub);


    // Verify GitHub connection
    function checkGitHubConnection() {
        githubStatus.innerHTML = `
            <span class="status-badge status-checking">Checking...</span>
        `;

        socket.emit('self:verify-connection', {}, (response) => {
            if (response.connected) {
                githubStatus.innerHTML = `
                    <span class="status-badge status-connected">Connected</span>
                    ${response.user}/${response.repo}
                `;
                loadModules();
                loadTasks();
                addActivity('GitHub connection verified');
            } else {
                githubStatus.innerHTML = `
                    <span class="status-badge status-disconnected">Disconnected</span>
                    ${response.error || 'GitHub configuration missing'}
                `;
                addActivity('GitHub connection failed: ' + (response.error || 'Configuration missing'));
            }
            updateGitHubButtons(response.connected);
        });
    }

    // Verify connection on page load
    checkGitHubConnection();

    // Disable buttons if GitHub is not connected
    function updateGitHubButtons(connected) {
      if (syncGithubTasksBtn) syncGithubTasksBtn.disabled = !connected;
      if (pushTasksBtn) pushTasksBtn.disabled = !connected;
      if (pullTasksBtn) pullTasksBtn.disabled = !connected;
    }
  }

  // Show task modal
  function showTaskModal() {
    if (taskModal) {
      taskModal.style.display = 'block';
      if (taskDescription) {
        taskDescription.focus();
      }
    }
  }

  // Hide task modal
  function hideTaskModal() {
    if (taskModal) {
      taskModal.style.display = 'none';
      if (taskDescription) {
        taskDescription.value = '';
      }
    }
  }

  // Toggle the scheduler (start/stop)
  function toggleScheduler() {
    // Get current status to determine what action to take
    if (schedulerStatus && schedulerStatus.textContent === 'Active') {
      // Currently active, so stop it
      socket.emit('self:stop-scheduler', (response) => {
        if (response && response.success) {
          console.log('Scheduler stopped successfully');
          if (schedulerStatus) {
            schedulerStatus.className = 'status-badge status-inactive';
            schedulerStatus.textContent = 'Inactive';
          }
          if (schedulerLastRun) {
            schedulerLastRun.textContent = `Stopped: ${new Date().toLocaleTimeString()}`;
          }
          if (startSchedulerBtn) {
            startSchedulerBtn.textContent = 'Start Scheduler';
          }
          // Update task list after stopping scheduler
          loadTasks();
        } else if (response) {
          console.error('Failed to stop scheduler:', response.error);
        }
      });
    } else {
      // Currently inactive, so start it
      socket.emit('self:start-scheduler', (response) => {
        if (response && response.success) {
          console.log('Scheduler started successfully');
          if (schedulerStatus) {
            schedulerStatus.className = 'status-badge status-connected';
            schedulerStatus.textContent = 'Active';
          }
          if (schedulerLastRun) {
            schedulerLastRun.textContent = `Started: ${new Date().toLocaleTimeString()}`;
          }
          if (startSchedulerBtn) {
            startSchedulerBtn.textContent = 'Stop Scheduler';
          }
          // Update task list after starting scheduler
          loadTasks();
        } else if (response) {
          console.error('Failed to start scheduler:', response.error);
        }
      });
    }
  }

  // Load tasks
  function loadTasks() {
    socket.emit('self:get-tasks', (response) => {
      if (response.success && scheduledTaskList) {
        renderTaskList(response.tasks);
      } else {
        console.error('Error loading tasks:', response.error);
        if (scheduledTaskList) {
          scheduledTaskList.innerHTML = '<div class="empty-state">Error loading tasks. Please try again.</div>';
        }
      }
    });
  }

  // Render task list
  function renderTaskList(tasks) {
    if (!scheduledTaskList) return;

    if (!tasks || tasks.length === 0) {
      scheduledTaskList.innerHTML = '<div class="empty-state">No tasks found. Create a new task using the "New Task" button.</div>';
      return;
    }

    let taskHtml = '';

    tasks.forEach(task => {
      const priorityClass = task.priority === 3 ? 'task-high-priority' : 
                         task.priority === 2 ? 'task-medium-priority' : 'task-low-priority';

      const statusClass = task.status.toLowerCase() === 'completed' ? 'task-completed' : 
                        task.status.toLowerCase() === 'in progress' ? 'task-in-progress' : 
                        task.status.toLowerCase() === 'failed' ? 'task-failed' : 
                        task.status.toLowerCase() === 'cancelled' ? 'task-cancelled' : 'task-pending';

      let priorityText = 'Low';
      if (task.priority === 2) priorityText = 'Medium';
      if (task.priority === 3) priorityText = 'High';

      taskHtml += `
        <div class="task-item ${statusClass}" data-path="${task.path}" data-priority="${priorityText}" data-status="${task.status}">
          <div class="task-header">
            <span class="task-name">${task.name}</span>
            <span class="task-status">${task.status}</span>
          </div>
          <div class="task-meta">
            <span class="task-priority ${priorityClass}">Priority: ${priorityText}</span>
            <span class="task-schedule">Schedule: ${task.schedule}</span>
          </div>
          <div class="task-actions">
            <button class="btn btn-sm task-view-btn" data-path="${task.path}">View</button>
            ${task.status === 'Pending' ? `<button class="btn btn-sm btn-accent task-execute-btn" data-path="${task.path}">Execute Now</button>` : ''}
            ${(task.status === 'Pending' || task.status === 'In Progress') ? 
              `<button class="btn btn-sm btn-danger task-cancel-btn" data-path="${task.path}">Cancel</button>` : ''}
          </div>
        </div>
      `;
    });

    scheduledTaskList.innerHTML = taskHtml;

    // Add click listeners for task buttons
    document.querySelectorAll('.task-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const path = e.currentTarget.dataset.path;
        viewTask(path); // Use viewTask function
      });
    });

    document.querySelectorAll('.task-execute-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const path = e.currentTarget.dataset.path;
        executeTask(path);
      });
    });

    document.querySelectorAll('.task-cancel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const path = e.currentTarget.dataset.path;
        cancelTask(path);
      });
    });

    // Apply filters
    filterTasks();
  }

  // Filter tasks
  function filterTasks() {
    if (!taskFilterPriority || !taskFilterStatus || !scheduledTaskList) return;

    const priorityFilter = taskFilterPriority.value;
    const statusFilter = taskFilterStatus.value;

    const taskItems = scheduledTaskList.querySelectorAll('.task-item');

    taskItems.forEach(item => {
      const priority = item.getAttribute('data-priority');
      const status = item.getAttribute('data-status');

      const priorityMatch = priorityFilter === 'all' || priority.toLowerCase() === priorityFilter.toLowerCase();
      const statusMatch = statusFilter === 'all' || status.toLowerCase() === statusFilter.toLowerCase();

      if (priorityMatch && statusMatch) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }

  // Open module in editor
  function viewTask(path) {
    socket.emit('self:view-task', { taskPath: path }, (response) => {
      if (response.success) {
        // Handle module opening here - show in editor
        console.log('Module opened:', path);

        currentModule = {
            path: path,
            content: response.content,
            sha: response.sha || '',
            isTask: true
        };

        currentModulePath.textContent = path;
        moduleEditor.value = response.content;

        welcomeView.style.display = 'none';
        selfEditor.style.display = 'flex';

        // Add task-specific editing instructions
        const taskInstructions = document.createElement('div');
        taskInstructions.className = 'task-edit-instructions';
        taskInstructions.innerHTML = `
            <div class="alert">
                <strong>Editing Task:</strong> Modify the YAML frontmatter to change task properties.
                Status options: 'Pending', 'In Progress', 'Completed', 'Failed', 'Cancelled'
            </div>
        `;

        // Insert instructions after editor header
        const editorHeader = document.querySelector('.self-editor-header');
        if (editorHeader && !document.querySelector('.task-edit-instructions')) {
            editorHeader.insertAdjacentElement('afterend', taskInstructions);
        }

        // Add to activity log
        addActivity(`Viewed task: ${path}`);
      } else {
        alert(`Error loading module: ${response.error || 'Unknown error'}`);
      }
    });
  }


  // Execute task
  function executeTask(taskPath) {
    socket.emit('self:execute-task', { taskPath }, (response) => {
      if (response.success) {
        console.log('Task execution started:', taskPath);
        loadTasks(); // Refresh task list
      } else {
        alert(`Error executing task: ${response.error || 'Unknown error'}`);
      }
    });
  }

  // Cancel task
  function cancelTask(taskPath) {
    if (confirm('Are you sure you want to cancel this task?')) {
      socket.emit('self:cancel-task', { taskPath }, (response) => {
        if (response.success) {
          console.log('Task cancelled:', taskPath);
          loadTasks(); // Refresh task list
        } else {
          alert(`Error cancelling task: ${response.error || 'Unknown error'}`);
        }
      });
    }
  }

  // Create task
  function createTask(executeImmediately = false) {
    if (!taskDescription) return;

    const description = taskDescription.value.trim();
    const schedule = taskSchedule ? taskSchedule.value : 'As needed';
    const priority = taskPriority ? taskPriority.value : 'Medium';

    if (!description) {
      alert('Please enter a task description');
      return;
    }

    socket.emit('self:create-task', {
      task: description,
      schedule,
      priority
    }, (response) => {
      if (response.success) {
        console.log('Task created');

        // Execute immediately if requested
        if (executeImmediately && response.path) {
          executeTask(response.path);
        }

        hideTaskModal();
        loadTasks(); // Refresh task list
      } else {
        alert(`Error creating task: ${response.error || 'Unknown error'}`);
      }
    });
  }

  // Listen for activity events
  socket.on('self:activity', (data) => {
    console.log('Activity:', data);

    // Log activity
    const selfActivities = document.getElementById('selfActivities');
    if (selfActivities) {
      const activityHtml = `
        <div class="self-activity-item">
          <div class="self-activity-text">${data.text}</div>
          <div class="self-activity-time">${new Date().toLocaleTimeString()}</div>
        </div>
      `;
      selfActivities.innerHTML = activityHtml + selfActivities.innerHTML;
    }

    // Refresh tasks if it's a task-related activity
    if (data.text.includes('Task')) {
      loadTasks();
    }
  });

  // Set up refresh interval
  setInterval(loadTasks, 30000); // Refresh every 30 seconds

  // Add activity log entry
  function addActivity(text) {
    socket.emit('self:add-activity', { text });
  }

  // Save module
  function saveModule() {
      if (!currentModule) return;

      const content = moduleEditor.value;
      const isNew = currentModule.isNew;
      const isTask = currentModule.isTask || currentModule.path.includes('tasks/');

      socket.emit('self:save-module', {
          path: currentModule.path,
          content: content,
          message: isNew ? `Create module: ${currentModule.path}` : `Update module: ${currentModule.path}`,
          isTask: isTask
      }, (response) => {
          if (response.success) {
              currentModule.content = content;
              currentModule.isNew = false;
              addActivity(`${isNew ? 'Created' : 'Saved'} ${isTask ? 'task' : 'module'}: ${currentModule.path}`);

              // Refresh task list if this was a task update
              if (isTask) {
                  loadTasks();
              }

              // Clear any task edit instructions when done
              const taskInstructions = document.querySelector('.task-edit-instructions');
              if (taskInstructions && !isTask) {
                  taskInstructions.remove();
              }

              // If GitHub integration is enabled, offer to push changes
              if (document.querySelector('.status-badge.status-connected') && 
                  isTask && 
                  !response.pushedToGitHub) {
                  if (confirm('Task saved locally. Would you like to push this task to GitHub now?')) {
                      pushTasksToGitHub();
                  }
              }
          } else {
              alert(`Error saving module: ${response.error || 'Unknown error'}`);
          }
      });
  }


  // Delete task
  function deleteTask(path) {
      if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
          socket.emit('self:delete-task', { taskPath: path }, (response) => {
              if (response.success) {
                  addActivity(`Task deleted: ${path}`);
                  loadTasks();

                  // If we're currently viewing this task, return to welcome view
                  if (currentModule && currentModule.path === path) {
                      welcomeView.style.display = 'block';
                      selfEditor.style.display = 'none';
                      currentModule = null;
                  }
              } else {
                  alert(`Error deleting task: ${response.error || 'Unknown error'}`);
              }
          });
      }
  }

  // Update task status - allows changing just the status without editing the whole file
  function updateTaskStatus(path, newStatus) {
      socket.emit('self:update-task-status', { 
          taskPath: path, 
          status: newStatus 
      }, (response) => {
          if (response.success) {
              addActivity(`Updated task status to ${newStatus}: ${path}`);
              loadTasks();

              // If we're currently viewing this task, refresh the content
              if (currentModule && currentModule.path === path) {
                  viewTask(path);
              }
          } else {
              alert(`Error updating task status: ${response.error || 'Unknown error'}`);
          }
      });
  }

  // Placeholder functions for GitHub interaction (replace with actual implementation)
  function syncTasksWithGitHub() {
      alert('GitHub synchronization not yet implemented.');
  }

  function pushTasksToGitHub() {
      alert('Pushing tasks to GitHub not yet implemented.');
  }

  function pullTasksFromGitHub() {
      alert('Pulling tasks from GitHub not yet implemented.');
  }

  function loadModules() {
    // Placeholder for loading modules
    console.log("Modules loaded (placeholder)");
  }

  function startScheduler() {
    // Placeholder for starting scheduler
    console.log("Scheduler started (placeholder)");
  }


  // Function to check GitHub connection
  async function checkGitHubConnection() {
    try {
      const response = await fetch('/api/github/verify');
      const data = await response.json();

      // Update UI based on connection status
      const statusElement = document.getElementById('github-status');
      if (statusElement) {
        const statusIndicator = document.createElement('span');
        statusIndicator.className = data.connected ? 'status-connected' : 'status-disconnected';
        statusIndicator.textContent = data.connected ? 'Connected' : 'Disconnected';

        // Clear previous status
        statusElement.innerHTML = 'GitHub: ';
        statusElement.appendChild(statusIndicator);

        // Add error message if there's an error
        if (data.error) {
          const errorElement = document.createElement('span');
          errorElement.className = 'github-error';
          errorElement.textContent = ` ${data.error}`;
          statusElement.appendChild(errorElement);

          // Add refresh button
          const refreshButton = document.createElement('button');
          refreshButton.className = 'refresh-button';
          refreshButton.innerHTML = '&#8635;'; // Refresh icon
          refreshButton.title = 'Refresh connection';
          refreshButton.addEventListener('click', checkGitHubConnection);
          statusElement.appendChild(refreshButton);
        }
      }

      // Update button states
      updateGitHubButtons(data.connected);

      return data.connected;
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
      if (statusElement) {
        statusElement.innerHTML = 'GitHub: <span class="status-disconnected">Error</span>';
      }
      updateGitHubButtons(false);
      return false;
    }
  }

});