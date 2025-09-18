// frontend/about_main.js
export function render(appEl) {
  appEl.innerHTML = `
  <section>
  <h1>Sons of Arholma</h1>
  <h2>
  A student project on metadata. 
  </h2>

      <p>
        <strong>Sons Of Arholma Search Engine</strong> is a student project built as part of the
        <em>Metadata</em> course (2025-08-11 → 2025-09-19) at TUC Yrkeshögskola in Stockholm, Sweden.
      </p>
      
      <p>
        Our ambition was to build an application that provides a clean web interface where users can search, filter,
        and preview metadata from a variety of file types. Each media type has its own
        dedicated search engine, all integrated into a Single-Page Application (SPA).
      </p>

      <p>
        Feel free to explore the <b>Sons of Arholma Search Engine.</b>
      </p>

      <h3>Tech stack</h3>
      <ul>
        <li><strong>Backend:</strong> Node.js + Express</li>
        <li><strong>Database:</strong> MySQL (worked with via DBeaver and Sequel Ace)</li>
        <li><strong>Frontend:</strong> Vanilla JavaScript modules (SPA), HTML, CSS</li>
        <li><strong>Libraries:</strong> exifr (images), pdf-parse-fork (PDFs),
            music-metadata (Music) and custom extractors for (PowerPoint)</li>
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

      <h3>Advisor</h3>
      <ul class="advisor">
        <li>
          <strong>Thomas Frank</strong> · Nodehill · 
          <a href="https://nodehill.com" target="_blank" rel="noopener">https://nodehill.com</a>
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
