document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const taskModal = document.getElementById('taskModal');
  const taskDescription = document.getElementById('taskDescription');
  const taskSchedule = document.getElementById('taskSchedule');
  const taskPriority = document.getElementById('taskPriority');

  // Open task modal
  document.getElementById('createTaskBtn')?.addEventListener('click', () => {
    taskModal.style.display = 'block';
  });

  // Close task modal
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      taskModal.style.display = 'none';
    });
  });

  // Create task
  document.getElementById('submitTaskBtn')?.addEventListener('click', () => {
    const description = taskDescription.value.trim();
    if (!description) {
      alert('Please enter a task description');
      return;
    }

    socket.emit('self:create-task', {
      task: description,
      schedule: taskSchedule.value,
      priority: taskPriority.value
    }, (response) => {
      if (response.success) {
        alert('Task created successfully');
        taskModal.style.display = 'none';
        taskDescription.value = '';
        loadTasks(); // Refresh task list
      } else {
        alert(`Error creating task: ${response.error || 'Unknown error'}`);
      }
    });
  });

  // Load tasks on page load
  loadTasks();

  function loadTasks() {
    // Use fetchPrioritizedTasks to get sorted tasks
    socket.emit('self:get-tasks', (response) => {
      const taskList = document.getElementById('taskList');
      if (!taskList) return; // Not on admin page

      if (!response.success) {
        taskList.innerHTML = `<div class="alert alert-danger">Error loading tasks: ${response.error || 'Unknown error'}</div>`;
        return;
      }

      if (!response.tasks || response.tasks.length === 0) {
        taskList.innerHTML = '<div class="alert alert-info">No tasks found</div>';
        return;
      }

      let html = '';
      response.tasks.forEach(task => {
        const priorityClass = task.priority === 3 ? 'task-high-priority' : 
                            task.priority === 2 ? 'task-medium-priority' : 'task-low-priority';

        const statusClass = task.status === 'Completed' ? 'task-status-completed' :
                          task.status === 'Failed' ? 'task-status-failed' :
                          task.status === 'In Progress' ? 'task-status-progress' : 'task-status-pending';

        let priorityText = 'Medium';
        if (task.priority === 3) priorityText = 'High';
        if (task.priority === 1) priorityText = 'Low';

        html += `
          <div class="task-item ${priorityClass}">
            <div class="task-header">
              <div class="task-title">${task.name}</div>
              <div class="task-status ${statusClass}">${task.status}</div>
            </div>
            <div class="task-info">
              <div>Schedule: ${task.schedule}</div>
              <div>Priority: ${priorityText}</div>
            </div>
            <div class="task-actions">
              <button class="btn btn-sm" onclick="viewTask('${task.path}')">View</button>
              ${task.status === 'Pending' ? `<button class="btn btn-sm btn-primary" onclick="executeTask('${task.path}')">Execute</button>` : ''}
              ${task.status === 'Pending' || task.status === 'In Progress' ? 
                `<button class="btn btn-sm btn-danger" onclick="cancelTask('${task.path}')">Cancel</button>` : ''}
            </div>
          </div>
        `;
      });

      taskList.innerHTML = html;
    });
  }

  // Define global functions for task actions
  window.viewTask = function(path) {
    // Open task in self editor instead of admin page
    socket.emit('self:get-module', path, (response) => {
      if (response.success) {
        const content = response.content;
        // Display the content in a modal
        alert(`Task content: ${content.substring(0, 100)}...`);
      } else {
        alert(`Error loading task: ${response.error || 'Unknown error'}`);
      }
    });
  };

  window.executeTask = function(path) {
    socket.emit('self:execute-task', { taskPath: path }, (response) => {
      if (response.success) {
        alert('Task execution started');
        loadTasks(); // Refresh task list
      } else {
        alert(`Error executing task: ${response.error || 'Unknown error'}`);
      }
    });
  };

  window.cancelTask = function(path) {
    if (confirm('Are you sure you want to cancel this task?')) {
      socket.emit('self:cancel-task', { taskPath: path }, (response) => {
        if (response.success) {
          alert('Task cancelled');
          loadTasks(); // Refresh task list
        } else {
          alert(`Error cancelling task: ${response.error || 'Unknown error'}`);
        }
      });
    }
  };

  // Listen for task updates
  socket.on('task:completed', (data) => {
    console.log('Task update received:', data);
    loadTasks();
  });

  // Setup task refresh interval - refresh every 10 seconds
  setInterval(loadTasks, 10000);
});