// import-json-to-db.js
import fs from 'fs';
import mysql from 'mysql2/promise';
import dbConfig from './db.js';

const TABLE = 'mp3_metadata_json';

async function main() {
  // Den råa .json filen. 
  const raw = fs.readFileSync('./output/mp3-metadata.json', 'utf8');
  const items = JSON.parse(raw);

  // Samma anslutning som i mp3.js
  const db = await mysql.createConnection({
    host: dbConfig.host,
    port: Number(dbConfig.port) || 3306,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    charset: 'utf8mb4'
  });

  // Skapar om det inte finns mp3_metadata_json. Använder TABLE som en variabel, annorlunda från den andra layouten
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      file_path VARCHAR(256) NOT NULL,
      title VARCHAR(256) NULL,
      raw_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // for loop för att infoga 
  for (const it of items) {
    const filePath = it.file ?? '';
    const title = it.common?.title ?? null;


    await db.execute(
      `INSERT INTO ${TABLE} (file_path, title, raw_json)
   VALUES (?, ?, CAST(? AS JSON))
   ON DUPLICATE KEY UPDATE
     title = VALUES(title),
     raw_json = VALUES(raw_json)`,
      [filePath, title, JSON.stringify(it)]
    );
  }

  console.log(`✅ Importerat ${items.length} poster till ${TABLE}`);
  await db.end();
}




// Just nu så fylls databasen på med "duplicat", hur få bort.  file path unik?
// Yes, med duplicate key update så fungerar det som det ska (tror jag)