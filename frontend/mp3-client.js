const qEl = document.getElementById('q');       // sökruta
const fieldEl = document.getElementById('field'); // dropdown
const rowsEl = document.getElementById('rows');   // tabellkroppen
const summaryEl = document.getElementById('summary'); // summeringstext
const playerEl = document.getElementById('player');   // ljudspelare

function rowHtml(it) {
  const file = it.fileName || it.file;
  const url = `/music/${encodeURIComponent(file)}`;
  return `
    <tr>
      <td>${file}</td>
      <td>${it.title || ''}</td>
      <td>${it.artist || ''}</td>
      <td>${it.album || ''}</td>
      <td>${it.year || ''}</td>
      <td>${it.genre || ''}</td>
      <td>${it.kbps || ''}</td>
      <td><a href="${url}" download>Hämta</a></td>
      <td><button data-play="${url}">▶︎</button></td>
      <td><button class="btn-show-all-music-metadata" data-id="${it.id}">Visa metadata</button></td>
    </tr>`;
}

function render(items, label) {
  summaryEl.textContent = label || `Visar ${items.length} låtar`;
  rowsEl.innerHTML = items.map(rowHtml).join('');
}

// spela upp
rowsEl.addEventListener('click', e => {
  const btn = e.target.closest('button[data-play]');
  if (!btn) return;
  playerEl.src = btn.dataset.play;
  playerEl.style.display = 'block';
  playerEl.play();
});

// hämta JSON
async function fetchJson(url) {
  const r = await fetch(url);
  return r.json();
}

// lista 100 första som en start. Skönt nu pga se att alla specifika sök fungerar
async function loadBrowse() {
  const { items } = await fetchJson('/api/music?limit=100');
  render(items, `Visar ${items.length} låtar`);
}

// sök
async function doSearch() {
  const field = fieldEl.value;
  const value = qEl.value.trim();
  if (!value) return loadBrowse();
  const items = await fetchJson(`/api/music-search/${field}/${encodeURIComponent(value)}`);
  render(items, `Visar ${items.length} träffar för ${field} innehåller "${value}"`);
}

// sökning med 300ms fördröj
let t;
function debouncedSearch() {
  clearTimeout(t);
  t = setTimeout(doSearch, 300);
}


window.addEventListener('DOMContentLoaded', loadBrowse);

// visa metadata (samlad från /api/music-all-meta/:id)
document.body.addEventListener('click', async e => {
  const btn = e.target.closest('.btn-show-all-music-metadata');
  if (!btn) return;

  if (btn.nextElementSibling?.tagName === 'PRE') {
    btn.nextElementSibling.remove();
    return;
  }

  const r = await fetch('/api/music-all-meta/' + btn.dataset.id);
  let data = await r.json();
  if (Array.isArray(data)) data = data[0];

  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(data.meta || data, null, 2);
  btn.after(pre);
});

// input/dropdown
qEl.addEventListener('input', debouncedSearch);
fieldEl.addEventListener('change', debouncedSearch);
