// frontend/mp3-client.js
const qEl = document.getElementById('q');
const rowsEl = document.getElementById('rows');
const summaryEl = document.getElementById('summary');
const playerEl = document.getElementById('player');

// Enkel parser: "artist:abba" → { field: "artist", value: "abba" }
// annars → { field: "title", value: hela strängen }
function parseQuery(input) {
  const m = String(input).trim().match(/^(\w+)\s*:\s*(.+)$/);
  if (m) {
    const field = m[1].toLowerCase();
    const value = m[2];
    if (['title', 'album', 'artist', 'genre'].includes(field)) {
      return { field, value };
    }
  }
  return { field: 'title', value: String(input).trim() };
}

function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function searchAndRender() {
  const raw = qEl.value;
  const { field, value } = parseQuery(raw);

  // Tom sökning? Visa inget (eller välj en standard)
  if (!value) {
    rowsEl.innerHTML = '';
    summaryEl.textContent = 'Skriv t.ex. "artist:abba" eller "thriller"';
    return;
  }

  try {
    const url = `/api/music-search/${encodeURIComponent(field)}/${encodeURIComponent(value)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `HTTP ${res.status}`);
    }
    const items = await res.json();

    summaryEl.textContent = `Visar ${items.length} träffar för ${field} contains "${value}"`;

    rowsEl.innerHTML = items.map(it => {
      const file = it.fileName ?? '';
      const title = it.title ?? '';
      const artist = it.artist ?? '';
      const album = it.album ?? '';
      const year = it.year ?? '';
      const kbps = it.kbps ?? '';
      const fileUrl = `/music/${encodeURIComponent(file)}`;

      return `
        <tr>
          <td>${file}</td>
          <td>${title}</td>
          <td>${artist}</td>
          <td>${album}</td>
          <td>${year}</td>
          <td>${it.genre ?? ''}</td>
          <td>${kbps}</td>
          <td><a href="${fileUrl}" download>Hämta</a></td>
          <td><button data-play="${fileUrl}">▶︎</button></td>
        </tr>
      `;
    }).join('');

    // koppla play-knappar efter render
    rowsEl.querySelectorAll('button[data-play]').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-play');
        playerEl.src = url;
        playerEl.style.display = 'block';
        playerEl.play().catch(() => { }); // tysta ev. autoplay-block
      });
    });

  } catch (err) {
    console.error('Sökfel:', err);
    summaryEl.textContent = `Fel: ${err.message}`;
    rowsEl.innerHTML = '';
  }
}

qEl.addEventListener('input', debounce(searchAndRender, 250));
window.addEventListener('DOMContentLoaded', () => {
  summaryEl.textContent = 'Skriv t.ex. "artist:abba" eller bara "abba" (söker i titel som standard)';
});
