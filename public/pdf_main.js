// PDF search UI: supports fielded searches (Title/Author/Subject/Keywords/Text/Pages/Filename)
// Calls backend /api/pdf-* endpoints and renders rich cards with highlight + "Show metadata"
export function render(appEl) {
  appEl.innerHTML = `
    <section>
      <h2>PDF search</h2>
      <h3>Find PDF documents by metadata.</h3>
      Search by title, author, subject, keywords, text content or other parameters. Read intriguing documents from all over the globe.
      <p>To view more detailed information about a specific document, press <b>show all metadata.</b></p>
      <br>

      <!-- Controls -->
      <div class="controls" style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
        <label>
          Search by:
          <select id="pdf-field">
            <option value="Everything">Everything</option>
            <option value="Title">Titel</option>
            <option value="Author">Author</option>
            <option value="Subject">Subject</option>
            <option value="Text">Text</option>
            <option value="Keywords">Keywords</option>
            <option value="Pages">Pages</option>
            <option value="File name">File Name</option>
          </select>
        </label>
        <input id="pdf-q" type="text" placeholder="(ex: 'AI', '>10', '5-15')" />
      </div>

      <!-- Results counter + container -->
      <p id="pdf-count" class="muted" style="margin-top:8px;"></p>
      <section id="pdf-results" style="display:none;"></section>
    </section>
  `;

  // ===== DOM refs =====
  const fieldEl = appEl.querySelector('#pdf-field');
  const qEl = appEl.querySelector('#pdf-q');
  const countEl = appEl.querySelector('#pdf-count');
  const resultsEl = appEl.querySelector('#pdf-results');

  // Escape user input for building a highlight regex
  const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Simple text highlighter for matched terms
  const highlight = (text, term) => {
    if (!text || !term) return text || '';
    return String(text).replace(new RegExp(`(${escapeReg(term)})`, 'gi'), '<mark>$1</mark>');
  };

  // Show a shorter preview of long text fields
  const truncate = (text, maxLength = 500) => {
    if (!text) return '';
    return String(text).length > maxLength ? String(text).slice(0, maxLength) + '…' : String(text);
  };

  // Render array of rows into result cards
  async function renderResults(rows, term = '') {
    countEl.textContent = `${rows.length} results`;
    resultsEl.style.display = 'block';

    if (!rows.length) {
      resultsEl.innerHTML = '<div class="muted">No hits</div>';
      return;
    }

    // "Unknown" fallbacks to make the UI consistent
    resultsEl.innerHTML = rows.map(r => {
      const filename = r.filename || '';
      const title = r.title || r.xmp_title || 'No title';
      const author = r.author || 'Unknown';
      const subject = r.subject || 'Not specified';
      const keywords = r.keywords || 'None';
      const pages = r.numpages ?? 'Unknown';
      const text = r.text || '';

      // Highlighted values + inline download/open links
      return `
        <article class="pdf-result">
          <h3>${term ? highlight(title, term) : title}</h3>
          <p><b>Author:</b> ${term ? highlight(author, term) : author}</p>
          <p><b>Subject:</b> ${term ? highlight(subject, term) : subject}</p>
          <p><b>Keywords:</b> ${term ? highlight(keywords, term) : keywords}</p>
          <p><b>Pages:</b> ${pages}</p>
          <p><b>Text:</b> ${term ? highlight(truncate(text), term) : truncate(text)}</p>
          <p><b>File name:</b> ${term ? highlight(filename, term) : filename}</p>
          <p>
            ${filename ? `<a href="/pdf/${encodeURIComponent(filename)}" download>Download PDF</a>` : ''}
            ${filename ? `&nbsp;|&nbsp;<a href="/pdf/${encodeURIComponent(filename)}" target="_blank" rel="noopener">Open</a>` : ''}
          </p>          
          <p><button class="btn-show-all-pdf-metadata" data-id="${r.id}">Show all metadata</button></p>
          <pre class="pdf-meta-block hidden"></pre>
        </article>
      `;
    }).join('');
  }

  // Build the URL and perform the search; falls back to default list when empty
  async function search() {
    const field = fieldEl.value;
    const term = qEl.value.trim();
    if (!term) {
      loadDefault();
      return;
    }

    const res = await fetch(`/api/pdf-search/${encodeURIComponent(field)}/${encodeURIComponent(term.toLowerCase())}`);
    if (!res.ok) {
      const t = await res.text();
      resultsEl.innerHTML = `<div class="muted">Error: ${res.status} ${t.slice(0, 200)}</div>`;
      resultsEl.style.display = 'block';
      countEl.textContent = '0 result';
      return;
    }

    const rows = await res.json();
    renderResults(rows, term);
  }

  // Fetch an initial set of documents on page load
  async function loadDefault() {
    const res = await fetch(`/api/pdf-default`);
    if (!res.ok) {
      resultsEl.innerHTML = `<div class="muted">Cannot get PDF list</div>`;
      resultsEl.style.display = 'block';
      countEl.textContent = '0 result';
      return;
    }
    const rows = await res.json();
    renderResults(rows);
  }

  // Debounced live-search on keystrokes
  let debounceTimer;
  qEl.addEventListener('keyup', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(search, 100);
  });
  fieldEl.addEventListener('change', search);

  // Toggle/show full JSON metadata inline
  resultsEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-show-all-pdf-metadata');
    if (!btn) return;
    const pre = btn.parentElement.nextElementSibling;
    if (!pre) return;

    if (!pre.classList.contains('hidden')) {
      pre.classList.add('hidden');
      pre.textContent = '';
      btn.textContent = 'Show all metadata';
      return;
    }

    const id = btn.getAttribute('data-id');
    try {
      const res = await fetch(`/api/pdf-all-meta/${encodeURIComponent(id)}`);
      const data = await res.json();
      pre.textContent = JSON.stringify(data, null, 2);
      pre.classList.remove('hidden');
      btn.textContent = 'Hide metadata';
    } catch {
      pre.textContent = 'Cannot get metadata.';
      pre.classList.remove('hidden');
    }
  });

  // Default render on mount
  loadDefault();
}
export function cleanup() { /* optional */ }
