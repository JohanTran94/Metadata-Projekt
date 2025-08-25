import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ quiet: true });

// read JSON file
let json = fs.readFileSync('./cleanedPowerpointJson.json', 'utf-8');
let data = JSON.parse(json);

// create connection to remote MySQL-database
async function testConnection() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });
    
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
      `, [JSON.stringify(file_name)]);  // Store the entire metadata as a JSON string
      console.log(result);
    }

    // Close the connection after the operations
    await db.end();
    
  } catch (error) {
    console.error('Connection or query error:', error);
  }
}

testConnection();
