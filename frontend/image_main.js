export function render(appEl) {
  appEl.innerHTML = `
    <section>
      <h2>Bild Sök</h2>
      <form id="searchForm" class="controls" style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <input id="text"  name="text"  placeholder="Filnamn/Märke/Modell" />
        <input id="make"  name="make"  placeholder="Märke (SONY, Apple…)" />
        <input id="model" name="model" placeholder="Modell" />
        <input id="from"  name="from"  type="date" />
        <input id="to"    name="to"    type="date" />
        <input id="nearLat" name="nearLat" placeholder="Latitude" style="width:120px" />
        <input id="nearLon" name="nearLon" placeholder="Longitude" style="width:120px" />
        <input id="radius"  name="radius"  placeholder="km"  style="width:90px" />
        <select id="pageSize" name="pageSize" title="Antal per sida">
          <option value="10">10st per sida</option>
          <option value="20" selected>20st per sida</option>
          <option value="50">50st per sida</option>
          <option value="100">100st per sida</option>
        </select>

        <button type="submit">Sök</button>
      </form>

      <div id="summary" class="muted" style="margin-top:8px;"></div>

      <table id="resultTable" class="table" hidden>
        <thead>
          <tr>
            <th>Filnamn</th><th>Märke</th><th>Modell</th><th>Datum</th>
            <th>Bredd</th><th>Höjd</th><th>Latitude</th><th>Longitude</th><th>Visa bild</th>

          </tr>
        </thead>
        <tbody id="resultBody"></tbody>
      </table>

      <div class="controls" id="pagination" hidden>
        <button id="prevBtn" type="button">Prev</button>
        <span id="pageInfo" class="muted"></span>
        <button id="nextBtn" type="button">Next</button>
      </div>
    </section>
  `;

  const state = { page: 1, total: 0, pageSize: 20, lastQuery: '' };
  const form = appEl.querySelector('#searchForm');
  const table = appEl.querySelector('#resultTable');
  const tbody = appEl.querySelector('#resultBody');
  const summary = appEl.querySelector('#summary');
  const pagination = appEl.querySelector('#pagination');
  const pageInfo = appEl.querySelector('#pageInfo');
  const prevBtn = appEl.querySelector('#prevBtn');
  const nextBtn = appEl.querySelector('#nextBtn');

  form.addEventListener('submit', (ev) => { ev.preventDefault(); state.page = 1; runSearch(); });
  prevBtn.addEventListener('click', () => { if (state.page > 1) { state.page--; runSearch(true); } });
  nextBtn.addEventListener('click', () => {
    const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page < maxPage) { state.page++; runSearch(true); }
  });

  runSearch();

  async function runSearch(keepQuery = false) {
    const params = buildQueryParams(keepQuery);
    const url = `/api/image/search?${params.toString()}`; // khớp backend ảnh

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
    const text = appEl.querySelector('#text').value.trim();
    const make = appEl.querySelector('#make').value.trim();
    const model = appEl.querySelector('#model').value.trim();
    const from = appEl.querySelector('#from').value;
    const to = appEl.querySelector('#to').value;
    const pageSize = appEl.querySelector('#pageSize').value;
    const nearLat = appEl.querySelector('#nearLat').value.trim();
    const nearLon = appEl.querySelector('#nearLon').value.trim();
    const radius = appEl.querySelector('#radius').value.trim();

    const params = keepQuery && state.lastQuery ? new URLSearchParams(state.lastQuery) : new URLSearchParams();
    params.set('type', 'image'); params.set('page', String(state.page)); params.set('pageSize', pageSize || '20');

    if (text) params.set('text', text); else params.delete('text');
    if (make) params.set('make', make); else params.delete('make');
    if (model) params.set('model', model); else params.delete('model');
    if (from) params.set('from', from); else params.delete('from');
    if (to) params.set('to', to); else params.delete('to');

    if (nearLat && nearLon && radius) { params.set('nearLat', nearLat); params.set('nearLon', nearLon); params.set('radius', radius); }
    else { params.delete('nearLat'); params.delete('nearLon'); params.delete('radius'); }

    state.lastQuery = params.toString();
    return params;
  }

  function renderResults(data) {
    const rows = data.results || [];
    tbody.innerHTML = '';

    const mapUrl = (lat, lon) =>
      `https://maps.google.com/?q=${Number(lat).toFixed(6)},${Number(lon).toFixed(6)}`;

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
        ${r.file_name
          ? `<a href="/image/${encodeURIComponent(r.file_name)}" target="_blank" rel="noopener">Visa</a>`
          : ''
        }
        ${hasGps
          ? ` | <a href="${mapUrl(r.latitude, r.longitude)}" target="_blank" rel="noopener">Karta</a>`
          : ` | <span class="muted">No GPS</span>`
        }
      </td>
    `;
      tbody.appendChild(tr);
    });

    table.hidden = rows.length === 0;

    const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
    summary.textContent = `Total: ${state.total} | Page ${state.page} of ${maxPage}`;
    pagination.hidden = rows.length === 0;
    pageInfo.textContent = `Page ${state.page} / ${maxPage}`;
  }


  function fmtNum(n) { return (n === null || n === undefined) ? '' : String(n); }
  function fmtDate(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    return isNaN(d.getTime()) ? String(dt) : d.toISOString().slice(0, 19).replace('T', ' ');
  }
}
export function cleanup() { }
