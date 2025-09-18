export async function render(appEl) {
  appEl.innerHTML = `
  <section>
  <h2>
  Music search
  </h2>
  <h3>  
  Find music files by metadata. 
  </h3>
  Search by title, artist, album, year or other parameters, as well as listen to and download your favourite songs.
  <p>
    To view more detailed information about a specific track, press <b>show all metadata.
    <br>
    <br>
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

        <input id="q" placeholder="Search..." autocomplete="off" />
        <button id="btnSearch" type="button">Search</button>
      </div>

      <div id="summary" class="muted" style="margin-top:8px;"></div>
      <audio id="player" class="hidden" style="width:100%; max-width:560px"></audio>

      <div class="music-results-wrapper">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Artist</th>
              <th>Album</th>
              <th>Year</th>
              <th>Genre</th>
              <th>Download</th>
              <th>Play</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </section>
  `;

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

  fieldEl.value = 'any';
  qEl.value = '';

  function rowHtml(it) {
    const file = it.fileName || it.file;
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

  function updateYearUi() {
    const isYear = fieldEl.value === 'year';
    yearControlsEl.style.display = isYear ? 'inline-flex' : 'none';
    qEl.placeholder = isYear ? 'Search..' : 'Search...';

    const mode = yearModeEl.value;
    yearInclusiveWrap.style.display = (mode === 'before' || mode === 'after') ? 'inline-flex' : 'none';
  }

  updateYearUi();
  fieldEl.addEventListener('change', updateYearUi);
  yearModeEl.addEventListener('change', updateYearUi);

  async function search() {
    const q = qEl.value.trim();
    const field = fieldEl.value;

    let url;
    if (!q) {
      url = `/api/music?limit=10&offset=0`;
    } else if (!field || field === 'any') {
      url = `/api/music-search/any/${encodeURIComponent(q)}`;
    } else if (field === 'year') {
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

  async function loadInitial() {
    const res = await fetch('/api/music-search/any/%25');
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

  btnSearch.addEventListener('click', search);
  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search();
    }
  });

  rowsEl.addEventListener('click', async (e) => {
    const playBtn = e.target.closest('.btn-play');
    if (playBtn) {
      const src = playBtn.getAttribute('data-play');
      playerEl.src = src;
      playerEl.setAttribute('controls', '');
      playerEl.classList.remove('hidden');
      try { await playerEl.play(); } catch { }
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

export function cleanup() { }