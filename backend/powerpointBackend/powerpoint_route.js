import express from 'express';
import dbCreds from './db.js';
import mysql from 'mysql2/promise';

const db = await mysql.createConnection(dbCreds);

const router = express.Router();

router.get('/api/search-by-title/:title', async (request, response) => {
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

export default router;