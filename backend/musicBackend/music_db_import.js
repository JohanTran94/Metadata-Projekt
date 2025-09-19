import fs from 'fs';
import path from 'path';
import * as musicMetadata from 'music-metadata'; // Library to parse audio file metadata (tags, format, etc.)
import mysql from 'mysql2/promise';
import dbCredentials from '../../db.js';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES module environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the music warehouse directory
const MUSIC_DIR = path.resolve(__dirname, '../../warehouse/music');

/**
 * Import all music metadata into the MySQL database.
 * Steps:
 *   1. Connect to DB and ensure the musicJson table exists.
 *   2. Delete old records.
 *   3. Loop through files in MUSIC_DIR, parse metadata, and insert into DB.
 *   4. Log any errors into a dedicated error log file.
 */
export async function importMusicMetadata() {
  const db = await mysql.createConnection({ ...dbCredentials });
  db.config.namedPlaceholders = true;

  // Create table if it doesn’t exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS musicJson (
      id INT AUTO_INCREMENT PRIMARY KEY,
      file VARCHAR(255) NOT NULL UNIQUE,
      meta JSON NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Clean old data before importing
  await db.execute('DELETE FROM musicJson');

  // Only accept audio files with specific extensions
  const files = fs.readdirSync(MUSIC_DIR).filter(f => /\.(mp3|flac|m4a|wav|ogg)$/i.test(f));

  const sql = `
    INSERT INTO musicJson (file, meta)
    VALUES (:file, CAST(:meta AS JSON))
    ON DUPLICATE KEY UPDATE
      meta = VALUES(meta)
  `;

  const errors = [];

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const fullPath = path.join(MUSIC_DIR, file);
      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) continue;

      // Extract metadata from file
      const metadata = await musicMetadata.parseFile(fullPath);

      // Keep only important fields (cleaned version)
      const cleaned = {
        file,
        common: metadata.common,   // Standard tags (title, artist, album, year, genre, etc.)
        format: metadata.format,   // Technical info (codec, duration, bitrate, etc.)
        size_bytes: stats.size,    // File size
        mtime_iso: stats.mtime.toISOString() // Last modified time
      };

      // Insert into DB
      await db.execute(sql, { file, meta: JSON.stringify(cleaned) });

      // Print progress in console
      process.stdout.write(`\r - Importing from ${i + 1} of ${files.length} music files...`);
    } catch (err) {
      errors.push(` - File: ${file} | Error: ${err.message}`);
    }
  }

  console.log(); // Print a new line after progress loop

  // If there were errors → log them into a file
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

// Allow running directly via CLI: `node backend/musicBackend/music_db_import.js`
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  importMusicMetadata().catch((e) => {
    console.error(' - Unexpected error:', e);
    process.exit(1);
  });
}
