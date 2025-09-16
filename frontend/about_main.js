// frontend/about_main.js
export async function render(appEl) {
  appEl.innerHTML = `
    <section>
      <h2>About Us</h2>
      <p class="muted" style="margin:4px 0 16px">
        This project is a student-built metadata search engine for multiple file types.
      </p>

      <div class="start-grid">
        <section class="start-card">
          <h3>What it does</h3>
          <p>Search and preview metadata for Music (MP3), PDF, PowerPoint and Image files.</p>
        </section>
        <section class="start-card">
          <h3>How it works</h3>
          <p>Node.js + Express backend, MySQL JSON storage, and a simple SPA frontend (vanilla JS modules).</p>
        </section>
        <section class="start-card">
          <h3>Team</h3>
          <p>Four teammates, each responsible for one media type. Integrated into a single SPA.</p>
        </section>
        <section class="start-card">
          <h3>Try it</h3>
          <p>Use the tabs above or the Start page cards to jump to each search engine.</p>
        </section>
      </div>
    </section>
  `;
}
export function cleanup() { }
