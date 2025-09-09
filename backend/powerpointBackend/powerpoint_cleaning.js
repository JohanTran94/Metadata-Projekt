import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const INPUT_PATH = './warehouse/powerpoint/';
const CSV_FILE = path.join(INPUT_PATH, '_lcwa_gov_powerpoint_metadata.csv');
const OUTPUT_FILE = path.join(INPUT_PATH, 'cleanedPowerpointJson.json');

function toCamelCaseKey(str) {
  return str.replace(/[_-](\w)/g, (_, c) => c.toUpperCase());
}

function keysToCamelCase(obj) {
  if (Array.isArray(obj)) return obj.map(keysToCamelCase);
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      acc[toCamelCaseKey(key)] = keysToCamelCase(value);
      return acc;
    }, {});
  }
  return obj;
}


const csvBuffer = fs.readFileSync(CSV_FILE);
const csvContent = csvBuffer.toString('utf16le');

const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  delimiter: '\t',
  relax_column_count: true
});

const usedFileNames = new Set();

const metadataListPowerpoint = records.map(record => {

  let baseFileName = record.digest ? `${record.digest}.ppt` : 'unknown.ppt';
  let fileName = baseFileName;
  let counter = 1;
  while (usedFileNames.has(fileName)) {
    fileName = `${baseFileName.replace(/\.ppt$/, '')}_${counter}.ppt`;
    counter++;
  }
  usedFileNames.add(fileName);


  const cleaned = keysToCamelCase({
    original: record.original || null,
    mimetype: (record.mimetype || '').replace(/^application\/+/, '').trim(),
    title: record.title || null,
    organisation: record.company || null,
    fileName,
    creationDate: record.creation_date || null,
    lastModified: record.last_modified || null,
    revisionNumber: record.revision_number ? parseInt(record.revision_number, 10) : null,
    slideCount: record.slide_count ? parseInt(record.slide_count, 10) : null,
    wordCount: record.word_count ? parseInt(record.word_count, 10) : null,
    fileSize: record.file_size ? parseInt(record.file_size, 10) : null
  });

  return cleaned;
});


fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadataListPowerpoint, null, 2), 'utf-8');

console.log(`Processed ${metadataListPowerpoint.length} records. JSON saved to ${OUTPUT_FILE}`);