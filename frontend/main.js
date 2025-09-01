// Read data from the json file metadata
let metadataRaw = await fetch('/api/metadata');
// Convert from json to a js data structure
let metadata = await metadataRaw.json();

// Path to pdf folder
let pdfFolder = 'all-pdfs';

// loop through every pdf in the metadata
for (let { file, numpages, info, xmp, text } of metadata) {

  // create a info table for each pdf
  let htmlTable = '<table>';

  htmlTable += `<tr>
    <td colspan="2">
      <a target="_blank" href="${pdfFolder}/${file}">Link to PDF</a>
    </td>
  </tr>`;
  htmlTable += `<tr>
    <td>Number of pages:</td>
    <td>${numpages}</td>
  </tr>`;
  htmlTable += `
    <tr><td colspan="2">
      <b>Text extract:</b><br>
      ${text || 'No text (maybe a scanned document)'}
    </td></tr>
  `;
  htmlTable += `<tr><td colspan="2">
    <b>Info (old type of metadata)</b>
  </td></tr>`;
  for (let key in info) {
    let value = info[key];
    htmlTable += `<tr>
      <td>${key}</td>
      <td>${value}</td>
    </tr>`;
  }
  if (Object.keys(xmp).length !== 0) {
    htmlTable += `<tr><td colspan="2">
    <b>XMP (new type of metadata)</b>
  </td></tr>`;
    for (let key in xmp) {
      let value = xmp[key];
      htmlTable += `<tr>
      <td>${key}</td>
      <td>${value}</td>
    </tr>`;
    }
  }
  htmlTable += '</table>';

  // create an article element (tag)
  let article = document.createElement('article');

  // add content tto the article
  article.innerHTML = htmlTable;
  // add the article to the main element
  document.querySelector('main').append(article);
}