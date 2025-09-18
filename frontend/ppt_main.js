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
        <input id="ppt-q" type="text" placeholder="Search" />
        <label id="date-range" style="display:none;">
          From: <input id="date-from" type="date" />
          To: <input id="date-to" type="date" />
        </label>
        <label>
  Results per page:
  <select id="ppt-limit">
    <option value="10">10</option>
    <option value="25">25</option>
    <option value="50">50</option>
    <option value="100">100</option>
  </select>
</label>
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
  const limitEl = appEl.querySelector('#ppt-limit');
  const doBtn = appEl.querySelector('#ppt-do');
  const prevBtn = appEl.querySelector('#ppt-prev');
  const nextBtn = appEl.querySelector('#ppt-next');
  const countEl = appEl.querySelector('#ppt-count');
  const resultsEl = appEl.querySelector('#ppt-results');

  let offset = 0;
  let lastResultCount = 0;
  let lastTotal = 0;

  function renderRows(rows) {
    resultsEl.innerHTML = rows.map(r => {
      const sizeStr = r.fileSize
        ? r.fileSize < 1024
          ? `${r.fileSize} B`
          : r.fileSize < 1024 * 1024
            ? `${(r.fileSize / 1024).toFixed(1)} KB`
            : `${(r.fileSize / (1024 * 1024)).toFixed(1)} MB`
        : '';
  
      return `
        <article data-id="${r.id}">
          <p><b>Title:</b> ${r.title || 'Unknown'}</p>
          <p><b>URL:</b> ${r.original ? `<a href="${r.original}" target="_blank">${r.original}</a>` : 'Unknown'}</p>
          <p>
            <b>File name:</b> ${r.fileName || 'Unknown'}
            ${r.fileName
              ? ` <a href="/ppt/${encodeURIComponent(r.fileName)}" target="_blank">Open</a> | 
                 <a href="/ppt/${encodeURIComponent(r.fileName)}?download=1">Download</a>
                 ${sizeStr ? ` (${sizeStr})` : ''}`
              : ''}
          </p>
          <p><b>Organization:</b> ${r.organisation || 'Unknown'}</p>
          <p><b>Creation date:</b> ${r.creationDate || 'Unknown'}</p>
        </article>
      `;
    }).join('');
  }

  function updateCount(rowsLength, total) {
    if (rowsLength === 0) {
      countEl.textContent = `0 results`;
      return;
    }
    const start = offset + 1;
    const end = offset + rowsLength;
    countEl.textContent = `Showing ${start} - ${end} of ${total} results`;
  }

  async function search(newOffset = 0) {
    const field = fieldEl.value;
    let term = qEl.value.trim();
    const limit = Number(limitEl.value) || 10;
    offset = newOffset;

    // visa/dölj inputs beroende på field
    const showDate = field === 'creationDate';
    document.querySelector('#date-range').style.display = showDate ? 'inline-flex' : 'none';
    qEl.style.display = showDate ? 'none' : 'inline-block';

    const dateFrom = showDate ? dateFromEl.value : '';
    const dateTo = showDate ? dateToEl.value : '';

    // placeholder för fritext om bara datum används
    if (field === 'creationDate' && !term) term = '-';

    const params = new URLSearchParams({ limit, offset });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    let url;
    if (field === 'creationDate' || term) {
      url = `/api/ppt-search/${encodeURIComponent(field)}/${encodeURIComponent(term)}?${params.toString()}`;
    } else {
      url = `/api/ppt?${params.toString()}`;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json();
      const rows = data.items || [];
      lastResultCount = rows.length;
      lastTotal = data.total ?? rows.length;

      renderRows(rows);
      updateCount(rows.length, lastTotal);

      prevBtn.disabled = offset === 0;
      nextBtn.disabled = offset + lastResultCount >= lastTotal;
    } catch (err) {
      console.error(err);
      resultsEl.innerHTML = `<div class="muted">${err.message}</div>`;
      countEl.textContent = '0 results';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  }

  // initial laddning: slumpmässiga resultat
  fetch('/api/ppt?limit=10')
    .then(res => res.json())
    .then(data => {
      renderRows(data.items || []);
      lastResultCount = data.items?.length || 0;
      lastTotal = data.total || 0;
      updateCount(lastResultCount, lastTotal);
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    })
    .catch(err => {
      console.error(err);
      resultsEl.innerHTML = `<div class="muted">${err.message}</div>`;
    });

  // event listeners
  doBtn.addEventListener('click', () => search(0));
  prevBtn.addEventListener('click', () => search(Math.max(0, offset - Number(limitEl.value || 10))));
  nextBtn.addEventListener('click', () => search(offset + Number(limitEl.value || 10)));
  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      search(0);           
    }
  });
}

export function cleanup() { }
