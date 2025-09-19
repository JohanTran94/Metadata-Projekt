


import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse-fork';
import mysql from 'mysql2/promise';
import dbConfig from '../../db.js';

const PDF_DIR = path.resolve(process.cwd(), './warehouse/pdf');

export async function importPdfMetadata() {
  const db = await mysql.createConnection({ ...dbConfig });
  db.config.namedPlaceholders = true;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pdf_metadata (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255),
      numpages INT,
      text LONGTEXT,
      xmp JSON,
      info JSON
    )
  `);

  await db.execute('DELETE FROM pdf_metadata');

  const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const buffer = fs.readFileSync(path.join(PDF_DIR, file));
      const metadata = await pdfParse(buffer);


      metadata.xmp = metadata.metadata?._metadata || {};
      delete metadata.metadata;
      for (let key in metadata.xmp) {
        const simplifiedKey = key.includes(':') ? key.split(':')[1] : key;
        metadata.xmp[simplifiedKey] = metadata.xmp[key];
        delete metadata.xmp[key];
      }

      const textSnippet = metadata.text?.trim().slice(0, 500) || '';
      const numPages = metadata.numpages || null;
      const xmpJson = JSON.stringify(metadata.xmp || {});
      const infoJson = JSON.stringify(metadata.info || {});

      await db.execute(
        `INSERT INTO pdf_metadata (filename, numpages, text, xmp, info)
         VALUES (:filename, :numpages, :text, :xmp, :info)`,
        { filename: file, numpages: numPages, text: textSnippet, xmp: xmpJson, info: infoJson }
      );

      process.stdout.write(`\r - Importing from ${i + 1} of ${files.length} PDF files...`);
    } catch (err) {
      errors.push(` - File: ${file} | Error: ${err.message}`);
    }
  }

  console.log();

  if (errors.length > 0) {
    const logDir = path.resolve(process.cwd(), 'backend/pdfBackend/pdf_error_logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, "pdf_db_import_errors.log");
    fs.appendFileSync(logFile, [`--- Error log ${new Date().toISOString()} ---`, ...errors, ""].join("\n"));
    console.error(` - Database import error, see ${logFile} (${errors.length} st).`);
  } else {
    console.log(" - PDF metadata import done.");
  }

  await db.end();
}

