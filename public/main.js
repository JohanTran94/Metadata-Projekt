// Simple hash-based router for a vanilla JS Single-Page Application (SPA).
// Each route maps to a JS module that exports { render(appEl), cleanup?() }.

const routes = {
  start: '/start_main.js',
  music: '/music_main.js',
  pdf: '/pdf_main.js',
  powerpoint: '/ppt_main.js',
  image: '/image_main.js',
  about: '/about_main.js'
};

// Keep reference to an optional cleanup() from the currently mounted page
let current = { cleanup: null };

// Loads the component for the current hash and renders it into #app .content-bg
async function loadRoute() {
  // Normalize hash (e.g. "#Music" -> "music"); default to "start"
  const hash = (location.hash || '#start').slice(1).toLowerCase();
  const path = routes[hash] || routes.music;

  // Give the previous page a chance to detach listeners / timers
  if (typeof current.cleanup === 'function') {
    try { current.cleanup(); } catch { /* ignore cleanup errors */ }
  }

  // Dynamically import the page module (native ES module import)
  const mod = await import(path);

  // Find the application content area, clear it and render the new page
  const appEl = document.querySelector('#app .content-bg');
  appEl.innerHTML = '';

  if (typeof mod.render === 'function') {
    await mod.render(appEl);
  }

  // Store the new cleanup reference (if provided by the page)
  current.cleanup = typeof mod.cleanup === 'function' ? mod.cleanup : null;
}

// Route changes are driven by hash updates and on initial DOM load
window.addEventListener('hashchange', loadRoute);
window.addEventListener('DOMContentLoaded', loadRoute);
