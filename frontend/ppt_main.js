export function render(appEl) {
  appEl.innerHTML = `
    <section>
      <h2>Search PowerPoint</h2>
      <div class="controls" style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
        <label>
          Search:
          <select id="ppt-field">
            <option value="fileName">File name</option>
            <option value="title">Title</option>
            <option value="original">URL</option>
            <option value="organisation">Organization</option>
            <option value="creationDate">Creation date</option>
            <option value="any">All fields</option>
          </select>
        </label>
        <input id="ppt-q" type="text" placeholder="Search PowerPoint meta data" />
        <label id="date-range" style="display:none;">
          From: <input id="date-from" type="date" />
          To: <input id="date-to" type="date" />
        </label>
        <label>
          Order by:
          <select id="ppt-sort">
            <option value="title">Title</option>
            <option value="fileName">File name</option>
            <option value="organisation">Organization</option>
            <option value="creationDate">Creation date</option>
          </select>
        </label>
        <input id="ppt-limit" type="number" placeholder="Limit" style="width:100px;" value="100" />
        <button id="ppt-do">Search</button>
      </div>
      <p id="ppt-count" class="muted" style="margin-top:8px;">0 results</p>
      <div style="margin-bottom:8px;">
        <button id="ppt-prev" disabled>&lt; Previous</button>
        <button id="ppt-next" disabled>Next &gt;</button>
      </div>
      <section id="ppt-results"></section>
    </section>
  `;

  const fieldEl = appEl.querySelector('#ppt-field');
  const qEl = appEl.querySelector('#ppt-q');
  const dateFromEl = appEl.querySelector('#date-from');
  const dateToEl = appEl.querySelector('#date-to');
  const sortEl = appEl.querySelector('#ppt-sort');
  const limitEl = appEl.querySelector('#ppt-limit');
  const doBtn = appEl.querySelector('#ppt-do');
  const prevBtn = appEl.querySelector('#ppt-prev');
  const nextBtn = appEl.querySelector('#ppt-next');
  const countEl = appEl.querySelector('#ppt-count');
  const resultsEl = appEl.querySelector('#ppt-results');

  let offset = 0;
  let lastResultCount = 0;
  let isRandom = true;

  function renderRows(rows) {
    resultsEl.innerHTML = rows.map(r => {
      const fileName = r.fileName || '';
      const title = r.title || 'Unknown';
      const company = r.organisation || 'Unknown';
      const creationDate = r.creationDate || 'Unknown';
      const original = r.original || '';
      const openLink = fileName
        ? `<a href="/ppt/${encodeURIComponent(fileName)}" target="_blank" rel="noopener">Open</a>`
        : '';
      const downloadLink = fileName
        ? `<a href="/ppt/${encodeURIComponent(fileName)}?download=1" target="_blank" rel="noopener">Download</a>`
        : '';
      const fileLinks = [openLink, downloadLink].filter(Boolean).join(' | ');

      return `
        <article data-id="${r.id}">
          <p><b>Title:</b> ${title}</p>
          <p><b>URL:</b> ${original ? `<a href="${original}" target="_blank" rel="noopener">${original}</a>` : 'Unknown'}</p>
          <p><b>File name:</b> ${fileName || 'Unknown'} ${fileLinks}</p>
          <p><b>Organisation:</b> ${company}</p>
          <p><b>Creation date:</b> ${creationDate}</p>
          <p><button class="btn-show-all-ppt-metadata">Show all metadata</button></p>
          <pre class="ppt-meta-block hidden"></pre>
        </article>
      `;
    }).join('');
  }

  function updateCount(rowsLength, total) {
    const start = offset + 1;
    const end = offset + rowsLength;
    countEl.textContent = `Showing ${start} - ${end} of ${total} results`;
  }

  // --- Search function with corrected date handling ---
  async function search(newOffset = 0) {
    isRandom = false;
    const field = fieldEl.value;
    let term = qEl.value.trim();
    if (field === 'creationDate' && !term) term = ' ';
    const sortField = sortEl.value;
    const limit = Number(limitEl.value) || 100;
    const dateFrom = dateFromEl.value;
    const dateTo = dateToEl.value;
    offset = newOffset;

    let url;

    // --- Handle creationDate search with or without term ---
    if (field === 'creationDate' && !term && (dateFrom || dateTo)) {
      // Empty search term but date range is set → don't add %20
      url = `/api/ppt-search/${encodeURIComponent(field)}/?limit=${limit}&offset=${offset}&sortField=${encodeURIComponent(sortField)}`;
    } else if (term || field === 'creationDate') {
      // Normal search with term or field is creationDate
      url = `/api/ppt-search/${encodeURIComponent(field)}/${encodeURIComponent(term)}?limit=${limit}&offset=${offset}&sortField=${encodeURIComponent(sortField)}`;
    } else {
      // No search term → fetch standard/slump
      url = `/api/ppt?limit=${limit}&offset=${offset}&sortField=${encodeURIComponent(sortField)}`;
    }

    console.log("Fetching URL:", url, "dateFrom:", dateFrom, "dateTo:", dateTo);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error: ${res.status}`);

      const data = await res.json();
      const rows = data.items || [];
      const total = data.total ?? rows.length;

      lastResultCount = rows.length;
      renderRows(rows);
      updateCount(rows.length, total);

      prevBtn.disabled = offset === 0;
      nextBtn.disabled = offset + lastResultCount >= total;
    } catch (err) {
      console.error(err);
      resultsEl.innerHTML = `<div class="muted">${err.message}</div>`;
      countEl.textContent = '0 results';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  }

  // --- Event listeners ---
  doBtn.addEventListener('click', () => search(0));
  qEl.addEventListener('keyup', e => { if (e.key === 'Enter') search(0); });
  fieldEl.addEventListener('change', () => {
    const showDate = fieldEl.value === 'creationDate';
    document.querySelector('#date-range').style.display = showDate ? 'inline-flex' : 'none';
    search(0);
  });
  sortEl.addEventListener('change', () => search(0));
  limitEl.addEventListener('change', () => search(0));
  dateFromEl.addEventListener('change', () => search(0));
  dateToEl.addEventListener('change', () => search(0));

  prevBtn.addEventListener('click', () => search(Math.max(0, offset - Number(limitEl.value))));
  nextBtn.addEventListener('click', () => search(offset + Number(limitEl.value)));

  resultsEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-show-all-ppt-metadata');
    if (!btn) return;

    const article = btn.closest('article');
    const pre = article.querySelector('.ppt-meta-block');
    const id = article.getAttribute('data-id');

    if (!pre.classList.contains('hidden')) {
      pre.textContent = '';
      pre.classList.add('hidden');
      btn.textContent = 'Show all metadata';
      return;
    }
    try {
      const res = await fetch(`/api/ppt/${encodeURIComponent(id)}`);
      const data = await res.json();
      pre.textContent = JSON.stringify(data, null, 2);
    } catch {
      pre.textContent = 'Could not find meta data.';
    }
    pre.classList.remove('hidden');
    btn.textContent = 'Hide metadata';
  });

  // --- Initial load: 10 random ---
  limitEl.value = 10;
  fetch(`/api/ppt?limit=10`)
    .then(res => res.json())
    .then(data => {
      const rows = data.items || [];
      const total = data.total ?? rows.length;
      isRandom = true;
      offset = 0;
      lastResultCount = rows.length;
      renderRows(rows);
      updateCount(rows.length, total);

      prevBtn.disabled = true;
      nextBtn.disabled = true; // no pagination for random
    });
}

export function cleanup() { }
