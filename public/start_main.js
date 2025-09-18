export function render(appEl) {
  appEl.innerHTML = `
      <section class="start">
    <h2>
    Explore metadata across four sources 
    </h2>
    <h3>  
    Search a plethora of variables and parameters depending on filetype.
    </h3>  
      To view more detailed information about a specific document, you can see the raw metadata.
      <br>
      <br>

      <div class="start-grid">
        <a href="#music" class="start-card">
          <h3 class="card-title">Music</h3>
          <p>Search MP3 metadata (title, artist, album, year, genre)…</p>
        </a>

        <a href="#pdf" class="start-card">
          <h3 class="card-title">PDF</h3>
          <p>Search PDFs by title, author, keywords, and more.</p>
        </a>

        <a href="#powerpoint" class="start-card">
        <h3 class="card-title">PowerPoint</h3>
          <p>Search PPT/PPTX metadata (title, organisation, creation date)…</p>
        </a>

        <a href="#image" class="start-card">
        <h3 class="card-title">Image</h3>
          <p>Search photos by file name, make, model, creation date, GPS.</p>
        </a>
      </div>

      <div class="tips">
      <br>
        <strong>Tips:</strong>
        <ul>
          <li>Use the <em>Search by</em> dropdown to switch fields.</li>
          <li>Click <em>Download or URL</em> to download songs, pdfs or ppts.</li>
          <li>Click <em>Metadata</em> to view the full raw JSON for any item.</li>
          <li>Click <em>Play button</em> to play a song.</li>
          <li>Click <em>Map</em> to open the photo location in Google Maps.</li>
        </ul>
      </div>
    </section>
  `;
}

export function cleanup() { }
