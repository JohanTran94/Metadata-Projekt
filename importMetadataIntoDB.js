import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dbCreds from './db.js';

function basename(p) { return p ? path.basename(String(p)) : null; }

async function main() {
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
