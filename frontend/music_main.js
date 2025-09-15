// Allt som tidigare fanns i body i mp3.html flyttas hit in i render
// render fungerar bra att hoppa mellan olika sidor, stänger ljudspelare, popups osv
// är debounce något jag vill ha? varje sök nu ger  resultat och hämtar info 
export async function render(appEl) {
  appEl.innerHTML = `

        
      

      
        <label>
          Search:
          <select id="field">
            <option value="any">All fields</option>
            <option value="file">File</option>
            <option value="title">Title</option>
            <option value="artist">Artist</option>
            <option value="album">Album</option>
            <option value="genre">Genre</option>
            <option value="year">Year</option>
          </select>
        </label>
        <input id="q" placeholder="Search..." />
<button id="btnSearch" type="button">Sök</button>
      </div>

      <div id="summary" class="muted" style="margin-top:8px;"></div>

      <audio id="player" controls class="hidden" style="width:100%; max-width:560px"></audio>

      <table>
        <thead>
          <tr>
            <th>File</th>
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
    </section>
  `;


  const btnTheme = document.getElementById('themeToggle'); // ev darkmode framöver, borttaget 
  const qEl = document.getElementById('q'); //sökrutan
  const fieldEl = document.getElementById('field'); //dd, valmöjligheter
  const rowsEl = document.getElementById('rows'); //
  const summaryEl = document.getElementById('summary'); //det du söker på visas 10 låtar visas..
  const playerEl = document.getElementById('player'); //Spela upp musik. gömd innan man klickar på knapp med hidden 
  const btnSearch = document.getElementById('btnSearch');



  // it agerar som objektet " ta title från objektet it". encodeuri  för fält-sökord uppbyggnaden i api uppbyggnanden
  function rowHtml(it) {
    const file = it.fileName || it.file;
    const url = `/music/${encodeURIComponent(file)}`;
    const idAttr = it.id != null ? `data-id="${String(it.id)}"` : '';
    return `
      <tr ${idAttr}>
        <td>${it.file || ''}</td>
        <td>${it.title || ''}</td>
        <td>${it.artist || ''}</td>
        <td>${it.album || ''}</td>
        <td>${it.year || ''}</td>
        <td>${it.genre || ''}</td>
        <td><a href="${url}" download>Download</a></td>
        <td><button class="btn-play" data-play="${url}">▶︎</button></td>
        <td><button class="btn-show-all-music-metadata">Show metadata</button></td>
      </tr>
    `;
  }
  // Tomma fält ska  visas visuellt--> snyggare med okänd... än tomt enl Thomas ex
  function unknown(items) {
    for (const it of items) {
      if (!it.title || !String(it.title).trim()) it.title = 'Unknown title';
      if (!it.artist || !String(it.artist).trim()) it.artist = 'Unknown artist';
      if (!it.album || !String(it.album).trim()) it.album = 'Unknown album';
      if (!it.year || !String(it.year).trim()) it.year = 'Unknown year';
      if (!it.genre || !String(it.genre).trim()) it.genre = 'Unknown genre';
    }
    return items;
  }

  async function search() {
    const q = qEl.value.trim();
    const field = fieldEl.value;

    // q är sökrutan. Annars vilkor för att hämta olika typer av api:er
    let url;
    if (!q) {

      url = `/api/music?limit=10&offset=0`; //10 låtar vi start av sidan 
    } else if (!field || field === 'any') {
      url = `/api/music-search/any/${encodeURIComponent(q)}`;
    } else {
      url = `/api/music-search/${encodeURIComponent(field)}/${encodeURIComponent(q)}`;
    }

    // kollar att allt är ok innan det visas
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
    }


    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.items || []);
    unknown(list);

    summaryEl.textContent = `Visar ${list.length} låtar`; //snygg touch för att få en överblick imo
    rowsEl.innerHTML = list.map(rowHtml).join('');
  }


  // tidigare lösning
  //qEl.addEventListener('input', search); //söker på tangenttryck
  //fieldEl.addEventListener('change', search); // söker på byte av kategori i dropdown

  // Kör sök när man klickar på knappen
  btnSearch.addEventListener('click', search);

  // Kör sök när man trycker Enter i sökrutan
  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search();
    }
  });

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


  await search();
}
// clean up för Single page app. avbryter/pausar(?) pågående lyssnare och refreshar när man klickar på olika sidor
export function cleanup() {

}