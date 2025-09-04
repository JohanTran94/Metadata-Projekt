// Navigation in meny
document.body.addEventListener('click', event => {
  let navLink = event.target.closest('header nav a');
  if (!navLink) return;
  event.preventDefault();
  let linkText = navLink.textContent;
  showContent(linkText);
});

// Show Content based on menu selection
function showContent(label) {
  let content;
  if (label === 'Start') {
    content = `
      <h1>Start</h1>
      <p>Välkommen till vår PDF-sökmotor för metadata. Här kan du söka efter dokument baserat på titel, författare, ämne eller nyckelord.</p>
      <p>Kontakta <b>data manager</b> Thomas om du har fler PDF-filer att indexera. <a href="mailto:thomas@nodehill.com">thomas@nodehill.com</a></p>
    `;
  } else if (label === 'Sök PDF') {
    content = `
      <h1>Sök PDF</h1>
      <label>
        Sök på: <select name="pdf-meta-field">
          <option value="Title">Titel</option>
          <option value="Author">Author</option>
          <option value="Subject">Subject</option>
          <option value="Text">Text</option>
          <option value="Keywords">Keywords</option>
          <option value="Pages">Pages</option>
        </select>
      </label>
      <label>
        <input name="pdf-search" type="text" placeholder="Sök bland PDF-filer">
      </label>
      <p class="pdf-search-count">0 resultat</p> 
      <section class="pdf-search-result"></section>
    `;
  }
  document.querySelector('main').innerHTML = content;
}

// Show startpage by default
showContent('Start');

// search on keyup in input field
document.body.addEventListener('keyup', event => {
  let inputField = event.target.closest('input[name="pdf-search"]');
  if (!inputField) return;
  pdfSearch();
});

// search on change in select field
document.body.addEventListener('change', event => {
  let select = event.target.closest('select[name="pdf-meta-field"]');
  if (!select) return;
  pdfSearch();
});

// Show and hide all metadata for a PDF
document.body.addEventListener('click', async event => {
  let button = event.target.closest('.btn-show-all-pdf-metadata');
  if (!button) return;

  let nextElement = button.nextElementSibling;
  if (nextElement && nextElement.classList.contains('pdf-meta-block')) {
    nextElement.remove(); // hide metadata
    button.textContent = 'Visa all metadata';
    return;
  }

  let id = button.getAttribute('data-id');
  let rawResponse = await fetch('/api/pdf-all-meta/' + id);
  let result = await rawResponse.json();

  let pre = document.createElement('pre');
  pre.classList.add('pdf-meta-block');
  pre.innerHTML = JSON.stringify(result, null, 2);
  button.after(pre);
  button.textContent = 'Dölj metadata';
});

// search function for PDFs with highlighting and truncated text
async function pdfSearch() {
  let inputField = document.querySelector('input[name="pdf-search"]');
  let countElement = document.querySelector('.pdf-search-count');
  let resultContainer = document.querySelector('.pdf-search-result');

  let searchTerm = inputField.value.trim().toLowerCase();

  if (searchTerm === '') {
    resultContainer.innerHTML = '';
    countElement.textContent = '0 resultat';
    return;
  }

  let field = document.querySelector('select[name="pdf-meta-field"]').value;
  let rawResponse = await fetch(`/api/pdf-search/${field}/${searchTerm}`);
  let result = await rawResponse.json();

  const highlight = (text) => {
    if (!text) return '';
    return text.replace(new RegExp(`(${searchTerm})`, 'gi'), '<mark>$1</mark>');
  };

  const truncate = (text, maxLength = 500) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  let resultAsHtml = '';
  for (let { id, filename, title, author, subject, keywords, numpages, text } of result) {
    resultAsHtml += `
      <article>
        <h2>${highlight(title) || 'Ingen titel'}</h2>
        <p><b>Author:</b> ${highlight(author) || 'Okänd'}</p>
        <p><b>Subject:</b> ${highlight(subject) || 'Ej angivet'}</p>
        <p><b>Keywords:</b> ${highlight(keywords) || 'Inga'}</p>
        <p><b>Antal sidor:</b> ${numpages || 'Okänt'}</p>
        <p><b>Text:</b> ${highlight(truncate(text)) || 'Ingen text tillgänglig'}</p>
        <p><a href="/pdf/${filename}" download>Ladda ned PDF</a></p>
        <p><button class="btn-show-all-pdf-metadata" data-id="${id}">Visa all metadata</button></p>
      </article>
    `;
  }

  resultContainer.innerHTML = resultAsHtml;
  countElement.textContent = `${result.length} resultat`;
}