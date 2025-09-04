
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
        Sök på: <select name="ppt-meta-field">
        <option value="title">Titel</option>
        <option value="URL">URL</option>
        <option value="company">Företag</option>
        <option value="creation_date">Skapad datum</option>
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
  let select = event.target.closest('select[name="ppt-meta-field"]');
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
  let field = document.querySelector('select[name="ppt-meta-field"]').value;

  // hämta data från API
  let rawResponse = await fetch(
    `/api/ppt-search/${field}/${inputField.value}`
  );
  let result = await rawResponse.json();


  // rendera HTML
  let resultAsHtml = '';
  for (let { id, title, URL, company, creation_date } of result) {
    resultAsHtml += `
      <article>
        <h2>${title || 'Okänd titel'}</h2>
        <p><b>Företag:</b> ${company || 'Okänt företag'}</p>
        <p><b>Skapad:</b> ${creation_date || 'Okänt datum'}</p>
        <p><a href="${URL || '#'}" target="_blank">${URL || 'Ingen länk'}</a></p>
      </article>
    `;
  }

  document.querySelector('.ppt-search-result').innerHTML = resultAsHtml;
}


/*
//I need to figure out the search

// Grab the input field firstName
let searchField = document.querySelector('input[Title="title"]');


// Listen to when the user types a character in the field
searchField.addEventListener('keyup', async () => {
  // Read the value of the input field
  let searchValue = searchField.value;
  // Grab the main element
  let main = document.querySelector('main');
  // If the value is empty do not try to search
  // but empty the main element
  if (searchValue === '') {
    main.innerHTML = '';
    return;
  }

  
  // Ask the database to search for users via a REST-api route
  let rawData = await fetch('/api/powerpoint-search/' + searchValue);
  // Convert rawData from json to a js data structure
  let data = await rawData.json();

  // Convert the data to html
  let html = '';
for (let { title, URL, company, creation_date } of data) {
  html += `
    <article>
      <h2>${title}</h2>
      <p>${URL}</p>
      <p>${company}</p>
      <p>${creation_date}</p>
    </article>
  `;
}
  // Replace the content of the main element with
  // our new html (the data converted from json)
  main.innerHTML = html;
});
*/