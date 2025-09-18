export function render(appEl) {
  appEl.innerHTML = `
    <section id="image-page">
      <h2>Search image</h2>
      <h4>Use this search engine to explore image metadata stored in the database.
      You can search by file name, camera make or model, date range,
      or even by geographic location (latitude/longitude with radius).
      </h4>

      <form id="searchForm" class="controls" style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
        <label>
          Search by
          <select id="searchMode" name="mode">
            <option value="all" selected>All fields</option>
            <option value="file">File name</option>
            <option value="make">Make</option>
            <option value="model">Model</option>
            <option value="date">Creation Date</option>
            <option value="geo">Geo (lat/lon + radius)</option>
          </select>
        </label>

        <!-- groups -->
        <div data-group="all file" class="group">
          <input id="text"  placeholder="File name / Make / Model" />
        </div>

        <div data-group="make" class="group hidden">
          <input id="make"  placeholder="Sony, Samsung, Nikon…" />
        </div>

        <div data-group="model" class="group hidden">
          <input id="model" placeholder="Model" />
        </div>

        <div data-group="date" class="group hidden">
          <label class="inline-label">
            <span>From</span>
            <input id="from" type="date" placeholder="yyyy-mm-dd" />
          </label>

          <label class="inline-label">
            <span>To</span>
            <input id="to" type="date" placeholder="yyyy-mm-dd" />
          </label>
        </div>


        <div data-group="geo" class="group hidden">
          <input id="nearLat" placeholder="Latitude" style="width:120px" />
          <input id="nearLon" placeholder="Longitude" style="width:120px" />
          <input id="radius"  placeholder="km"  style="width:90px" />
        </div>


        <label>
          Per page
          <select id="pageSize" title="Per page">
            <option value="10" selected>10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>

        <button type="submit">Search</button>
      </form>

      <div id="summary" class="muted" style="margin-top:8px;"></div>


      <div class="music-results-wrapper" id="imageResults" hidden>
        <table id="resultTable">
          <thead>
            <tr>
              <th>File Name</th><th>Make</th><th>Model</th><th>Date</th>
              <th>Width</th><th>Height</th><th>Latitude</th><th>Longitude</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="resultBody"></tbody>
        </table>

        <div class="controls" id="pagination">
          <button id="prevBtn" type="button">Prev</button>
          <span id="pageInfo" class="muted"></span>
          <button id="nextBtn" type="button">Next</button>
        </div>
      </div>

  
      <div id="metaModal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="metaTitle">
        <div class="modal-backdrop"></div>
        <div class="modal-dialog" role="document">
          <div class="modal-header">
            <h3 id="metaTitle">Image metadata</h3>
            <button type="button" id="metaClose" class="btn-close" aria-label="Close">×</button>
          </div>
          <div class="modal-body">
            <pre id="metaJson" class="codeblock">{ }</pre>
          </div>
          <div class="modal-footer">
            <button type="button" id="metaOk" class="btn">Close</button>
          </div>
        </div>
      </div>

    </section>
  `;

  // state + refs
  const state = { page: 1, total: 0, pageSize: 20, lastQuery: '' };
  const form = appEl.querySelector('#searchForm');
  const modeEl = appEl.querySelector('#searchMode');
  const table = appEl.querySelector('#resultTable');
  const tbody = appEl.querySelector('#resultBody');
  const summary = appEl.querySelector('#summary');
  const pagination = appEl.querySelector('#pagination');
  const pageInfo = appEl.querySelector('#pageInfo');
  const prevBtn = appEl.querySelector('#prevBtn');
  const nextBtn = appEl.querySelector('#nextBtn');
  const modalEl = appEl.querySelector('#metaModal');
  const modalJsonEl = appEl.querySelector('#metaJson');
  const modalCloseBtn = appEl.querySelector('#metaClose');
  const modalOkBtn = appEl.querySelector('#metaOk');
  const modalBackdrop = appEl.querySelector('#metaModal .modal-backdrop');
  const resultsWrap = appEl.querySelector('#imageResults');

  function openMetaModal(show = true) {
    modalEl.classList.toggle('hidden', !show);
    if (show) {

      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }


  modalCloseBtn.addEventListener('click', () => openMetaModal(false));
  modalOkBtn.addEventListener('click', () => openMetaModal(false));
  modalBackdrop.addEventListener('click', () => openMetaModal(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalEl.classList.contains('hidden')) {
      openMetaModal(false);
    }
  });



  function updateGroups() {
    const mode = modeEl.value;


    appEl.querySelectorAll('[data-group]').forEach(el => {
      const groups = (el.getAttribute('data-group') || '').split(/\s+/);
      el.classList.toggle(
        'hidden',
        !groups.includes(mode) && !(mode === 'all' && groups.includes('all'))
      );
    });


    const textEl = appEl.querySelector('#text');
    if (textEl) {
      textEl.placeholder =
        (mode === 'file')
          ? 'File name'
          : (mode === 'all')
            ? 'File name / Make / Model'
            : 'Search...';
    }
  }

  modeEl.addEventListener('change', updateGroups);
  updateGroups();

  form.addEventListener('submit', (ev) => { ev.preventDefault(); state.page = 1; runSearch(); });
  prevBtn.addEventListener('click', () => { if (state.page > 1) { state.page--; runSearch(true); } });
  nextBtn.addEventListener('click', () => {
    const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page < maxPage) { state.page++; runSearch(true); }
  });

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button.btn-meta');
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) {
      alert('Missing row id.');
      return;
    }

    try {
      const res = await fetch(`/api/image/meta/${encodeURIComponent(id)}`);
      if (!res.ok) {
        const text = await res.text();
        alert(`Failed to fetch metadata (${res.status}): ${text.slice(0, 200)}`);
        return;
      }
      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
    } catch (err) {
      alert('Request error: ' + err.message);
    }
  });


  runSearch();

  async function runSearch(keepQuery = false) {
    const params = buildQueryParams(keepQuery);
    const url = `/api/image/search?${params.toString()}`;

    summary.textContent = 'Loading...';
    table.hidden = true;
    pagination.hidden = true;

    const res = await fetch(url);
    if (!res.ok) { summary.textContent = 'Search failed.'; return; }
    const data = await res.json();

    state.total = data.total || 0;
    state.pageSize = data.pageSize || Number(appEl.querySelector('#pageSize').value || 20);
    renderResults(data);
  }

  function buildQueryParams(keepQuery) {
    const mode = modeEl.value;

    const text = (appEl.querySelector('#text')?.value || '').trim();
    const make = (appEl.querySelector('#make')?.value || '').trim();
    const model = (appEl.querySelector('#model')?.value || '').trim();
    const from = appEl.querySelector('#from')?.value || '';
    const to = appEl.querySelector('#to')?.value || '';
    const nearLat = (appEl.querySelector('#nearLat')?.value || '').trim();
    const nearLon = (appEl.querySelector('#nearLon')?.value || '').trim();
    const radius = (appEl.querySelector('#radius')?.value || '').trim();
    const pageSize = appEl.querySelector('#pageSize').value;

    const params = keepQuery && state.lastQuery ? new URLSearchParams(state.lastQuery) : new URLSearchParams();
    params.set('page', String(state.page));
    params.set('pageSize', pageSize || '20');

    // only set params needed by the selected mode
    if (mode === 'all' || mode === 'file') {
      if (text) params.set('text', text); else params.delete('text');
    } else {
      params.delete('text');
    }

    if (mode === 'make') { if (make) params.set('make', make); else params.delete('make'); }
    else params.delete('make');

    if (mode === 'model') { if (model) params.set('model', model); else params.delete('model'); }
    else params.delete('model');

    if (mode === 'date') {
      if (from) params.set('from', from); else params.delete('from');
      if (to) params.set('to', to); else params.delete('to');
    } else { params.delete('from'); params.delete('to'); }

    if (mode === 'geo') {
      if (nearLat && nearLon && radius) {
        params.set('nearLat', nearLat);
        params.set('nearLon', nearLon);
        params.set('radius', radius);
      } else {
        params.delete('nearLat'); params.delete('nearLon'); params.delete('radius');
      }
    } else { params.delete('nearLat'); params.delete('nearLon'); params.delete('radius'); }

    state.lastQuery = params.toString();
    return params;
  }

  function renderResults(data) {
    const rows = data.results || [];
    tbody.innerHTML = '';

    const mapUrl = (lat, lon) => `https://maps.google.com/?q=${Number(lat).toFixed(6)},${Number(lon).toFixed(6)}`;

    rows.forEach(r => {
      const hasGps = r.latitude != null && r.longitude != null;

      const tr = document.createElement('tr');
      tr.innerHTML = `
      <td title="${r.file_path || ''}">${r.file_name || ''}</td>
      <td>${r.make || ''}</td>
      <td>${r.model || ''}</td>
      <td>${fmtDate(r.create_date)}</td>
      <td>${r.width ?? ''}</td>
      <td>${r.height ?? ''}</td>
      <td>${fmtNum(r.latitude)}</td>
      <td>${fmtNum(r.longitude)}</td>
      <td class="row-actions">
        ${r.file_name ? `<a href="/image/${encodeURIComponent(r.file_name)}" target="_blank" rel="noopener">View</a>` : ''}
        ${hasGps ? ` | <a href="${mapUrl(r.latitude, r.longitude)}" target="_blank" rel="noopener">Map</a>` : ` | <span class="muted">No GPS</span>`}
        ${r.id != null ? ` | <button type="button" class="btn-meta" data-id="${r.id}">Metadata</button>` : ''}
      </td>
    `;
      tbody.appendChild(tr);
    });

    table.hidden = rows.length === 0;

    const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
    summary.textContent = `Total: ${state.total} | Page ${state.page} of ${maxPage}`;
    pagination.hidden = rows.length === 0;
    pageInfo.textContent = `Page ${state.page} / ${maxPage}`;
    resultsWrap.hidden = rows.length === 0;
  }


  function fmtNum(n) { return (n === null || n === undefined) ? '' : String(n); }
  function fmtDate(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    return isNaN(d.getTime()) ? String(dt) : d.toISOString().slice(0, 19).replace('T', ' ');
  }
}
export function cleanup() { }