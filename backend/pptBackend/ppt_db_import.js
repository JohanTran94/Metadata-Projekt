import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

export async function importPptMetadata(db) {
  const filePath = './warehouse/ppt/cleanedPptJson.json';
  if (!fs.existsSync(filePath)) {
    throw new Error(`No ${filePath}. First run runPptETL()`);
  }

  const cleanJson = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(cleanJson);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS powerpoint_metadata (
      id INT AUTO_INCREMENT PRIMARY KEY,
      metadata JSON
    )
  `);

  await db.execute('DELETE FROM powerpoint_metadata');

  const errors = [];
  for (let i = 0; i < data.length; i++) {
    try {
      await db.execute(
        `INSERT INTO powerpoint_metadata (metadata) VALUES (?)`,
        [JSON.stringify(data[i])]
      );
      process.stdout.write(`\rImporting ${i + 1} of ${data.length} files...`);
    } catch (err) {
      errors.push(`Metadata: ${JSON.stringify(data[i])} | Error: ${err.message}`);
    }
  }
  console.log();

  if (errors.length > 0) {
    const logDir = "./backend/pptBackend/ppt_error_logs";
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, "ppt_db_import_errors.log");
    fs.appendFileSync(logFile, [`--- Error log ${new Date().toISOString()} ---`, ...errors, ""].join("\n"));
    console.error(`Database import error, see ${logFile} (${errors.length} st).`);
  } else {
    console.log("PowerPoint metadata import done.");
  }
}

