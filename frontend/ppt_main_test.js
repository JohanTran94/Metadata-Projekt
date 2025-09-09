export function render(appEl) {
  appEl.innerHTML = `
    <section>
      <h2>Sök PowerPoint</h2>
      <div class="controls" style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
        <label>
          Sök på:
          <select id="ppt-field">
            <option value="fileName">Filnamn</option>
            <option value="title">Titel</option>
            <option value="original">URL</option>
            <option value="organisation">Organisation</option>
            <option value="creationDate">Skapad</option>
            <option value="any">Allt</option>
          </select>
        </label>
        <input id="ppt-q" type="text" placeholder="Sök bland PowerPoint-filer" />
        <label>
          Sortera på:
          <select id="ppt-sort">
            <option value="title">Titel</option>
            <option value="fileName">Filnamn</option>
            <option value="organisation">Organisation</option>
            <option value="creationDate">Skapad</option>
          </select>
        </label>
        <input id="ppt-limit" type="number" placeholder="Limit" style="width:60px;" value="100" />
        <button id="ppt-do">Sök</button>
      </div>
      <p id="ppt-count" class="muted" style="margin-top:8px;">0 resultat</p>
      <div style="margin-bottom:8px;">
        <button id="ppt-prev" disabled>&lt; Föregående</button>
        <button id="ppt-next" disabled>Nästa &gt;</button>
      </div>
      <section id="ppt-results"></section>
    </section>
  `;

  const fieldEl = appEl.querySelector('#ppt-field');
  const qEl = appEl.querySelector('#ppt-q');
  const sortEl = appEl.querySelector('#ppt-sort');
  const limitEl = appEl.querySelector('#ppt-limit');
  const doBtn = appEl.querySelector('#ppt-do');
  const prevBtn = appEl.querySelector('#ppt-prev');
  const nextBtn = appEl.querySelector('#ppt-next');
  const countEl = appEl.querySelector('#ppt-count');
  const resultsEl = appEl.querySelector('#ppt-results');

  let offset = 0;
  let lastResultCount = 0;

  async function search(newOffset = 0) {
    const field = fieldEl.value;
    const term = qEl.value.trim();
    const sortField = sortEl.value;
    const limit = Number(limitEl.value) || 100;

    offset = newOffset;

    if (!term && field !== 'any') {
      resultsEl.innerHTML = '';
      countEl.textContent = '0 resultat';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const url = `/api/ppt-search/${encodeURIComponent(field)}/${encodeURIComponent(term)}?limit=${limit}&offset=${offset}&sortField=${encodeURIComponent(sortField)}`;
    const res = await fetch(url);
    if (!res.ok) {
      resultsEl.innerHTML = `<div class="muted">Fel: ${res.status}</div>`;
      countEl.textContent = '0 resultat';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const data = await res.json();
    const rows = data.items || data;
    lastResultCount = rows.length;

    countEl.textContent = `${rows.length} resultat (Offset: ${offset})`;

    resultsEl.innerHTML = rows.map(r => {
      const fileName = r.fileName || '';
      const title = r.title || 'Okänd';
      const company = r.organisation || 'Okänt';
      const creationDate = r.creationDate || 'Okänt';
      const original = r.original || '';
      const localLink = fileName ? `<a href="/ppt/${encodeURIComponent(fileName)}" target="_blank" rel="noopener">Öppna lokalt</a>` : '';

      return `
        <article data-id="${r.id}">
          <p><b>Titel:</b> ${title}</p>
          <p><b>URL:</b> ${original ? `<a href="${original}" target="_blank" rel="noopener">${original}</a>` : 'Okänd'}</p>
          <p><b>Filnamn:</b> ${fileName || 'Okänt'} ${localLink ? `&nbsp;|&nbsp;${localLink}` : ''}</p>
          <p><b>Organisation:</b> ${company}</p>
          <p><b>Skapad:</b> ${creationDate}</p>
          <p><button class="btn-show-all-ppt-metadata">Show all metadata</button></p>
          <pre class="ppt-meta-block hidden"></pre>
        </article>
      `;
    }).join('');

    prevBtn.disabled = offset === 0;
    nextBtn.disabled = lastResultCount < limit;
  }

  doBtn.addEventListener('click', () => search(0));
  qEl.addEventListener('keyup', e => { if (e.key === 'Enter') search(0); });
  fieldEl.addEventListener('change', () => search(0));
  sortEl.addEventListener('change', () => search(0));
  limitEl.addEventListener('change', () => search(0));

  prevBtn.addEventListener('click', () => search(Math.max(0, offset - Number(limitEl.value))));
  nextBtn.addEventListener('click', () => search(offset + Number(limitEl.value)));

  resultsEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-show-all-ppt-metadata');
    if (!btn) return;

    const article = btn.closest('article');
    const pre = article.querySelector('.ppt-meta-block');
    const id = article.getAttribute('data-id');

    if (!pre.classList.contains('hidden')) {
      pre.textContent = '';
      pre.classList.add('hidden');
      btn.textContent = 'Show all metadata';
      return;
    }
    try {
      const res = await fetch(`/api/ppt/${encodeURIComponent(id)}`);
      const data = await res.json();
      pre.textContent = JSON.stringify(data, null, 2);
    } catch { pre.textContent = 'Kunde inte hämta metadata.'; }
    pre.classList.remove('hidden');
    btn.textContent = 'Hide metadata';
  });
}

