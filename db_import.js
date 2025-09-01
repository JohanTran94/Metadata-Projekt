
import fs from 'fs';
import path from "path";
import dbCreds from './db.js';
import mysql from 'mysql2/promise';

// read file

let cleanJson = fs.readFileSync('./cleanedPowerpointJson.json', 'utf-8');
let data = JSON.parse(cleanJson);

// establish data base connection

const db = await mysql.createConnection(dbCreds);

// create database tables if don't exist

await db.execute(`CREATE TABLE IF NOT EXISTS powerpoint_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
  metadata JSON )
`);

// erase database content for clean import

await db.execute('DELETE FROM powerpoint_metadata');

// create error log catalog if needed

const logDir = "./logs";
const logFile = path.join(logDir, "import_errors.log");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// create list of import errors

const errors = [];

// loop through and import data to database

for (let fileMeta of data) {
  try {
    let dbImport = await db.execute(
      `INSERT INTO powerpoint_metadata (metadata) VALUES (?)`,
      [JSON.stringify(fileMeta)]
    );
    console.log(fileMeta, dbImport);
    // catch and log import errors
  } catch (err) {
    errors.push(`Metadata: ${JSON.stringify(fileMeta)} | Fel: ${err.message}`);
  }
}

// create error log file

if (errors.length > 0) {
  const logContent = [
    `--- Fel-logg ${new Date().toISOString()} ---`,
    ...errors,
    "",
  ].join("\n");

  fs.appendFileSync(logFile, logContent, "utf8");

  // log unsuccessful import and close database connection
  console.error(`Fel vid import, se ${logFile} (${errors.length} st).`);
  process.exit(1);
} else {

  // log successful import and close database connection
  console.log("Powerpoint metadata import klar.");
  process.exit(0);
}


/*


for (let fileMeta of data) {
  let dbImport = await db.execute(`
        INSERT INTO powerpoint_metadata (metadata)
        VALUES (?)
      `,
    [JSON.stringify(fileMeta)]);
  console.log(fileMeta, dbImport);

}

console.log('Powerpoint metadata imported.');

// close down database connection

process.exit();














console.log("Connected to the database!");

// A small function for running queries
async function query(sql, listOfValues) {
  let result = await db.execute(sql, listOfValues);
  return result[0];
}

// Insert data from JSON into database
for (let file_name of data) {
  console.log('A PowerPoint:');
  console.log(file_name);

  let result = await query(`
        INSERT INTO powerpoint_metadata (metadata)
        VALUES (?)
      `,
    [JSON.stringify(file_name)]);  // Store the entire metadata as a JSON string
  console.log(result);
}

// Close the connection after the operations
await db.end();

*/
