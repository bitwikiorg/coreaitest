/**
 * Research Management Interface
 * Manages research history, viewing, and executing new research
 */
document.addEventListener('DOMContentLoaded', function() {
  const socket = io();

  // DOM Elements - with fallbacks and logging to debug missing elements
  const researchList = document.getElementById('research-list');
  const researchDetails = document.getElementById('research-details');
  const backToListBtn = document.getElementById('back-to-list');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressTitle = document.getElementById('progress-title');
  const progressStats = document.getElementById('progress-stats');
  const progressDetails = document.getElementById('progress-details');
  const rerunResearchBtn = document.getElementById('rerun-research');
  const researchSummary = document.getElementById('research-summary');
  const researchLearnings = document.getElementById('research-learnings');
  const researchSources = document.getElementById('research-sources');
  const researchDetailTitle = document.getElementById('research-detail-title');

  // Debug output to help diagnose UI issues
  console.log('Research.js loaded, DOM elements:', {
    researchList: !!researchList,
    researchDetails: !!researchDetails,
    backToListBtn: !!backToListBtn,
    progressContainer: !!progressContainer,
    progressBar: !!progressBar,
    progressTitle: !!progressTitle
  });

  // Initialization code
  socket.emit('get-research-list');
  researchList.innerHTML = '<div class="no-research-message">[ LOADING RESULTS DATABASE... ]</div>';

  // Event listeners - with null checks to prevent errors
  if (backToListBtn) {
    backToListBtn.addEventListener('click', function() {
      researchDetails.style.display = 'none';
      if (progressContainer) progressContainer.style.display = 'none';
      researchList.style.display = 'block';
      socket.emit('get-research-list'); // Refresh list when returning
    });
  } else {
    console.error('Back button not found in the DOM');
  }

  if (rerunResearchBtn) {
    rerunResearchBtn.addEventListener('click', function() {
      const researchId = rerunResearchBtn.getAttribute('data-id');
      const query = rerunResearchBtn.getAttribute('data-query');
      const depth = parseInt(rerunResearchBtn.getAttribute('data-depth') || '3', 10);
      const breadth = parseInt(rerunResearchBtn.getAttribute('data-breadth') || '5', 10);

      if (query) {
        startResearch(query, depth, breadth);
      } else {
        alert('Missing research parameters');
      }
    });
  }

  // Function to display research list
  function displayResearchList(researchItems) {
    if (!researchList) return;

    if (!researchItems || researchItems.length === 0) {
      researchList.innerHTML = `
        <div class="no-research-message">
          [ NO RESULT ENTRIES FOUND - USE TERMINAL TO CREATE NEW RESEARCH ]
        </div>
      `;
      return;
    }

    researchList.innerHTML = '';

    researchItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card research-item';

      // Format date
      let dateDisplay = 'Unknown date';
      try {
        const date = new Date(item.date);
        dateDisplay = date.toLocaleString();
      } catch (e) {
        console.error('Error formatting date:', e);
      }

      // Truncate summary if too long
      const summary = item.summary && item.summary.length > 200 
        ? item.summary.substring(0, 200) + '...' 
        : (item.summary || 'No summary available');

      // Create tags display
      const tagsHtml = item.tags && item.tags.length 
        ? `<div class="tags-section">${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` 
        : '';

      card.innerHTML = `
        <div class="card-header">
          <div class="card-title">${item.query || 'Unnamed Research'}</div>
          <div class="card-metadata">${dateDisplay}</div>
        </div>
        <div class="card-content">${summary}</div>
        <div class="research-meta">
          <span class="meta-item">Depth: ${item.depth || 3}</span>
          <span class="meta-item">Breadth: ${item.breadth || 5}</span>
        </div>
        ${tagsHtml}
        <div class="research-actions">
          <button class="btn btn-sm view-research" data-id="${item.id}">View Details</button>
        </div>
      `;

      researchList.appendChild(card);

      // Add click handler for view button
      const viewBtn = card.querySelector('.view-research');
      if (viewBtn) {
        viewBtn.addEventListener('click', function() {
          const id = this.getAttribute('data-id');
          if (id) viewResearch(id);
        });
      }
    });
  }

  // Function to view research details
  function viewResearch(id) {
    if (!researchDetails || !researchList) return;

    socket.emit('view-research', { id });

    // Show loading state
    researchList.style.display = 'none';
    researchDetails.style.display = 'block';

    if (researchSummary) {
      researchSummary.innerHTML = 'Loading...';
    }
    if (researchLearnings) {
      researchLearnings.innerHTML = '<li>Loading...</li>';
    }
    if (researchSources) {
      researchSources.innerHTML = '<li>Loading...</li>';
    }
  }

  // Function to start a new research
  function startResearch(query, depth, breadth) {
    if (!progressContainer || !researchList || !researchDetails) return;

    // Hide other views and show progress
    researchList.style.display = 'none';
    researchDetails.style.display = 'none';
    progressContainer.style.display = 'block';

    // Reset progress display
    if (progressBar) progressBar.style.width = '0%';
    if (progressTitle) progressTitle.textContent = `Researching: ${query}`;
    if (progressStats) progressStats.textContent = '0%';
    if (progressDetails) progressDetails.textContent = 'Initializing research...';

    // Send research request to server
    socket.emit('research-query', {
      query: query,
      depth: depth || 3,
      breadth: breadth || 5
    });
  }

  // Socket event handlers

  // Research list received
  socket.on('research-list', function(data) {
    console.log('Received research list:', data);
    displayResearchList(data);
  });

  // Research details received
  socket.on('research-view', function(data) {
    if (!researchDetails || !researchDetailTitle || !researchSummary || 
        !researchLearnings || !researchSources || !rerunResearchBtn) {
      console.error('Missing DOM elements for research view');
      return;
    }

    // Update the details view
    researchDetailTitle.textContent = data.query || 'Research Results';
    researchSummary.innerHTML = data.summary || 'No summary available';

    // Update learnings
    researchLearnings.innerHTML = '';
    if (data.learnings && data.learnings.length) {
      data.learnings.forEach(learning => {
        const li = document.createElement('li');
        li.textContent = learning;
        researchLearnings.appendChild(li);
      });
    } else {
      researchLearnings.innerHTML = '<li>No key learnings found</li>';
    }

    // Update sources
    researchSources.innerHTML = '';
    if (data.sources && data.sources.length) {
      data.sources.forEach(source => {
        const li = document.createElement('li');
        li.textContent = source;
        researchSources.appendChild(li);
      });
    } else {
      researchSources.innerHTML = '<li>No sources found</li>';
    }

    // Set up rerun button
    rerunResearchBtn.setAttribute('data-id', data.id);
    rerunResearchBtn.setAttribute('data-query', data.query);
    rerunResearchBtn.setAttribute('data-depth', data.depth || 3);
    rerunResearchBtn.setAttribute('data-breadth', data.breadth || 5);
  });

  // Research status updates
  socket.on('research-status', function(data) {
    if (!progressContainer || !progressBar || !progressTitle || !progressStats || !progressDetails) {
      console.error('Missing progress elements');
      return;
    }

    // Always show progress container when we get status updates
    progressContainer.style.display = 'block';

    // Update progress
    const progress = data.progress || 0;
    progressBar.style.width = `${progress}%`;
    progressStats.textContent = `${progress}%`;

    // Update message
    if (data.message) {
      progressTitle.textContent = data.message;
    }

    // Update thought process if available
    if (data.thoughtProcess) {
      progressDetails.innerHTML = data.thoughtProcess;
      // Auto-scroll to bottom of thought process
      progressDetails.scrollTop = progressDetails.scrollHeight;
    }
  });

  // Individual research thought
  socket.on('research-thought', function(data) {
    if (!progressDetails) return;

    // Append the new thought to existing ones
    const thoughtElement = document.createElement('div');
    thoughtElement.innerHTML = data.thought;
    progressDetails.appendChild(thoughtElement);

    // Auto-scroll to bottom of thought process
    progressDetails.scrollTop = progressDetails.scrollHeight;
  });

  // Research complete
  socket.on('research-complete', function(data) {
    if (!progressContainer) return;

    // Hide progress and go back to list or details
    progressContainer.style.display = 'none';

    // If we have research results, show them
    if (data.research) {
      socket.emit('view-research', { id: data.id });
    } else {
      // Otherwise, go back to list
      researchList.style.display = 'block';
      socket.emit('get-research-list');
    }

    // Notify user
    alert('Research complete!');
  });

  // Handle research errors
  socket.on('research-error', function(data) {
    console.error('Research error:', data.message);
    alert('Error: ' + data.message);

    if (progressContainer) {
      progressContainer.style.display = 'none';
    }

    // Go back to list view
    if (researchList) {
      researchList.style.display = 'block';
      socket.emit('get-research-list');
    }
  });
});