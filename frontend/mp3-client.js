const qEl = document.getElementById('q');       // sökruta
const fieldEl = document.getElementById('field'); // dropdown
const rowsEl = document.getElementById('rows');
const summaryEl = document.getElementById('summary');
const playerEl = document.getElementById('player');   // spela upp

function rowHtml({ fileName, file, title, artist, album, year, genre, id }) {   // Skapar tabellstruktur för varje låt 
  const realFile = fileName || file;
  const url = `/music/${encodeURIComponent(realFile)}`;
  return `
    <tr>
      <td>${realFile}</td>
      <td>${title || ''}</td>
      <td>${artist || ''}</td>
      <td>${album || ''}</td>
      <td>${year || ''}</td>
      <td>${genre || ''}</td>
      <td><a href="${url}" download>Hämta</a></td>
      <td><button data-play="${url}">▶︎</button></td>
      <td><button class="btn-show-all-music-metadata" data-id="${id}">Visa metadata</button></td>
    </tr>`;
}

function render(items, label) {
  summaryEl.textContent = label || `Visar ${items.length} låtar`; // X sökträff genererar ett result 
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

// hämta JSON och visa det i läsaren
async function fetchJson(url) {
  const r = await fetch(url);
  return r.json();
}

// lista 100 första som en start
async function loadBrowse() {
  const { items } = await fetchJson('/api/music?limit=100');
  render(items, `Visar ${items.length} låtar`);
}

// sök
async function doSearch() {
  const field = fieldEl.value; //fälten som visas 
  const value = qEl.value.trim(); // innehåller från sökrutan
  if (!value) return loadBrowse(); // tomt---> mina 100 första 
  const items = await fetchJson(`/api/music-search/${field}/${encodeURIComponent(value)}`);
  render(items, `Visar ${items.length} träffar för ${field} innehåller "${value}"`);
}

// sökning med 200ms fördröj
let t;
function debouncedSearch() {
  clearTimeout(t);
  t = setTimeout(doSearch, 200);
}

window.addEventListener('DOMContentLoaded', loadBrowse); //100 första vid start av sidan. Möjliggör att testa enkelt 

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

// input/dropdown/sök fungerar
qEl.addEventListener('input', debouncedSearch);
fieldEl.addEventListener('change', debouncedSearch);
