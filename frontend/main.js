// Navigera via meny
document.body.addEventListener('click', event => {
  let navLink = event.target.closest('header nav a');
  if (!navLink) return;
  event.preventDefault();
  let linkText = navLink.textContent;
  showContent(linkText);
});

// Visa innehåll beroende på menyval
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
          <option value="Keywords">Keywords</option>
          <option value="Pages">Pages</option> <!-- ✅ Nytt alternativ -->
        </select>
      </label>
      <label>
        <input name="pdf-search" type="text" placeholder="Sök bland PDF-filer">
      </label>
      <section class="pdf-search-result"></section>
    `;
  }
  document.querySelector('main').innerHTML = content;
}

// Visa startsidan direkt
showContent('Start');

// Sök vid tangenttryckning
document.body.addEventListener('keyup', event => {
  let inputField = event.target.closest('input[name="pdf-search"]');
  if (!inputField) return;
  pdfSearch();
});

// Sök vid ändring av fält
document.body.addEventListener('change', event => {
  let select = event.target.closest('select[name="pdf-meta-field"]');
  if (!select) return;
  pdfSearch();
});

// Visa eller dölj all metadata för en PDF
document.body.addEventListener('click', async event => {
  let button = event.target.closest('.btn-show-all-pdf-metadata');
  if (!button) return;

  let nextElement = button.nextElementSibling;
  if (nextElement && nextElement.classList.contains('pdf-meta-block')) {
    nextElement.remove(); // Döljer metadata
    button.textContent = 'Show all metadata';
    return;
  }

  let id = button.getAttribute('data-id');
  let rawResponse = await fetch('/api/pdf-all-meta/' + id);
  let result = await rawResponse.json();

  let pre = document.createElement('pre');
  pre.classList.add('pdf-meta-block');
  pre.innerHTML = JSON.stringify(result, null, 2);
  button.after(pre);
  button.textContent = 'Hide all metadata';
});

// Sökfunktion för PDF
async function pdfSearch() {
  let inputField = document.querySelector('input[name="pdf-search"]');
  if (inputField.value === '') {
    document.querySelector('.pdf-search-result').innerHTML = '';
    return;
  }
  let field = document.querySelector('select[name="pdf-meta-field"]').value;
  let rawResponse = await fetch(`/api/pdf-search/${field}/${inputField.value}`);
  let result = await rawResponse.json();

  let resultAsHtml = '';
  for (let { id, filename, title, author, subject, keywords, numpages } of result) {
    resultAsHtml += `
      <article>
        <h2>${title || 'Ingen titel'}</h2>
        <p><b>Author:</b> ${author || 'Unknowned'}</p>
        <p><b>Subject:</b> ${subject || 'Not specified'}</p>
        <p><b>Keywords:</b> ${keywords || 'None'}</p>
        <p><b>Numbers of pages:</b> ${numpages || 'unknowned'}</p> <!-- ✅ Nytt fält -->
        <p><a href="/pdf/${filename}" download>Ladda ned PDF</a></p>
        <p><button class="btn-show-all-pdf-metadata" data-id="${id}">Visa all metadata</button></p>
      </article>
    `;
  }
  document.querySelector('.pdf-search-result').innerHTML = resultAsHtml;
}