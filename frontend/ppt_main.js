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
        From: <input id="date-from" type="date" maxlength="10" />
        To: <input id="date-to" type="date" maxlength="10" />        
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
    <div id="metadata-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; 
     background:rgba(0,0,0,0.5); justify-content:center; align-items:center; z-index:1000;">
  <div style="background:white; padding:20px; border-radius:8px; max-width:600px; width:90%; position:relative;">
    <h3 id="metadata-modal-title">Metadata</h3>
    <pre id="metadata-modal-content" style="
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow:auto;
  max-height:400px;
"></pre>

    <button id="metadata-modal-close" style="position:absolute; top:10px; right:10px;">X</button>
  </div>
</div>

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

  // Lyssna på fältval
fieldEl.addEventListener('change', () => {
  const showDate = fieldEl.value === 'creationDate';
  // Visa/dölj datumfält
  document.querySelector('#date-range').style.display = showDate ? 'inline-flex' : 'none';
  // Visa/dölj fritextfält
  qEl.style.display = showDate ? 'none' : 'inline-block';
});


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
          <button class="show-meta-btn" data-id="${r.id}">Show Metadata</button>
        </article>
      `;
    }).join('');

    const modal = document.getElementById('metadata-modal');
const modalTitle = document.getElementById('metadata-modal-title');
const modalContent = document.getElementById('metadata-modal-content');
const modalClose = document.getElementById('metadata-modal-close');

modalClose.addEventListener('click', () => modal.style.display = 'none');

document.querySelectorAll('.show-meta-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    try {
      const res = await fetch(`/api/ppt/${id}/metadata`);
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const metadata = await res.json();

      modalTitle.textContent = `Metadata for ID ${id}`;
      modalContent.textContent = JSON.stringify(metadata, null, 2);
      modal.style.display = 'flex'; 
    } catch (err) {
      console.error(`Failed to fetch metadata: ${err.message}`);
    }
  });
});

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

  function validateDateInput(dateStr) {
    // Kontrollera format YYYY-MM-DD och max 4 siffror på år
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  }
  
  async function search(newOffset = 0) {
    const field = fieldEl.value;
    let term = qEl.value.trim();
    const limit = Number(limitEl.value) || 10;
    offset = newOffset;
  
    // Visa/dölj inputs beroende på valt fält
    const showDate = field === 'creationDate';
    document.querySelector('#date-range').style.display = showDate ? 'inline-flex' : 'none';
    qEl.style.display = showDate ? 'none' : 'inline-block';
  
    const dateFrom = showDate ? dateFromEl.value : '';
    const dateTo = showDate ? dateToEl.value : '';
  
    // Kontrollera att båda datum är angivna och giltiga om creationDate
    if (showDate) {
      if (!dateFrom || !dateTo) {
        countEl.textContent = 'Specify both From and To dates';
        resultsEl.innerHTML = '';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
      }
      if (!validateDateInput(dateFrom) || !validateDateInput(dateTo)) {
        countEl.textContent = 'Invalid date format (YYYY-MM-DD)';
        resultsEl.innerHTML = '';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
      }
    }
  
    const params = new URLSearchParams({ limit, offset });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
  
    let url;
    if (showDate || term) {
      url = `/api/ppt-search/${encodeURIComponent(field)}/${encodeURIComponent(term || '-')}` +
            `?${params.toString()}`;
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
  
  
  // Enter-event för både fritext och datumfält
  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search(0);
    }
  });
  dateFromEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(0); });
  dateToEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(0); });
  doBtn.addEventListener('click', () => search(0));
  

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
    if (e.key === 'Enter' && fieldEl.value !== 'creationDate') {
      e.preventDefault();
      search(0);
    }
  });

  [dateFromEl, dateToEl].forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        search(0);
      }
    });
  });
  
limitEl.addEventListener('change', () => {
  const oldLimit = Number(limitEl.dataset.oldValue || 10); 
  const newLimit = Number(limitEl.value);
  offset = Math.floor(offset / oldLimit) * newLimit;
  limitEl.dataset.oldValue = newLimit; 
  search(offset);
});

}

export function cleanup() { }
