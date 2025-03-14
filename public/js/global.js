
/**
 * Global JavaScript for COREAI Research System
 * Provides consistent UI behavior across all pages
 */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure consistent navigation highlighting
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav a');

  navLinks.forEach(link => {
    link.classList.remove('active');
    // Remove 'tab' class if it exists (for consistency)
    link.classList.remove('tab');
    
    const linkPath = link.getAttribute('href');
    if (currentPath === linkPath || 
        (currentPath.startsWith(linkPath) && linkPath !== '/')) {
      link.classList.add('active');
    }
  });

  // Special case for root path
  if (currentPath === '/' && navLinks.length > 0) {
    const homeLink = document.querySelector('.nav a[href="/"]');
    if (homeLink) homeLink.classList.add('active');
  }

  // Handle responsive behavior
  const handleResize = () => {
    const windowWidth = window.innerWidth;
    const container = document.querySelector('.container');
    const header = document.querySelector('.header');
    
    if (container) {
      container.style.width = '100%';
      container.style.maxWidth = '100%';
    }
    
    if (header) {
      header.style.width = '100%';
      header.style.boxSizing = 'border-box';
    }
  };

  // Call on page load and window resize
  handleResize();
  window.addEventListener('resize', handleResize);
});


/**
 * Global JavaScript for COREAI Research System
 * Provides consistent UI behavior across all pages
 */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure consistent navigation highlighting
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav a');

  navLinks.forEach(link => {
    // Remove all possible class variations for consistency
    link.classList.remove('active');
    link.classList.remove('tab');
    link.classList.add('nav-link');
    
    const linkPath = link.getAttribute('href');
    if (currentPath === linkPath || 
        (currentPath.startsWith(linkPath) && linkPath !== '/')) {
      link.classList.add('active');
    }
  });

  // Special case for root path
  if (currentPath === '/' && navLinks.length > 0) {
    const homeLink = document.querySelector('.nav a[href="/"]');
    if (homeLink) homeLink.classList.add('active');
  }

  // Handle responsive behavior
  const handleResize = () => {
    const windowWidth = window.innerWidth;
    const container = document.querySelector('.container');
    const header = document.querySelector('.header');
    
    if (container) {
      container.style.width = '100%';
      container.style.maxWidth = '100%';
    }
    
    if (header) {
      header.style.width = '100%';
      header.style.boxSizing = 'border-box';
    }
  };

  // Initial call and event listener
  handleResize();
  window.addEventListener('resize', handleResize);
  
  // Fix progress bars if they exist
  const progressBars = document.querySelectorAll('.progress-bar-inner');
  progressBars.forEach(bar => {
    if (bar.dataset.progress) {
      const progressValue = parseInt(bar.dataset.progress);
      bar.style.width = `${progressValue}%`;
    }
  });
});
