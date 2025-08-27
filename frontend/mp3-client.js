// frontend/mp3-client.js
const qEl = document.getElementById('q');
const rowsEl = document.getElementById('rows');
const summaryEl = document.getElementById('summary');
const playerEl = document.getElementById('player');

function render(items, label) {
  if (!items || items.length === 0) {
    rowsEl.innerHTML = '';
    summaryEl.textContent = 'Inga träffar.';
    return;
  }
  summaryEl.textContent = label || `Visar ${items.length} låtar`;
  rowsEl.innerHTML = items.map(it => {
    const file = it.fileName ?? '';
    const fileUrl = `/music/${encodeURIComponent(file)}`;
    return `
      <tr>
        <td>${file}</td>
        <td>${it.title ?? ''}</td>
        <td>${it.artist ?? ''}</td>
        <td>${it.album ?? ''}</td>
        <td>${it.year ?? ''}</td>
        <td>${it.genre ?? ''}</td>
        <td>${it.kbps ?? ''}</td>
        <td><a href="${fileUrl}" download>Hämta</a></td>
        <td><button data-play="${fileUrl}">▶︎</button></td>
      </tr>`;
  }).join('');
  rowsEl.querySelectorAll('button[data-play]').forEach(b => {
    b.addEventListener('click', () => {
      playerEl.src = b.dataset.play;
      playerEl.style.display = 'block';
      playerEl.play().catch(() => { });
    });
  });
}

async function loadBrowse() {
  const r = await fetch('/api/music?limit=100');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const { items } = await r.json();
  render(items, `Visar ${items.length} låtar`);
}

function parseQuery(input) {
  const m = String(input).trim().match(/^(\w+)\s*:\s*(.+)$/);
  if (m) {
    const field = m[1].toLowerCase();
    const value = m[2];
    // nu stöds även 'year'
    if (['title', 'album', 'artist', 'genre', 'year', 'any'].includes(field)) {
      return { field, value };
    }
  }
  // Default: fri text över alla fält
  return { field: 'any', value: String(input).trim() };
}

async function doSearch() {
  const { field, value } = parseQuery(qEl.value);
  if (!value) return loadBrowse(); // tomt → startlista igen
  const r = await fetch(`/api/music-search/${encodeURIComponent(field)}/${encodeURIComponent(value)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const items = await r.json();
  render(items, `Visar ${items.length} träffar för ${field} contains "${value}"`);
}

// init
window.addEventListener('DOMContentLoaded', async () => {
  summaryEl.textContent = 'Laddar...';
  try { await loadBrowse(); }
  catch (e) { console.error(e); summaryEl.textContent = 'Kunde inte hämta startlistan'; }
});

qEl.addEventListener('input', () => {
  doSearch().catch(e => {
    console.error(e); summaryEl.textContent = 'Sökfel'; rowsEl.innerHTML = '';
  });
});
