import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import exifr from 'exifr';                  // Library to extract EXIF, GPS, and XMP metadata from images
import dbCreds from '../../db.js';
import { pathToFileURL } from 'url';

/**
 * Convert GPS coordinates in DMS (Degrees, Minutes, Seconds) or other formats to decimal.
 * Handles:
 *   - String input: "59; 20; 30" or "59 20 30"
 *   - Array input: [deg, min, sec]
 *   - Direct number
 * Applies negative sign if ref is 'S' or 'W'.
 */
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

// Path to the image warehouse
const IMAGE_DIR = path.resolve(process.cwd(), 'warehouse/image');

// Utility: safely get basename from a path
function basename(p) { return p ? path.basename(String(p)) : null; }

/**
 * Import image metadata into MySQL.
 * Steps:
 *   1. Connect to DB and ensure `image_metadata` table exists.
 *   2. Delete old records (fresh import).
 *   3. Loop through supported image files.
 *   4. Extract EXIF/XMP/GPS metadata with exifr.
 *   5. Normalize values (make, model, creation date, lat/lon).
 *   6. Insert into DB as JSON.
 *   7. Log errors if any occur.
 */
export async function importImageMetadata() {
  const db = await mysql.createConnection({ ...dbCreds, namedPlaceholders: true });

  // Ensure the table exists with required columns
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

  // Clear old records
  await db.execute('DELETE FROM image_metadata');

  // Select only supported image formats
  const files = fs.readdirSync(IMAGE_DIR).filter(f => /\.(jpe?g|tiff?|png|heic)$/i.test(f));

  const sql = `
    INSERT INTO image_metadata (file, meta)
    VALUES (:file, CAST(:meta AS JSON))
    ON DUPLICATE KEY UPDATE
      meta = VALUES(meta),
      updated_at = CURRENT_TIMESTAMP
  `;

  const errors = [];

  // Process each image
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const fullPath = path.join(IMAGE_DIR, file);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;

      // Extract metadata with exifr (TIFF, IFD0, EXIF, GPS, Interop, XMP)
      const raw = await exifr.parse(fullPath, {
        tiff: true, ifd0: true, exif: true, gps: true, interop: true, xmp: true
      });

      // Normalize important fields
      const make = raw?.Make ?? raw?.make ?? null;
      const model = raw?.Model ?? raw?.model ?? null;
      const createDate = raw?.CreateDate ?? raw?.DateTimeOriginal ?? raw?.ModifyDate ?? null;

      let latitude = raw?.latitude ?? raw?.Latitude ?? null;
      let longitude = raw?.longitude ?? raw?.Longitude ?? null;

      // If not available, convert from GPS DMS
      if (latitude == null) latitude = dmsToDecFlexible(raw?.GPSLatitude, raw?.GPSLatitudeRef);
      if (longitude == null) longitude = dmsToDecFlexible(raw?.GPSLongitude, raw?.GPSLongitudeRef);

      // Build metadata object
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

      // Insert into DB
      await db.execute(sql, { file, meta: JSON.stringify(meta) });

      process.stdout.write(`\r - Importing from ${i + 1} of ${files.length} image files...`);
    } catch (err) {
      errors.push(` - File: ${file} | Error: ${err.message}`);
    }
  }

  console.log(); // Print new line after progress

  // If errors occurred → log them
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

// Allow direct run: `node backend/imageBackend/image_db_import.js`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  importImageMetadata().catch(e => {
    console.error(' - Unexpected error:', e);
    process.exit(1);
  });
}
