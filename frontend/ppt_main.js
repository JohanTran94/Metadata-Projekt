
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
            <option value="company">Organisation</option>
            <option value="creationDate">Skapad</option>
          </select>
        </label>
        <input id="ppt-q" type="text" placeholder="Sök bland PowerPoint-filer" />
        <button id="ppt-do">Sök</button>
      </div>
 
      <p id="ppt-count" class="muted" style="margin-top:8px;">0 resultat</p>
      <section id="ppt-results"></section>
    </section>
  `;

  const fieldEl = appEl.querySelector('#ppt-field');
  const qEl = appEl.querySelector('#ppt-q');
  const doBtn = appEl.querySelector('#ppt-do');
  const countEl = appEl.querySelector('#ppt-count');
  const resultsEl = appEl.querySelector('#ppt-results');

  async function search() {
    const field = fieldEl.value;
    const term = qEl.value.trim();
    if (!term) {
      resultsEl.innerHTML = '';
      countEl.textContent = '0 resultat';
      return;
    }
    const res = await fetch(`/api/ppt-search/${encodeURIComponent(field)}/${encodeURIComponent(term)}`);
    if (!res.ok) {
      resultsEl.innerHTML = `<div class="muted">Fel: ${res.status}</div>`;
      countEl.textContent = '0 resultat';
      return;
    }
    const rows = await res.json();
    countEl.textContent = `${rows.length} resultat`;

    resultsEl.innerHTML = rows.map(r => {
      const fileName = r.fileName || '';
      const title = r.title || 'Okänd';
      const company = r.company || 'Okänt';
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
  }

  doBtn.addEventListener('click', search);
  qEl.addEventListener('keyup', e => { if (e.key === 'Enter') search(); });
  fieldEl.addEventListener('change', search);


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
      const res = await fetch(`/api/ppt-all-meta/${encodeURIComponent(id)}`);
      const data = await res.json();
      pre.textContent = JSON.stringify(data, null, 2);
    } catch { pre.textContent = 'Kunde inte hämta metadata.'; }
    pre.classList.remove('hidden');
    btn.textContent = 'Hide metadata';
  });
}

export function cleanup() { /* optional */ }

/*
document.body.addEventListener('click', event => {
  let navLink = event.target.closest('header nav a');
  if (!navLink) { return; }
  event.preventDefault();
  let linkText = navLink.textContent;
  showContent(linkText);
});

function showContent(label) {
  let content;
  if (label === 'Start') {
    content = `
      <h1>Start</h1>
      <p>Välkommen till metadata-sök.</p>
    `;
  }
  else if (label === 'Sök PowerPoint') {
    content = `
      <h1>Sök PowerPoint</h1>
      <label>
        Sök på: <select name="ppt-dropdown-field">
        <option value="fileName">Filnamn</option>
        <option value="title">Titel</option>
        <option value="original">URL</option>
        <option value="company">Organisation</option>
        <option value="creationDate">Skapad</option>
      </select>
      </label>
      <label>
        <input name="ppt-search" type="text" placeholder="Sök bland PowerPoint-filer">
      </label>
      <section class="ppt-search-result"></section>
    `;
  }
  document.querySelector('main').innerHTML = content;
}

// Startvy
showContent('Sök PowerPoint');

// Lyssna på inputfält
document.body.addEventListener('keyup', event => {
  let inputField = event.target.closest('input[name="ppt-search"]');
  if (!inputField) { return; }
  pptSearch();
});

// Lyssna på dropdown
document.body.addEventListener('change', event => {
  let select = event.target.closest('select[name="ppt-dropdown-field"]');
  if (!select) { return; }
  pptSearch();
});

// Funktion för att söka
async function pptSearch() {
  let inputField = document.querySelector('input[name="ppt-search"]');
  if (inputField.value === '') {
    document.querySelector('.ppt-search-result').innerHTML = '';
    return;
  }

  // hämta valt fält
  let field = document.querySelector('select[name="ppt-dropdown-field"]').value;

  // hämta data från API
  let rawResponse = await fetch(
    `/api/ppt-search/${field}/${inputField.value}`
  );

  let result = await rawResponse.json();

  // rendera HTML
  let resultAsHtml = '';
  for (let { id, fileName, title, original, company, creationDate } of result) {
    resultAsHtml += `
      <article>
        <p><b>Titel: ${title || 'Okänd'}</p>
        <p><b>URL: <a href="${original || '#'}" target="_blank">${original || 'Okänd'}</a></p>
        <p><b>Filnamn:</b> ${fileName || 'Okänt'}</p>
        <p><b>Organisation:</b> ${company || 'Okänt'}</p>
        <p><b>Skapad:</b> ${creationDate || 'Okänt'}</p>
        
      </article>
    `;
  }

  document.querySelector('.ppt-search-result').innerHTML = resultAsHtml;
}

*/
