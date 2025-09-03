import fs from 'fs';
import pdfParse from 'pdf-parse-fork';
import mysql from 'mysql2/promise';
import dbConfig from '../../db.js';

const pathToPdfs = './frontend/pdf';

const importMetadata = async () => {
  const db = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
  });

  // Skapa tabell om den inte finns
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

  const files = fs
    .readdirSync(pathToPdfs)
    .filter(file => file.endsWith('.pdf'));

  for (let file of files) {
    const buffer = fs.readFileSync(`${pathToPdfs}/${file}`);
    const metadata = await pdfParse(buffer);

    // Förenkla XMP
    metadata.xmp = metadata.metadata._metadata;
    delete metadata.metadata;

    for (let key in metadata.xmp) {
      const simplifiedKey = key.split(':')[1];
      metadata.xmp[simplifiedKey] = metadata.xmp[key];
      delete metadata.xmp[key];
    }

    const textSnippet = metadata.text.trim().slice(0, 500);
    const numPages = metadata.numpages || null;
    const xmpJson = JSON.stringify(metadata.xmp || {});
    const infoJson = JSON.stringify(metadata.info || {});

    await db.execute(
      `INSERT INTO pdf_metadata (filename, numpages, text, xmp, info)
       VALUES (?, ?, ?, ?, ?)`,
      [file, numPages, textSnippet, xmpJson, infoJson]
    );

    console.log(`Importerad: ${file}`);
  }

  await db.end();
  console.log('Importen är klar!');
};

importMetadata().catch(err => {
  console.error('Fel vid import:', err);
});