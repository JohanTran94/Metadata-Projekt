
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const INPUT_PATH = './warehouse/ppt/';
const OUTPUT_FILE = path.join(INPUT_PATH, 'cleanedPptJson.json');

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

export async function runPptETL() {
  const csvFiles = fs.readdirSync(INPUT_PATH)
    .filter(f => f.endsWith('.csv'))
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(INPUT_PATH, f)).mtime.getTime()
    }));

  if (csvFiles.length === 0) throw new Error('No CSV-file found.');

  const latestCsv = csvFiles.sort((a, b) => b.mtime - a.mtime)[0].name;
  const CSV_PATH = path.join(INPUT_PATH, latestCsv);

  console.log(`Reading CSV: ${CSV_PATH}`);

  const csvBuffer = fs.readFileSync(CSV_PATH);
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

    return keysToCamelCase({
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
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadataListPowerpoint, null, 2), 'utf-8');
  console.log(`Processed ${metadataListPowerpoint.length} records. JSON saved to ${OUTPUT_FILE}`);
}

