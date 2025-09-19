import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import exifr from 'exifr';
import dbCreds from '../../db.js';
import { pathToFileURL } from 'url';


function dmsToDecFlexible(v, ref) {
  if (v == null) return null;

  if (typeof v === 'string') {
    const parts = v.split(/[;,\s]+/).filter(Boolean).map(Number);
    if (parts.length >= 3) v = parts.slice(0, 3);
    else return null;
  }

  if (Array.isArray(v)) {
    const [d, m, s] = v.map(Number);
    if (![d, m, s].every(Number.isFinite)) return null;
    const sign = (ref === 'S' || ref === 'W') ? -1 : 1;
    return sign * (d + m / 60 + s / 3600);
  }


  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const IMAGE_DIR = path.resolve(process.cwd(), 'warehouse/image');

function basename(p) { return p ? path.basename(String(p)) : null; }

export async function importImageMetadata() {
  const db = await mysql.createConnection({ ...dbCreds, namedPlaceholders: true });


  await db.execute(`
    CREATE TABLE IF NOT EXISTS image_metadata (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      file VARCHAR(512) NOT NULL,
      meta JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_file (file),
      INDEX idx_file (file)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.execute('DELETE FROM image_metadata');

  const files = fs.readdirSync(IMAGE_DIR).filter(f => /\.(jpe?g|tiff?|png|heic)$/i.test(f));
  const sql = `
    INSERT INTO image_metadata (file, meta)
    VALUES (:file, CAST(:meta AS JSON))
    ON DUPLICATE KEY UPDATE
      meta = VALUES(meta),
      updated_at = CURRENT_TIMESTAMP
  `;

  const errors = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const fullPath = path.join(IMAGE_DIR, file);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;

      const raw = await exifr.parse(fullPath, { tiff: true, ifd0: true, exif: true, gps: true, interop: true, xmp: true });

      const make = raw?.Make ?? raw?.make ?? null;
      const model = raw?.Model ?? raw?.model ?? null;
      const createDate = raw?.CreateDate ?? raw?.DateTimeOriginal ?? raw?.ModifyDate ?? null;
      let latitude = raw?.latitude ?? raw?.Latitude ?? null;
      let longitude = raw?.longitude ?? raw?.Longitude ?? null;

      if (latitude == null) latitude = dmsToDecFlexible(raw?.GPSLatitude, raw?.GPSLatitudeRef);
      if (longitude == null) longitude = dmsToDecFlexible(raw?.GPSLongitude, raw?.GPSLongitudeRef);

      const meta = {
        file_name: file,
        file_path: fullPath,
        size_bytes: stat.size,
        mtime_iso: stat.mtime.toISOString(),
        make,
        model,
        create_date: createDate ? new Date(createDate).toISOString() : null,
        latitude,
        longitude,
        raw
      };

      await db.execute(sql, { file, meta: JSON.stringify(meta) });

      process.stdout.write(`\r - Importing from ${i + 1} of ${files.length} image files...`);
    } catch (err) {
      errors.push(` - File: ${file} | Error: ${err.message}`);
    }
  }

  console.log(); // ny rad efter progress

  if (errors.length > 0) {
    const logDir = path.resolve(process.cwd(), 'backend/imageBackend/image_error_logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, "image_db_import_errors.log");
    fs.appendFileSync(logFile, [`--- Error log ${new Date().toISOString()} ---`, ...errors, ""].join("\n"));
    console.error(` - Database import error, see ${logFile} (${errors.length} st).`);
  } else {
    console.log(" - Image metadata import done.");
  }

  await db.end();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  importImageMetadata().catch(e => {
    console.error(' - Unexpected error:', e);
    process.exit(1);
  });
}
