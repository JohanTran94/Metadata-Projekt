// frontend/about_main.js
export function render(appEl) {
  appEl.innerHTML = `
    <section class="about">
      <h2>About us</h2>

      <p>
        <strong>Sons Of Arholma Search Engine</strong> is a student project built as part of the
        <em>Metadata</em> course (2025-08-11 → 2025-09-19).
        The goal was to design a simple metadata search engine that works across
        different file types: Music (MP3), PDF, PowerPoint, and Image files.
      </p>

      <p>
        The application provides a clean web interface where users can search, filter,
        and preview metadata stored in a local database. Each media type has its own
        dedicated search engine, but everything is integrated into a Single-Page Application (SPA).
      </p>

      <h3>Tech stack</h3>
      <ul>
        <li><strong>Backend:</strong> Node.js + Express</li>
        <li><strong>Database:</strong> MySQL (worked with via DBeaver and Sequel Ace)</li>
        <li><strong>Frontend:</strong> Vanilla JavaScript modules (SPA), HTML, CSS</li>
        <li><strong>Libraries:</strong> exifr (images), pdf-parse-fork (PDFs),
            music-metadata (Music) and csv-parse (PowerPoint)</li>
      </ul>

      <h3>Team</h3>
      <ul class="team-list">
        <li>
          <strong>Thomas Rosén</strong>: PowerPoint module ·
          <a href="https://github.com/thomasavguld" target="_blank" rel="noopener">github.com/thomasavguld</a>
        </li>
        <li>
          <strong>Jonas Larsson</strong>: PDF module ·
          <a href="https://github.com/JonasLarsson-coder" target="_blank" rel="noopener">github.com/JonasLarsson-coder</a>
        </li>
        <li>
          <strong>Max Nilsson</strong>: Music module ·
          <a href="https://github.com/MaxNilssons" target="_blank" rel="noopener">github.com/MaxNilssons</a>
        </li>
        <li>
          <strong>Johan Tran</strong>: Image module ·
          <a href="https://github.com/JohanTran94" target="_blank" rel="noopener">github.com/JohanTran94</a>
        </li>
      </ul>

      <h3>Try it</h3>
      <p>
        Use the tabs above (Start, Music, PDF, PowerPoint, Image) to explore each search engine.
        Each engine has its own filters and presents results in a format suited for that file type.
      </p>
    </section>
  `;
}
export function cleanup() { }
