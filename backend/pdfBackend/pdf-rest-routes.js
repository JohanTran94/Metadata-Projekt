// backend/pdfBackend/pdf-rest-routes.js
import { Router } from 'express';

export default function setupPdfRestRoutes(app, db) {
  const router = Router();


  // /api/pdf-search/:field/:searchValue
  router.get('/api/pdf-search/:field/:searchValue', async (req, res) => {
    const { field, searchValue } = req.params;
    const allowed = ['Title', 'Author', 'Subject', 'Keywords', 'Pages', 'Text'];
    if (!allowed.includes(field)) {
      return res.json({ error: 'Invalid field name!' });
    }

    try {
      let sql = '';
      let params = [];

      if (field === 'Pages') {
        // 12  |  >10  |  5-15
        if (/^\d+$/.test(searchValue)) {
          sql = `
            SELECT id, filename, numpages, text,
              info->>'$.Title'   AS title,
              info->>'$.Author'  AS author,
              info->>'$.Subject' AS subject,
              info->>'$.Keywords' AS keywords,
              xmp->>'$.title' AS xmp_title
            FROM pdf_metadata
            WHERE numpages = ?
          `;
          params = [parseInt(searchValue)];
        } else if (/^>(\d+)$/.test(searchValue)) {
          const m = searchValue.match(/^>(\d+)$/);
          sql = `
            SELECT id, filename, numpages, text,
              info->>'$.Title'   AS title,
              info->>'$.Author'  AS author,
              info->>'$.Subject' AS subject,
              info->>'$.Keywords' AS keywords,
              xmp->>'$.title' AS xmp_title
            FROM pdf_metadata
            WHERE numpages > ?
          `;
          params = [parseInt(m[1])];
        } else if (/^(\d+)-(\d+)$/.test(searchValue)) {
          const [min, max] = searchValue.split('-').map(Number);
          if (min > max) return res.json({ error: 'Minsta värde måste vara mindre än största.' });
          sql = `
            SELECT id, filename, numpages, text,
              info->>'$.Title'   AS title,
              info->>'$.Author'  AS author,
              info->>'$.Subject' AS subject,
              info->>'$.Keywords' AS keywords,
              xmp->>'$.title' AS xmp_title
            FROM pdf_metadata
            WHERE numpages BETWEEN ? AND ?
          `;
          params = [min, max];
        } else {
          return res.json({ error: 'Ogiltigt format för sidantal! Använd t.ex. 12, >10 eller 5-15.' });
        }

      } else if (field === 'Text') {
        sql = `
          SELECT id, filename, numpages, text,
            info->>'$.Title'   AS title,
            info->>'$.Author'  AS author,
            info->>'$.Subject' AS subject,
            info->>'$.Keywords' AS keywords,
            xmp->>'$.title' AS xmp_title
          FROM pdf_metadata
          WHERE LOWER(text) LIKE LOWER(?)
        `;
        params = [`%${searchValue}%`];

      } else {
        // Metadatafält i info (Title/Author/Subject/Keywords)
        sql = `
          SELECT id, filename, numpages, text,
            info->>'$.Title'   AS title,
            info->>'$.Author'  AS author,
            info->>'$.Subject' AS subject,
            info->>'$.Keywords' AS keywords,
            xmp->>'$.title' AS xmp_title
          FROM pdf_metadata
          WHERE LOWER(info->>'$."${field}"') LIKE LOWER(?)
        `;
        params = [`%${searchValue}%`];
      }

      const [rows] = await db.execute(sql, params);
      res.json(rows);
    } catch (err) {
      console.error('Fel vid sökning:', err);
      res.status(500).json({ error: 'Serverfel vid sökning' });
    }
  });

  // All metadata by id
  router.get('/api/pdf-all-meta/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.execute(`SELECT * FROM pdf_metadata WHERE id = ?`, [id]);
      res.json(rows.length ? rows[0] : { error: 'PDF hittades inte' });
    } catch (err) {
      console.error('Fel vid hämtning av metadata:', err);
      res.status(500).json({ error: 'Serverfel vid hämtning' });
    }
  });

  // Only XMP
  router.get('/api/pdf-xmp/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.execute(`SELECT xmp FROM pdf_metadata WHERE id = ?`, [id]);
      res.json(rows.length ? (rows[0].xmp || {}) : { error: 'XMP-data saknas' });
    } catch (err) {
      console.error('Fel vid hämtning av XMP:', err);
      res.status(500).json({ error: 'Serverfel vid hämtning' });
    }
  });

  // Only text
  router.get('/api/pdf-text/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.execute(`SELECT text FROM pdf_metadata WHERE id = ?`, [id]);
      res.json(rows.length ? { text: rows[0].text || '' } : { error: 'Text saknas' });
    } catch (err) {
      console.error('Fel vid hämtning av text:', err);
      res.status(500).json({ error: 'Serverfel vid hämtning' });
    }
  });



  app.use(router);
}