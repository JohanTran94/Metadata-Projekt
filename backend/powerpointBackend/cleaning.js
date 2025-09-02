// Import the file system module (fs)
import fs from 'fs';

// change keys from snake_case to camelCase

function toCamelCaseKey(str) {
  return str.replace(/[_-](\w)/g, (_, c) => c.toUpperCase());
}

function keysToCamelCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToCamelCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      acc[toCamelCaseKey(key)] = keysToCamelCase(value);
      return acc;
    }, {});
  }
  return obj;
}

// Read the json string from file
let json = fs.readFileSync('./warehouse/dm23-powerpoints/csvjson.json', 'utf-8');

// Convert from a string to a real data structure
let data = JSON.parse(json);

let metadataListPowerpoint = [];

for (let powerpointMetadata of data) {

  // extract the file name (the property digest + '.ppt)
  let fileName = powerpointMetadata
    .digest + '.ppt'

  // add file name to attributes
  powerpointMetadata
    .file_name = fileName

  // clean mimetype and whitespace (also removes non-standard datatypes)
  let cleanedMimeType = (powerpointMetadata.mimetype || '')
    .replace(/^(application\/+)/, '')
    .trim();

  // add cleaned mime type to the metadata
  powerpointMetadata
    .mimetype = cleanedMimeType

  // remove unnecessary attributes
  delete powerpointMetadata.digest;
  delete powerpointMetadata.sha256;
  delete powerpointMetadata.sha512;
  delete powerpointMetadata.urlkey;
  delete powerpointMetadata.timestamp;

  let cleaned = keysToCamelCase(powerpointMetadata);

  metadataListPowerpoint
    .push(cleaned);

  // write to json file
  fs.writeFileSync(
    './backend/powerpointBackend/output/cleanedPowerpointJson.json',
    JSON.stringify(metadataListPowerpoint, null, 2),
    'utf-8'
  );

}