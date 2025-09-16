// Check out diffrent stuff regarding a hub page for our main.js files in frontend
// is it needed? who knows
//

const routes = {
  start: './start_main.js',
  music: './music_main.js',
  pdf: './pdf_main.js',
  powerpoint: './ppt_main.js',
  image: './image_main.js',
  about: './about_main.js',
};


let current = { cleanup: null };
// start med musik då det är min branch & jag inte har någon mockdata för de andra filtyperna
async function loadRoute() {
  const hash = (location.hash || '#start').slice(1).toLowerCase();
  const path = routes[hash] || routes.music;


  if (typeof current.cleanup === 'function') {
    try { current.cleanup(); } catch { }
  }

  const mod = await import(path);
  const appEl = document.getElementById('app');
  appEl.innerHTML = '';

  if (typeof mod.render === 'function') {
    await mod.render(appEl);
  }
  current.cleanup = typeof mod.cleanup === 'function' ? mod.cleanup : null;
}

window.addEventListener('hashchange', loadRoute);
window.addEventListener('DOMContentLoaded', loadRoute);