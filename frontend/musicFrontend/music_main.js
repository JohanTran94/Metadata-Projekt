// Allt som tidigare fanns i <body> i mp3.html flyttas hit in i render()

export async function render(appEl) {
  appEl.innerHTML = `
    <section>
      <div class="row" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <h2 style="margin:0;">Här kan du söka på olika mp3 filter--> Det finns även olika kategorier att filtrera på.</h2>
        
      </div>

      <div class="controls" style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <label>
          Sök i:
          <select id="field">
            <option value="any">Alla sökfält</option>
            <option value="title">Titel</option>
            <option value="artist">Artist</option>
            <option value="album">Album</option>
            <option value="genre">Genre</option>
            <option value="year">År</option>
          </select>
        </label>
        <input id="q" placeholder="Sök..." />
      </div>

      <div id="summary" class="muted" style="margin-top:8px;"></div>

      <audio id="player" controls class="hidden" style="width:100%; max-width:560px"></audio>

      <table>
        <thead>
          <tr>
            <th>Fil</th>
            <th>Titel</th>
            <th>Artist</th>
            <th>Album</th>
            <th>År</th>
            <th>Genre</th>
            <th>Ladda ned</th>
            <th>Spela</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
    </section>
  `;

  // ==== Elementrefs ====
  const btnTheme = document.getElementById('themeToggle');
  const qEl = document.getElementById('q');
  const fieldEl = document.getElementById('field');
  const rowsEl = document.getElementById('rows');
  const summaryEl = document.getElementById('summary');
  const playerEl = document.getElementById('player');



  // 
  function rowHtml(it) {
    const file = it.fileName || it.file;
    const url = `/music/${encodeURIComponent(file)}`;
    const idAttr = it.id != null ? `data-id="${String(it.id)}"` : '';
    return `
      <tr ${idAttr}>
        <td>${file || ''}</td>
        <td>${it.title || ''}</td>
        <td>${it.artist || ''}</td>
        <td>${it.album || ''}</td>
        <td>${it.year || ''}</td>
        <td>${it.genre || ''}</td>
        <td><a href="${url}" download>Hämta</a></td>
        <td><button class="btn-play" data-play="${url}">▶︎</button></td>
        <td><button class="btn-show-all-music-metadata">Visa metadata</button></td>
      </tr>
    `;
  }

  function normalize(items) {
    for (const it of items) {
      if (!it.title || !String(it.title).trim()) it.title = 'Okänd titel';
      if (!it.artist || !String(it.artist).trim()) it.artist = 'Okänd artist';
      if (!it.album || !String(it.album).trim()) it.album = 'Okänt album';
      if (!it.year || !String(it.year).trim()) it.year = 'Okänt år';
      if (!it.genre || !String(it.genre).trim()) it.genre = 'Okänd genre';
    }
    return items;
  }

  async function search() {
    const q = qEl.value.trim();
    const field = fieldEl.value;

    // Bestäm rätt endpoint
    let url;
    if (!q) {
      // list-endpoint returnerar { items, limit, offset }
      url = `/api/music?limit=100&offset=0`;
    } else if (!field || field === 'any') {
      url = `/api/music-search/any/${encodeURIComponent(q)}`;
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
    normalize(list);

    summaryEl.textContent = `Visar ${list.length} låtar`;
    rowsEl.innerHTML = list.map(rowHtml).join('');
  }


  // 
  qEl.addEventListener('input', search);
  fieldEl.addEventListener('change', search);

  rowsEl.addEventListener('click', async (e) => {
    // Spela
    const playBtn = e.target.closest('.btn-play');
    if (playBtn) {
      const src = playBtn.getAttribute('data-play');
      playerEl.src = src;
      playerEl.classList.remove('hidden');
      try { await playerEl.play(); } catch { }
      return;
    }

    // Visa metadata
    const metaBtn = e.target.closest('.btn-show-all-music-metadata');
    if (metaBtn) {
      const tr = metaBtn.closest('tr');
      const id = tr?.getAttribute('data-id');
      if (!id) { alert('Ingen ID kopplad till raden.'); return; }
      try {
        const res = await fetch(`/api/music-all-meta/${encodeURIComponent(id)}`);
        const data = await res.json();
        alert(JSON.stringify(data, null, 2));
      } catch (err) {
        alert('Kunde inte hämta metadata.');
      }
    }
  });

  // Första laddningen
  await search();
}

export function cleanup() {

}
