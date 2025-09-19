import fs from 'fs';
import path from 'path';
import * as musicMetadata from 'music-metadata';
import mysql from 'mysql2/promise';
import dbCredentials from '../../db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MUSIC_DIR = path.resolve(__dirname, '../../warehouse/music');

export async function importMusicMetadata() {
  const db = await mysql.createConnection({ ...dbCredentials });
  db.config.namedPlaceholders = true;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS musicJson (
      id INT AUTO_INCREMENT PRIMARY KEY,
      file VARCHAR(255) NOT NULL UNIQUE,
      meta JSON NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.execute('DELETE FROM musicJson');

  const files = fs.readdirSync(MUSIC_DIR).filter(f => /\.(mp3|flac|m4a|wav|ogg)$/i.test(f));
  const sql = `
    INSERT INTO musicJson (file, meta)
    VALUES (:file, CAST(:meta AS JSON))
    ON DUPLICATE KEY UPDATE
      meta = VALUES(meta)
  `;

  const errors = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const fullPath = path.join(MUSIC_DIR, file);
      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) continue;

      const metadata = await musicMetadata.parseFile(fullPath);
      const cleaned = {
        file,
        common: metadata.common,
        format: metadata.format,
        size_bytes: stats.size,
        mtime_iso: stats.mtime.toISOString()
      };

      await db.execute(sql, { file, meta: JSON.stringify(cleaned) });
      process.stdout.write(`\r - Importing from ${i + 1} of ${files.length} music files...`);
    } catch (err) {
      errors.push(` - File: ${file} | Error: ${err.message}`);
    }
  }

  console.log(); // ny rad efter progress

  if (errors.length > 0) {
    const logDir = path.resolve(process.cwd(), 'backend/musicBackend/music_error_logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, "music_db_import_errors.log");
    fs.appendFileSync(logFile, [`--- Error log ${new Date().toISOString()} ---`, ...errors, ""].join("\n"));
    console.error(` - Database import error, see ${logFile} (${errors.length} st).`);
  } else {
    console.log(" - Music metadata import done.");
  }

  await db.end();
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  importMusicMetadata().catch((e) => {
    console.error(' - Unexpected error:', e);
    process.exit(1);
  });
}

