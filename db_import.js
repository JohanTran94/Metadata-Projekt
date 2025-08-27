import fs from 'fs';
import mysql from 'mysql2/promise';
import dbCreds from './db.js';

let cleanJson = fs.readFileSync('./cleanedPowerpointJson.json', 'utf-8');
let data = JSON.parse(cleanJson);

const db = await mysql.createConnection(dbCreds);

await db.execute('DELETE FROM powerpoint_metadata');

for (let fileMeta of data) {
  let dbImport = await db.execute(`
        INSERT INTO powerpoint_metadata (metadata)
        VALUES (?)
      `,
    [JSON.stringify(fileMeta)]);
  console.log(fileMeta, dbImport);

}

console.log('Metadata imported.');
process.exit();












/*

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
