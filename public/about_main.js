// Static "About" page: project description, tech stack, team and advisor
export function render(appEl) {
  appEl.innerHTML = `
    <section class="about-header">
      <h2>Sons of Arholma Search Engine</h2>
      <h3>A student project on metadata.</h3>

      <!-- Brief context and course attribution -->
      The <strong>Sons Of Arholma Search Engine</strong> is a student project built for the
      <em>Metadata</em> course (2025-08-11 → 2025-09-19) at
      <a href="https://www.tucsweden.se/" target="_blank" rel="noopener">TUC Yrkeshögskola</a> in Stockholm, Sweden.
    </section>

    <section class="content-bg about-page">
      <h3>The Sons Of Arholma Search Engine</h3>
      <!-- General app description -->
      This application provides a clean web interface where users can search, filter,
      and preview metadata from a variety of file types. Each media type has its own
      dedicated search engine, all integrated into a Single-Page Application (SPA).
      <p>
      Collaborating on this project gave the team opportunity to explore a variety of technologies,
      architectural ideas and ways of working together. Integrating a cloud based mySQL-database,
      with a (for us) extensive backend, as well as building a web interface that makes sense for the user.

      <!-- Tech stack bullet list -->
      <h3>Tech stack</h3>
      <ul>
        <li><strong>Backend:</strong> Node.js + Express</li>
        <li><strong>Database:</strong> MySQL (worked with via DBeaver and Sequel Ace)</li>
        <li><strong>Frontend:</strong> Vanilla JavaScript modules (SPA), HTML, CSS</li>
        <li><strong>Libraries:</strong> exifr (images), pdf-parse-fork (PDFs),
            music-metadata (Music) and custom extractors for PowerPoint</li>
      </ul>

      <!-- Team credits with links -->
      <h3>Team</h3>
      <ul class="team-list">
        <li><strong>Thomas Rosén</strong>: PowerPoint module ·
          <a href="https://github.com/thomasavguld" target="_blank" rel="noopener">github.com/thomasavguld</a>
        </li>
        <li><strong>Jonas Larsson</strong>: PDF module ·
          <a href="https://github.com/JonasLarsson-coder" target="_blank" rel="noopener">github.com/JonasLarsson-coder</a>
        </li>
        <li><strong>Max Nilsson</strong>: Music module ·
          <a href="https://github.com/MaxNilssons" target="_blank" rel="noopener">github.com/MaxNilssons</a>
        </li>
        <li><strong>Johan Tran</strong>: Image module ·
          <a href="https://github.com/JohanTran94" target="_blank" rel="noopener">github.com/JohanTran94</a>
        </li>
      </ul>

      <!-- Advisor credit -->
      <h3>Advisor</h3>
      <ul class="advisor">
        <li><strong>Thomas Frank</strong> · Nodehill ·
          <a href="https://nodehill.com" target="_blank" rel="noopener">https://nodehill.com</a>
        </li>
      </ul>

      <!-- Guidance to explore the tabs -->
      <h3>Explore!</h3>
      <p>
        Use the tabs above (Start, Music, PDF, PowerPoint, Image) to explore each search engine.
        Each engine has its own filters and presents results in a format suited for that file type.
      </p>
    </section>
  `;
}
export function cleanup() { /* No-op */ }
