
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
