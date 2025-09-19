// PowerPoint search UI: supports fielded search + optional date-range, paging via limit/offset
export function render(appEl) {
  appEl.innerHTML = `
  <section>
    <h2>PowerPoint search</h2>
    <h3>Find PowerPoint documents by metadata.</h3>
    Search by title, file name, subject, organization, date or other parameters.
    Watch or download fascinating slides form the world's most exciting organizations.
    <p>To view more detailed information about a specific document, press <b>show all metadata.</b></p>
    <br>

    <!-- Controls: field, term/date, page size -->
    <div class="controls">
      <label>
        Search:
        <select id="ppt-field">
          <option value="fileName">File name</option>
          <option value="title">Title</option>
          <option value="original">URL</option>
          <option value="organisation">Organization</option>
          <option value="creationDate">Date created</option>
          <option value="any">All fields</option>
        </select>
      </label>

      <!-- Hidden unless field=creationDate -->
      <input id="ppt-q" type="text" placeholder="Search..." />
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

    <!-- Pagination status/controls -->
    <p id="ppt-count" class="muted">0 results</p>
    <div id="pagination" class="controls">
      <button id="ppt-prev" disabled>&lt; Previous</button>
      <button id="ppt-next" disabled>Next &gt;</button>
    </div>

    <!-- Results container -->
    <section id="ppt-results"></section>
  </section>

  <!-- Simple modal (unused currently; using inline <pre> instead) -->
  <div id="metadata-modal" class="ppt-modal hidden">
    <div class="modal-backdrop"></div>
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 id="metadata-modal-title">Metadata</h3>
        <button id="metadata-modal-close" class="btn-close">X</button>
      </div>
      <div class="modal-body">
        <pre id="metadata-modal-content" class="ppt-meta-block"></pre>
      </div>
    </div>
  </div>
  `;

  // ===== DOM refs =====
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

  // Modal elements (currently not used; kept for possible future UX)
  const modal = document.getElementById('metadata-modal');
  const modalTitle = document.getElementById('metadata-modal-title');
  const modalContent = document.getElementById('metadata-modal-content');
  const modalClose = document.getElementById('metadata-modal-close');
  modalClose.addEventListener('click', () => modal.style.display = 'none');

  // Toggle the date-range inputs when searching by "creationDate"
  fieldEl.addEventListener('change', () => {
    const showDate = fieldEl.value === 'creationDate';
    document.querySelector('#date-range').style.display = showDate ? 'inline-flex' : 'none';
    qEl.style.display = showDate ? 'none' : 'inline-block';
  });

  // Pagination state
  let offset = 0;
  let lastResultCount = 0;
  let lastTotal = 0;

  // YYYY-MM-DD format validation helper
  function validateDateInput(dateStr) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  }

  // Render one "card" per PPT record, with open/download links and inline metadata toggle
  function renderRows(rows) {
    resultsEl.innerHTML = rows.map(r => {
      // Best-effort human-readable size (B/KB/MB)
      const sizeStr = r.fileSize
        ? r.fileSize < 1024 ? `${r.fileSize} B`
          : r.fileSize < 1024 * 1024 ? `${(r.fileSize / 1024).toFixed(1)} KB`
            : `${(r.fileSize / (1024 * 1024)).toFixed(1)} MB`
        : '';

      return `
        <article class="ppt-result" data-id="${r.id}">
          <h3>${r.title || 'Unknown'}</h3>
          <p><b>Organization:</b> ${r.organisation || 'Unknown'}</p>
          <p><b>File name:</b> ${r.fileName || 'Unknown'}
            ${r.fileName ? `
              <a href="/ppt/${encodeURIComponent(r.fileName)}" target="_blank">Open</a> |
              <a href="/ppt/${encodeURIComponent(r.fileName)}?download=1">Download</a>
              ${sizeStr ? ` (${sizeStr})` : ''}` : ''}
          </p>
          <p><b>Date created:</b> ${r.creationDate || 'Unknown'}</p>
          <p><b>URL:</b> ${r.original ? `<a href="${r.original}" target="_blank">${r.original}</a>` : 'Unknown'}</p>
          <button class="btn show-meta-btn" data-id="${r.id}">Show Metadata</button>
          <pre class="ppt-meta-block"></pre>
        </article>
      `;
    }).join('');

    // Wire up the inline "Show Metadata" toggles
    document.querySelectorAll('.show-meta-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pre = btn.nextElementSibling;
        const id = btn.dataset.id;
        if (!pre) return;

        // Toggle off if already open
        if (pre.style.display === 'block') {
          pre.style.display = 'none';
          pre.textContent = '';
          btn.textContent = 'Show Metadata';
          return;
        }

        // Fetch and display full JSON metadata for a single record
        try {
          const res = await fetch(`/api/ppt/${id}/metadata`);
          if (!res.ok) throw new Error(`Error: ${res.status}`);
          const metadata = await res.json();
          pre.textContent = JSON.stringify(metadata, null, 2);
          pre.style.display = 'block';
          btn.textContent = 'Hide Metadata';
        } catch (err) {
          pre.textContent = 'Cannot fetch metadata.';
          pre.style.display = 'block';
        }
      });
    });
  }

  // Update "Showing X - Y of Z" label
  function updateCount(rowsLength, total) {
    if (rowsLength === 0) {
      countEl.textContent = `0 results`;
      return;
    }
    const start = offset + 1;
    const end = offset + rowsLength;
    countEl.textContent = `Showing ${start} - ${end} of ${total} results`;
  }

  // Execute a (possibly paged) search and update UI + pagination
  async function search(newOffset = 0) {
    const field = fieldEl.value;
    let term = qEl.value.trim();
    const limit = Number(limitEl.value) || 10;
    offset = newOffset;

    const showDate = field === 'creationDate';
    const dateFrom = showDate ? dateFromEl.value : '';
    const dateTo = showDate ? dateToEl.value : '';

    // Validate date range if date search is active
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

    // Build query params
    const params = new URLSearchParams({ limit, offset });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    // Choose the endpoint based on whether we are filtering or just sampling randoms
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

      // Enable/disable pagination buttons
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

  // Bind controls
  const run = () => search(0);
  const back = () => search(Math.max(0, offset - Number(limitEl.value || 10)));
  const fwd = () => search(offset + Number(limitEl.value || 10));
  doBtn.addEventListener('click', run);
  prevBtn.addEventListener('click', back);
  nextBtn.addEventListener('click', fwd);

  [qEl, dateFromEl, dateToEl].forEach(el => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(0); });
  });

  // When page size changes, keep roughly same "page index"
  limitEl.addEventListener('change', () => {
    const oldLimit = Number(limitEl.dataset.oldValue || 10);
    const newLimit = Number(limitEl.value);
    offset = Math.floor(offset / oldLimit) * newLimit;
    limitEl.dataset.oldValue = newLimit;
    search(offset);
  });

  // Initial random sample
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
}
export function cleanup() { /* No-op */ }