export function cleanup() { }


/*
export function render(appEl) {
  appEl.innerHTML = `
    <section>
      <h2>Sök PowerPoint</h2>
      <div class="controls" style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
        <label>
          Sök på:
          <select id="ppt-field">
            <option value="fileName">Filnamn</option>
            <option value="title">Titel</option>
            <option value="original">URL</option>
            <option value="organisation">Organisation</option>
            <option value="creationDate">Skapad</option>
            <option value="any">Allt</option>
          </select>
        </label>
        <input id="ppt-q" type="text" placeholder="Sök bland PowerPoint-filer" />
        <label>
          Sortera på:
          <select id="ppt-sort">
            <option value="title">Titel</option>
            <option value="fileName">Filnamn</option>
            <option value="organisation">Organisation</option>
            <option value="creationDate">Skapad</option>
          </select>
        </label>
        <input id="ppt-limit" type="number" placeholder="Limit" style="width:60px;" value="100" />
        <button id="ppt-do">Sök</button>
      </div>
      <p id="ppt-count" class="muted" style="margin-top:8px;">0 resultat</p>
      <div style="margin-bottom:8px;">
        <button id="ppt-prev" disabled>&lt; Föregående</button>
        <button id="ppt-next" disabled>Nästa &gt;</button>
      </div>
      <section id="ppt-results"></section>
    </section>
  `;

  const fieldEl = appEl.querySelector('#ppt-field');
  const qEl = appEl.querySelector('#ppt-q');
  const sortEl = appEl.querySelector('#ppt-sort');
  const limitEl = appEl.querySelector('#ppt-limit');
  const doBtn = appEl.querySelector('#ppt-do');
  const prevBtn = appEl.querySelector('#ppt-prev');
  const nextBtn = appEl.querySelector('#ppt-next');
  const countEl = appEl.querySelector('#ppt-count');
  const resultsEl = appEl.querySelector('#ppt-results');

  let offset = 0;
  let lastResultCount = 0;

  async function search(newOffset = 0) {
    const field = fieldEl.value;
    const term = qEl.value.trim();
    const sortField = sortEl.value;
    const limit = Number(limitEl.value) || 100;

    offset = newOffset;

    if (!term && field !== 'any') {
      resultsEl.innerHTML = '';
      countEl.textContent = '0 resultat';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const url = `/api/ppt-search/${encodeURIComponent(field)}/${encodeURIComponent(term)}?limit=${limit}&offset=${offset}&sortField=${encodeURIComponent(sortField)}`;
    const res = await fetch(url);
    if (!res.ok) {
      resultsEl.innerHTML = `<div class="muted">Fel: ${res.status}</div>`;
      countEl.textContent = '0 resultat';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const data = await res.json();
    const rows = data.items || data;
    lastResultCount = rows.length;

    countEl.textContent = `${rows.length} resultat (Offset: ${offset})`;

    resultsEl.innerHTML = rows.map(r => {
      const fileName = r.fileName || '';
      const title = r.title || 'Okänd';
      const company = r.organisation || 'Okänt';
      const creationDate = r.creationDate || 'Okänt';
      const original = r.original || '';
      const localLink = fileName ? `<a href="/ppt/${encodeURIComponent(fileName)}" target="_blank" rel="noopener">Öppna lokalt</a>` : '';

      return `
        <article data-id="${r.id}">
          <p><b>Titel:</b> ${title}</p>
          <p><b>URL:</b> ${original ? `<a href="${original}" target="_blank" rel="noopener">${original}</a>` : 'Okänd'}</p>
          <p><b>Filnamn:</b> ${fileName || 'Okänt'} ${localLink ? `&nbsp;|&nbsp;${localLink}` : ''}</p>
          <p><b>Organisation:</b> ${company}</p>
          <p><b>Skapad:</b> ${creationDate}</p>
          <p><button class="btn-show-all-ppt-metadata">Show all metadata</button></p>
          <pre class="ppt-meta-block hidden"></pre>
        </article>
      `;
    }).join('');

    
    prevBtn.disabled = offset === 0;
    nextBtn.disabled = lastResultCount < limit;
  }

  doBtn.addEventListener('click', () => search(0));
  qEl.addEventListener('keyup', e => { if (e.key === 'Enter') search(0); });
  fieldEl.addEventListener('change', () => search(0));
  sortEl.addEventListener('change', () => search(0));
  limitEl.addEventListener('change', () => search(0));

  prevBtn.addEventListener('click', () => search(Math.max(0, offset - Number(limitEl.value))));
  nextBtn.addEventListener('click', () => search(offset + Number(limitEl.value)));

  resultsEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-show-all-ppt-metadata');
    if (!btn) return;

    const article = btn.closest('article');
    const pre = article.querySelector('.ppt-meta-block');
    const id = article.getAttribute('data-id');

    if (!pre.classList.contains('hidden')) {
      pre.textContent = '';
      pre.classList.add('hidden');
      btn.textContent = 'Show all metadata';
      return;
    }
    try {
      const res = await fetch(`/api/ppt/${encodeURIComponent(id)}`);
      const data = await res.json();
      pre.textContent = JSON.stringify(data, null, 2);
    } catch { pre.textContent = 'Kunde inte hämta metadata.'; }
    pre.classList.remove('hidden');
    btn.textContent = 'Hide metadata';
  });
}

export function cleanup() { }
*/
