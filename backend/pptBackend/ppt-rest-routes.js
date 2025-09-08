import { Router } from 'express';

export default function setupPptRestRoutes(app, db) {
  const router = Router();


  const allowed = {
    id: 'id',
    fileName: 'fileName',
    title: 'title',
    original: 'original',
    company: 'company',
    creationDate: 'creationDate'
  };


  router.get('/api/ppt-search/:field/:searchValue', async (req, res) => {
    try {
      const { field, searchValue } = req.params;
      const col = allowed[field];
      if (!col) return res.status(400).json({ error: 'Invalid field name' });


      const jsonPath = `$.${col}`;

      const sql = `
        SELECT id, metadata,
               metadata->>'$.fileName'     AS fileName,
               metadata->>'$.title'        AS title,
               metadata->>'$.company'      AS company,
               metadata->>'$.creationDate' AS creationDate,
               metadata->>'$.original'     AS original
        FROM powerpoint_metadata
        WHERE LOWER(metadata->>'${jsonPath}') LIKE LOWER(?)
        LIMIT 50
      `;
      const [rows] = await db.execute(sql, [`%${searchValue}%`]);
      res.json(rows);
    } catch (err) {
      console.error('ppt search error:', err);
      res.status(500).json({ error: 'Database query failed' });
    }
  });


  router.get('/api/ppt-all-meta/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.execute(`
        SELECT id, metadata
        FROM powerpoint_metadata
        WHERE id = ?
      `, [id]);
      res.json(rows?.[0] || { error: 'ppt not found' });
    } catch (err) {
      console.error('ppt meta error:', err);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  app.use(router);
}
