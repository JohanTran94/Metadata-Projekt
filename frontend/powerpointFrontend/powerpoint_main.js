// Grab the input field firstName
let inputField = document.querySelector('input[title="title"]');
// Listen to when the user types a character in the field
inputField.addEventListener('keyup', async () => {
  // Read the value of the input field
  let searchValue = inputField.value;
  // Grab the main element
  let main = document.querySelector('main');
  // If the value is empty do not try to search
  // but empty the main element
  if (searchValue === '') {
    main.innerHTML = '';
    return;
  }
  // Ask the database to search for users via a REST-api route
  let rawData = await fetch('/api/search-by-title/' + searchValue);
  // Convert rawData from json to a js data structure
  let data = await rawData.json();

  // Convert the data to html
  let html = '';
  for (let { id, title } of data) {
    html += `
      <article>
        <h2>${title}</h2>
      </article>
    `;
  }
  // Replace the content of the main element with
  // our new html (the data converted from json)
  main.innerHTML = html;
});
