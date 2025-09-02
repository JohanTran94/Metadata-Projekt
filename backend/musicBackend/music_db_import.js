import fs from 'fs';
import path from 'path';
import * as musicMetadata from 'music-metadata';
import mysql from 'mysql2/promise';
import dbCredentials from './db.js';
import { fileURLToPath } from 'url'; //nödvändigt pga musikstruktur utanför projekt? ../music. Hur göra sen när allt ska i main? all data samlas för att köra adekvat.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const db = await mysql.createConnection({ ...dbCredentials });

// istället för manuellt
await db.execute(`
  CREATE TABLE IF NOT EXISTS musicJson (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    file VARCHAR(255) NOT NULL UNIQUE,
    meta JSON NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`);


const MUSIC_DIR = path.resolve(__dirname, '../../music');
const files = fs.readdirSync(MUSIC_DIR);

//await db.execute('DELETE FROM musicJson'); nice om man kastar in nya filer och vill uppdatera db

for (const file of files) {
  const fullPath = path.join(MUSIC_DIR, file);
  const metadata = await musicMetadata.parseFile(fullPath);
  const cleaned = { file, common: metadata.common, format: metadata.format };

  await db.execute(
    `INSERT INTO musicJson (file, meta)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE meta = VALUES(meta)`,
    [file, JSON.stringify(cleaned)]
  );
}

console.log('All metadata imported!');
await db.end();
process.exit();
