const qEl = document.getElementById('q');
const rows = document.getElementById('rows');
const summary = document.getElementById('summary');
const player = document.getElementById('player');

async function search(q = '') {
  try {
    const url = '/api/mp3/raw?' + new URLSearchParams({ q, limit: 500 });
    console.log('FETCH:', url);
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status} – ${txt}`);
    }
    const data = await res.json();
    console.log('DATA:', data);

    const { items = [], total = items.length } = data;
    summary.textContent = `Visar ${items.length} av ${total} låtar`;

    rows.innerHTML = items.map(it => `
      <tr>
        <td>${it.file}</td>
        <td>${it.common?.title ?? ''}</td>
        <td>${it.common?.artist ?? ''}</td>
        <td>${it.common?.album ?? ''}</td>
        <td>${it.common?.year ?? ''}</td>
        <td>${Array.isArray(it.common?.genre) ? it.common.genre.join(', ') : (it.common?.genre ?? '')}</td>
        <td>${it.format?.bitrate ? Math.round(it.format.bitrate / 1000) : ''}</td>
        <td><a href="/music/${encodeURIComponent(it.file)}" download>⬇️</a></td>
        <td><button class="play" type="button" data-src="/music/${encodeURIComponent(it.file)}">▶</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('SEARCH ERROR:', err);
    summary.textContent = 'Kunde inte ladda data. Kolla konsolen.';
    rows.innerHTML = '';
  }
}

// debounce
let t;
qEl.addEventListener('input', () => {
  clearTimeout(t);
  t = setTimeout(() => search(qEl.value.trim()), 250);
});

// spela upp
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.play');
  if (!btn) return;
  const src = btn.dataset.src;
  if (player.style.display === 'none') player.style.display = 'block';
  const abs = new URL(src, location.href).href;
  if (player.src !== abs) player.src = src;
  player.play();
});

// init
search('');
