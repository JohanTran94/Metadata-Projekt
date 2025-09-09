// frontend/pdfFrontend/pdf_main.js
export function render(appEl) {
  appEl.innerHTML = `
    <section>
      <h2>PDF Sök</h2>

      <div class="controls" style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
        <label>
          Sök på:
          <select id="pdf-field">
            <option value="Title">Titel</option>
            <option value="Author">Author</option>
            <option value="Subject">Subject</option>
            <option value="Text">Text</option>
            <option value="Keywords">Keywords</option>
            <option value="Pages">Pages</option>
          </select>
        </label>
        <input id="pdf-q" type="text" placeholder="Sök bland PDF-filer (ex: 'AI', '>10', '5-15')" />
        <button id="pdf-do">Sök</button>
      </div>

      <p id="pdf-count" class="muted" style="margin-top:8px;"></p>
      <section id="pdf-results" style="display:none;"></section>
    </section>
  `;

  const fieldEl = appEl.querySelector('#pdf-field');
  const qEl = appEl.querySelector('#pdf-q');
  const doBtn = appEl.querySelector('#pdf-do');
  const countEl = appEl.querySelector('#pdf-count');
  const resultsEl = appEl.querySelector('#pdf-results');

  const highlight = (text, term) => {
    if (!text || !term) return text || '';
    return String(text).replace(new RegExp(`(${escapeReg(term)})`, 'gi'), '<mark>$1</mark>');
  };
  const truncate = (text, maxLength = 500) => {
    if (!text) return '';
    return String(text).length > maxLength ? String(text).slice(0, maxLength) + '…' : String(text);
  };
  const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  async function search() {
    const field = fieldEl.value;
    const term = qEl.value.trim();
    if (!term) {
      resultsEl.innerHTML = '';
      resultsEl.style.display = 'none';
      countEl.textContent = '';
      return;
    }

    const res = await fetch(`/api/pdf-search/${encodeURIComponent(field)}/${encodeURIComponent(term.toLowerCase())}`);
    if (!res.ok) {
      const t = await res.text();
      resultsEl.innerHTML = `<div class="muted">Fel: ${res.status} ${t.slice(0, 200)}</div>`;
      resultsEl.style.display = 'block';
      countEl.textContent = '0 resultat';
      return;
    }

    const rows = await res.json();
    countEl.textContent = `${rows.length} resultat`;
    resultsEl.style.display = 'block';

    resultsEl.innerHTML = rows.map(r => {
      const filename = r.filename || '';
      const title = r.title || r.xmp_title || 'No title';
      const author = r.author || 'Unknown';
      const subject = r.subject || 'Not specified';
      const keywords = r.keywords || 'None';
      const pages = r.numpages ?? 'Unknown';
      const text = r.text || '';

      return `
        <article>
          <h3>${highlight(title, term)}</h3>
          <p><b>Author:</b> ${highlight(author, term)}</p>
          <p><b>Subject:</b> ${highlight(subject, term)}</p>
          <p><b>Keywords:</b> ${highlight(keywords, term)}</p>
          <p><b>pages:</b> ${pages}</p>
          <p><b>Text:</b> ${highlight(truncate(text), term)}</p>
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

  // events (scoped)
  doBtn.addEventListener('click', search);
  fieldEl.addEventListener('change', search);

  // debounce på keyup
  let debounceTimer;
  qEl.addEventListener('keyup', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      search();
    }, 300);
  });

  // show all metadata
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
      pre.textContent = 'Kunde inte hämta metadata.';
      pre.classList.remove('hidden');
    }
  });
}

export function cleanup() { /* optional */ }