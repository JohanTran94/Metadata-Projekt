import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import exifr from 'exifr';
import dbCreds from '../../db.js';

const IMAGE_DIR = path.resolve(process.cwd(), 'warehouse/image');

function basename(p) { return p ? path.basename(String(p)) : null; }

export async function importImageMetadata() {
  const db = await mysql.createConnection(dbCreds);
  db.config.namedPlaceholders = true;

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

  const files = fs.readdirSync(IMAGE_DIR).filter(f => /\.(jpe?g|tiff?|png|heic)$/i.test(f));

  const sql = `
    INSERT INTO image_metadata (file, meta)
    VALUES (:file, CAST(:meta AS JSON))
    ON DUPLICATE KEY UPDATE
      meta = VALUES(meta),
      updated_at = CURRENT_TIMESTAMP
  `;

  let ok = 0, fail = 0;
  for (const file of files) {
    try {
      const fullPath = path.join(IMAGE_DIR, file);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;

      const raw = await exifr.parse(fullPath, { tiff: true, ifd0: true, exif: true, gps: true, interop: true, xmp: true });

      const make = raw?.Make ?? raw?.make ?? null;
      const model = raw?.Model ?? raw?.model ?? null;
      const createDate = raw?.CreateDate ?? raw?.DateTimeOriginal ?? raw?.ModifyDate ?? null;
      const latitude = raw?.GPSLatitude ?? raw?.latitude ?? raw?.Latitude ?? null;
      const longitude = raw?.GPSLongitude ?? raw?.longitude ?? raw?.Longitude ?? null;

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
      ok++;
    } catch (err) {
      console.error('Insert failed:', err.message);
      fail++;
    }
  }

  await db.end();
  console.log(`Import finished. Success: ${ok}, Failed: ${fail}`);
}

if (import.meta.url === `file://${process.cwd()}/image_db_import.js`) {
  importImageMetadata().catch(e => {
    console.error('Unexpected error:', e);
    process.exit(1);
  });
}


/*import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dbCreds from '../../db.js';

function basename(p) { return p ? path.basename(String(p)) : null; }

export async function importImageMetadata() {
  const db = await mysql.createConnection(dbCreds);
  db.config.namedPlaceholders = true;

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

  const jsonPath = path.resolve(process.cwd(), 'metadata.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Not founded ${jsonPath}. Run /api/metadata to get json file.`);
    process.exit(1);
  }
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const sql = `
    INSERT INTO image_metadata (file, meta)
    VALUES (:file, CAST(:meta AS JSON))
    ON DUPLICATE KEY UPDATE
      meta = VALUES(meta),
      updated_at = CURRENT_TIMESTAMP
  `;

  let ok = 0, fail = 0;
  for (const item of jsonData) {
    try {
      const file =
        item?.file_name ??
        basename(item?.raw?.SourceFile) ??
        null;
      if (!file) throw new Error('Missing file_name');

      await db.execute(sql, { file, meta: JSON.stringify(item) });
      ok++;
    } catch (err) {
      console.error('Insert failed:', err.message);
      fail++;
    }
  }

  await db.end();
  console.log(`Import finished. Success: ${ok}, Failed: ${fail}`);
}

main().catch(e => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
*/
