// Music search UI: queries backend endpoints and renders a result table with play/download buttons
export async function render(appEl) {
  appEl.innerHTML = `
  <section>
    <h2>Music search</h2>
    <h3>Find music files by metadata.</h3>
    <!-- Explanatory text and hint for full metadata -->
    Search by title, artist, album, year or other parameters, as well as listen to and download your favourite songs.
    <p>To view more detailed information about a specific track, press <b>show all metadata.</b></p>
    <br>

    <!-- Controls: field selector + optional year mode + text input -->
    <div class="controls" style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
      <label>
        Search:
        <select id="field">
          <option value="any">All fields</option>
          <option value="title">Title</option>
          <option value="artist">Artist</option>
          <option value="album">Album</option>
          <option value="genre">Genre</option>
          <option value="year">Year</option>
        </select>
      </label>

      <!-- Only visible when field=year (supports before/in/after + inclusive toggle) -->
      <div id="yearControls" class="hidden" style="gap:8px; align-items:center; margin-left:8px;">
        <select id="yearMode">
          <option value="before">Released before</option>
          <option value="in" selected>Released in</option>
          <option value="after">Released after</option>
        </select>
        <label id="yearInclusiveWrap" style="display:inline-flex; gap:6px; align-items:center;">
          <input type="checkbox" id="yearInclusive" checked />
          <span>Include the selected year</span>
        </label>
      </div>

      <!-- Query box and trigger -->
      <input id="q" placeholder="Search..." autocomplete="off" />
      <button id="btnSearch" type="button">Search</button>
    </div>

    <!-- Summary and audio player -->
    <div id="summary" class="muted" style="margin-top:8px;"></div>
    <audio id="player" class="hidden" style="width:100%; max-width:560px"></audio>

    <!-- Result table -->
    <div class="music-results-wrapper">
      <table>
        <thead>
          <tr>
            <th>Title</th><th>Artist</th><th>Album</th><th>Year</th><th>Genre</th>
            <th>Download</th><th>Play</th><th>Metadata</th>
          </tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
  </section>
  `;

  // ===== DOM lookups =====
  const qEl = document.getElementById('q');
  const fieldEl = document.getElementById('field');
  const rowsEl = document.getElementById('rows');
  const summaryEl = document.getElementById('summary');
  const playerEl = document.getElementById('player');
  const btnSearch = document.getElementById('btnSearch');
  const yearControlsEl = document.getElementById('yearControls');
  const yearModeEl = document.getElementById('yearMode');
  const yearInclusiveEl = document.getElementById('yearInclusive');
  const yearInclusiveWrap = document.getElementById('yearInclusiveWrap');

  // Default field/value
  fieldEl.value = 'any';
  qEl.value = '';

  // Renders one table row; data shape matches backend /api/music* responses
  function rowHtml(it) {
    const file = it.fileName || it.file;        // Some endpoints return fileName
    const url = `/music/${encodeURIComponent(file)}`;
    const idAttr = it.id != null ? `data-id="${String(it.id)}"` : '';
    return `
      <tr ${idAttr}>
        <td>${it.title || 'Unknown title'}</td>
        <td>${it.artist || 'Unknown artist'}</td>
        <td>${it.album || 'Unknown album'}</td>
        <td>${it.year || 'Unknown year'}</td>
        <td>${it.genre || 'Unknown genre'}</td>
        <td><a href="${url}" download>Download</a></td>
        <td><button class="btn-play" data-play="${url}">▶︎</button></td>
        <td><button class="btn-show-all-music-metadata">Show metadata</button></td>
      </tr>
    `;
  }

  // Toggle the year UI depending on field selection
  function updateYearUi() {
    const isYear = fieldEl.value === 'year';
    yearControlsEl.style.display = isYear ? 'inline-flex' : 'none';
    qEl.placeholder = isYear ? 'Search..' : 'Search...';

    // Inclusive only applies for before/after
    const mode = yearModeEl.value;
    yearInclusiveWrap.style.display = (mode === 'before' || mode === 'after') ? 'inline-flex' : 'none';
  }
  updateYearUi();
  fieldEl.addEventListener('change', updateYearUi);
  yearModeEl.addEventListener('change', updateYearUi);

  // Execute a search using the selected field and query
  async function search() {
    const q = qEl.value.trim();
    const field = fieldEl.value;

    let url;
    if (!q) {
      // Default sample listing
      url = `/api/music?limit=10&offset=0`;
    } else if (!field || field === 'any') {
      url = `/api/music-search/any/${encodeURIComponent(q)}`;
    } else if (field === 'year') {
      // Compose operators like <=1990, >=2000, =2015 depending on mode/checkbox
      const mode = yearModeEl.value;
      const inclusive = !!yearInclusiveEl.checked;
      const op = mode === 'before' ? (inclusive ? '<=' : '<') :
        mode === 'after' ? (inclusive ? '>=' : '>') : '=';
      const composed = `${op}${q.replace(/\s+/g, '')}`;
      url = `/api/music-search/year/${encodeURIComponent(composed)}`;
    } else {
      url = `/api/music-search/${encodeURIComponent(field)}/${encodeURIComponent(q)}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.items || []);
    summaryEl.textContent = `Showing ${list.length} songs`;
    rowsEl.innerHTML = list.map(rowHtml).join('');
  }

  // Initial random sample to make the page feel alive
  async function loadInitial() {
    const res = await fetch('/api/music-search/any/%25'); // % wildcard
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text.slice(0, 250)}`);
    }
    const data = await res.json();
    const all = Array.isArray(data) ? data : (data.items || []);
    const list = all.sort(() => Math.random() - 0.5).slice(0, 10);
    summaryEl.textContent = `Showing ${list.length} random songs`;
    rowsEl.innerHTML = list.map(rowHtml).join('');
  }

  // Wire up controls
  btnSearch.addEventListener('click', search);
  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search();
    }
  });

  // Row-level controls: play audio or fetch full metadata
  rowsEl.addEventListener('click', async (e) => {
    const playBtn = e.target.closest('.btn-play');
    if (playBtn) {
      const src = playBtn.getAttribute('data-play');
      playerEl.src = src;
      playerEl.setAttribute('controls', '');
      playerEl.classList.remove('hidden');
      try { await playerEl.play(); } catch { /* ignore */ }
      return;
    }

    const metaBtn = e.target.closest('.btn-show-all-music-metadata');
    if (metaBtn) {
      const tr = metaBtn.closest('tr');
      const id = tr?.getAttribute('data-id');
      if (!id) return alert('Ingen ID kopplad till raden.');
      try {
        const res = await fetch(`/api/music-all-meta/${encodeURIComponent(id)}`);
        const data = await res.json();
        alert(JSON.stringify(data, null, 2));
      } catch {
        alert('Kunde inte hämta metadata.');
      }
    }
  });

  await loadInitial();
}
export function cleanup() { /* No-op */ }
