// Import the file system module
import fs from 'fs';

let json = JSON.parse(fs.readFileSync('powerpoint.json', 'utf8'));
console.log(json);

/*

import { readdir } from 'fs/promises';
import path from 'path';
import { parseFile } from 'music-metadata';

const files = await readdir(path.resolve(process.cwd(), '../music'));

for (const file of files) {
  if (!file.toLowerCase().endsWith('.mp3')) continue;
  const full = path.resolve(process.cwd(), '../music', file);
  const metadata = await parseFile(full);
  console.log('');
  console.log(file);
  console.log(metadata);
}

/*

// Create a new array for metadata
let metadataList = [];

// Loop through the files
for (let file of files) {
 // Get the meta data
 let metadata = await exifr.parse('./images/' + file);
 // Add the filename and the metadata to our meta data list
 metadataList.push({ file, metadata });
}

// Serialize the data to JSON
let json = JSON.stringify(metadataList, null, '  ');

// Log the list of metadata
// console.log(json);

// Remember the start time (ms)
let startTime = Date.now();

// Save the json as a file
// (write json to the file metadata.json
// using character encoding utf-8)
fs.writeFileSync('./metadata.json', json, 'utf-8');

// Remember the end time (ms)
let endTime = Date.now();

console.log('Time taken (ms)', endTime - startTime);

*/