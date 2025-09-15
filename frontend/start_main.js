
export async function render(appEl) {
  appEl.innerHTML = `
    <section>
      <h2>Welcome</h2>
      <p class="muted" style="margin:4px 0 16px">
        Pick a search engine below to get started.
      </p>

      <div class="start-grid">
        <a href="#music" class="start-card">
          <h3>Music</h3>
          <p>Search MP3 metadata (title, artist, album, year, genre)…</p>
        </a>

        <a href="#pdf" class="start-card">
          <h3>PDF</h3>
          <p>Search PDFs by title, author, keywords, and more.</p>
        </a>

        <a href="#powerpoint" class="start-card">
          <h3>PowerPoint</h3>
          <p>Search PPT/PPTX metadata (title, company, creation date)…</p>
        </a>

        <a href="#image" class="start-card">
          <h3>Image</h3>
          <p>Search photos by make, model, date, GPS, and dimensions.</p>
        </a>
      </div>
    </section>
  `;
}

export function cleanup() { }
