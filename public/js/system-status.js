
/**
 * System status indicator manager
 * Updates UI indicators for various system integrations
 */
(function() {
  // DOM elements
  const openaiStatus = document.getElementById('openai-status');
  const githubStatus = document.getElementById('github-status');
  const memoryStatus = document.getElementById('memory-status');
  
  // Socket.io client
  const socket = io();
  
  // Initialize statuses to unknown
  if (openaiStatus) openaiStatus.classList.add('unknown');
  if (githubStatus) githubStatus.classList.add('unknown');
  if (memoryStatus) memoryStatus.classList.add('unknown');
  
  // Check API status on page load
  socket.emit('check-api-status', {}, (response) => {
    console.log('API Status:', response);
    
    // Update OpenAI status
    if (openaiStatus) {
      if (response.venice) {
        openaiStatus.classList.remove('unknown');
        openaiStatus.classList.add('active');
        openaiStatus.title = 'OpenAI API: Connected';
      } else {
        openaiStatus.classList.remove('unknown');
        openaiStatus.classList.add('error');
        openaiStatus.title = 'OpenAI API: Not configured';
      }
    }
    
    // Update GitHub status
    if (githubStatus) {
      if (response.github) {
        githubStatus.classList.remove('unknown');
        githubStatus.classList.add('active');
        githubStatus.title = 'GitHub: Connected';
      } else {
        githubStatus.classList.remove('unknown');
        githubStatus.classList.add('error');
        githubStatus.title = 'GitHub: Not configured';
      }
    }
    
    // Update Memory status based on GitHub status (as memory uses GitHub)
    if (memoryStatus) {
      if (response.github) {
        memoryStatus.classList.remove('unknown');
        memoryStatus.classList.add('active');
        memoryStatus.title = 'Memory System: Connected';
      } else {
        memoryStatus.classList.remove('unknown');
        memoryStatus.classList.add('error');
        memoryStatus.title = 'Memory System: Not connected';
      }
    }
  });
  
  // Listen for plugin status updates
  socket.on('plugin-status', (data) => {
    console.log('Plugin Status Update:', data);
    
    if (data.plugin === 'openai' || data.plugin === 'venice') {
      if (openaiStatus) {
        openaiStatus.className = 'status-dot';
        if (data.status === 'ACTIVE') {
          openaiStatus.classList.add('active');
          openaiStatus.title = 'OpenAI API: Connected';
        } else if (data.status === 'ERROR') {
          openaiStatus.classList.add('error');
          openaiStatus.title = `OpenAI API: Error - ${data.message || 'Unknown error'}`;
        } else if (data.status === 'WARNING') {
          openaiStatus.classList.add('warning');
          openaiStatus.title = `OpenAI API: Warning - ${data.message || 'Check configuration'}`;
        }
      }
    }
    
    if (data.plugin === 'github') {
      if (githubStatus) {
        githubStatus.className = 'status-dot';
        if (data.status === 'ACTIVE') {
          githubStatus.classList.add('active');
          githubStatus.title = 'GitHub: Connected';
        } else if (data.status === 'ERROR') {
          githubStatus.classList.add('error');
          githubStatus.title = `GitHub: Error - ${data.message || 'Unknown error'}`;
        } else if (data.status === 'WARNING') {
          githubStatus.classList.add('warning');
          githubStatus.title = `GitHub: Warning - ${data.message || 'Check configuration'}`;
        }
      }
    }
    
    if (data.plugin === 'memory') {
      if (memoryStatus) {
        memoryStatus.className = 'status-dot';
        if (data.status === 'ACTIVE') {
          memoryStatus.classList.add('active');
          memoryStatus.title = 'Memory System: Connected';
        } else if (data.status === 'ERROR') {
          memoryStatus.classList.add('error');
          memoryStatus.title = `Memory System: Error - ${data.message || 'Unknown error'}`;
        } else if (data.status === 'WARNING') {
          memoryStatus.classList.add('warning');
          memoryStatus.title = `Memory System: Warning - ${data.message || 'Check configuration'}`;
        }
      }
    }
  });
})();
