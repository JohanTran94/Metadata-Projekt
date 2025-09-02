// Import the git-ignored db credentials
import dbCreds from '../db.js';

// Get the database driver
import mysql from 'mysql2/promise';

// Get express so that we can create a web server
import express from 'express';

// Create the connection to database
const db = await mysql.createConnection(dbCreds);

// Allow named placeholders in prepared statements
db.config.namedPlaceholders = true;

// Create a web server called app
const app = express();

// Create a REST route
app.get('/api/search-by-title/:title', async (request, response) => {
  try {
    let { title } = request.params;
    title = `%${title}%`;

    const [rows] = await db.execute(`

SELECT id, metadata->>'$.title' AS title
FROM powerpoint_metadata
WHERE metadata->>'$.title' LIKE ?
LIMIT 5;
    `, [title]);

    response.json(rows);

  } catch (err) {
    console.error('DB error:', err);
    response.status(500).send('Database error');
  }
});


// Let Express serve all the content from frontend folder
app.use(express.static('frontend'));

// Start the web server at port 3000
app.listen(3000, () => console.log('Listening on http://localhost:3000'));

/*

SELECT * 
      FROM powerpoint_metadata
      WHERE metadata->>'$.title' LIKE ?
      LIMIT 5;

      */