import fs from 'fs';
import mysql from 'mysql2/promise';
import dbCreds from './db.js';


// read JSON file
let json = fs.readFileSync('./cleanedPowerpointJson.json', 'utf-8');
let data = JSON.parse(json);

// create database connection
let db = await mysql.createConnection(dbCreds)

// A small function for running queries
async function query(sql, listOfValues) {
  let result = await db.execute(sql, listOfValues);
  return result[0];
}

// Insert data from JSON into database
for (let diverse of data) {
  //console.log('A PowerPoint:');
  //console.log(file_name);

  let result = await query(`
        INSERT INTO powerpoint_metadata (metadata)
        VALUES (?)
      `,
    [JSON.stringify(diverse)]);  // Store the entire metadata as a JSON string
  console.log(result);
}

// Close the connection after the operations
await db.end();
