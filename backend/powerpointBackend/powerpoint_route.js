
export default function powerpointRoute(app, db) {
  app.get('/api/powerpoint-search/:field/:searchValue', async (req, res) => {
    try {
      const { field, searchValue } = req.params;

      
      const fieldMap = {
        title: "$.title",
        URL: "$.original",
        company: "$.company",
        creation_date: "$.creationDate"
      };

      const jsonField = fieldMap[field];
      if (!jsonField) {
        return res.status(400).json({ error: 'Invalid field name!' });
      }

      
      const sql = `
        SELECT id,
               metadata->>'$.title'        AS title,
               metadata->>'$.original'     AS URL,
               metadata->>'$.company'      AS company,
               metadata->>'$.creationDate' AS creation_date
        FROM powerpoint_metadata
        WHERE LOWER(metadata->>?) LIKE LOWER(?)
        LIMIT 5
      `;

      const [rows] = await db.execute(sql, [jsonField, `%${searchValue}%`]);
      res.json(rows);

    } catch (err) {
      console.error('DB error:', err);
      res.status(500).send('Database error');
    }
  });
}


/*
export default function powerpointRoute(app, db) {

  app.get('/api/powerpoint-search/:field/:searchValue', async (req, res) => {
    try {
      const { field, searchValue } = req.params;
      if (!['title', 'URL', 'company', 'creation_date'].includes(field)) {
        res.json({ error: 'Invalid field name!' });
        return;
      }  
  
  const [result] = await db.execute(`
  SELECT id, metadata->>'$.title' AS title,
    metadata->>'$.original' AS URL,
    metadata->>'$.company' AS company,
    metadata->>'$.creationDate' AS creation_date
  FROM powerpoint_metadata
  WHERE LOWER (metadata->>'${field}') LIKE LOWER(?)
  LIMIT 5;
`, ['%' + searchValue + '%']
    );
  
    res.json(result);

    }

    catch (err) {
      console.error('DB error:', err);
      res.status(500).send('Database error');
    }
  });

}  
  

/*


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


*/