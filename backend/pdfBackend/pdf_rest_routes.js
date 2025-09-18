import { Router } from 'express';

export default function setupPdfRestRoutes(app, db) {
  const router = Router();

  // /api/pdf-search/:field/:searchValue
  router.get('/api/pdf-search/:field/:searchValue', async (req, res) => {
    const { field, searchValue } = req.params;
    const allowed = ['Title', 'Author', 'Subject', 'Keywords', 'Pages', 'Text', 'Everything', 'Filename'];
    if (!allowed.includes(field)) {
      return res.json({ error: 'Invalid field name!' });
    }

    try {
      let sql = '';
      let params = [];

      // pages special handling
      const isPageQuery = field === 'Pages' || field === 'Everything';
      const pageMatch = searchValue.match(/^(\d+)-(\d+)$|^>(\d+)$|^\d+$/);

      if (field === 'Pages') {
        if (/^\d+$/.test(searchValue)) {
          sql = `
            SELECT id, filename, numpages, text,
              info->>'$.Title' AS title,
              info->>'$.Author' AS author,
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
              info->>'$.Title' AS title,
              info->>'$.Author' AS author,
              info->>'$.Subject' AS subject,
              info->>'$.Keywords' AS keywords,
              xmp->>'$.title' AS xmp_title
            FROM pdf_metadata
            WHERE numpages > ?
          `;
          params = [parseInt(m[1])];
        } else if (/^(\d+)-(\d+)$/.test(searchValue)) {
          const [min, max] = searchValue.split('-').map(Number);
          if (min > max) return res.json({ error: 'Smallest value must be smaller than the biggest value.' });
          sql = `
            SELECT id, filename, numpages, text,
              info->>'$.Title' AS title,
              info->>'$.Author' AS author,
              info->>'$.Subject' AS subject,
              info->>'$.Keywords' AS keywords,
              xmp->>'$.title' AS xmp_title
            FROM pdf_metadata
            WHERE numpages BETWEEN ? AND ?
          `;
          params = [min, max];
        } else {
          return res.json({ error: 'Invalid format! Use 12, >10 or 5-15.' });
        }

      } else if (field === 'Text') {
        sql = `
          SELECT id, filename, numpages, text,
            info->>'$.Title' AS title,
            info->>'$.Author' AS author,
            info->>'$.Subject' AS subject,
            info->>'$.Keywords' AS keywords,
            xmp->>'$.title' AS xmp_title
          FROM pdf_metadata
          WHERE LOWER(text) LIKE LOWER(?)
        `;
        params = [`%${searchValue}%`];

      } else if (field === 'Everything') {
        sql = `
          SELECT id, filename, numpages, text,
            info->>'$.Title' AS title,
            info->>'$.Author' AS author,
            info->>'$.Subject' AS subject,
            info->>'$.Keywords' AS keywords,
            xmp->>'$.title' AS xmp_title
          FROM pdf_metadata
          WHERE LOWER(text) LIKE LOWER(?)
             OR LOWER(info->>'$.Title') LIKE LOWER(?)
             OR LOWER(info->>'$.Author') LIKE LOWER(?)
             OR LOWER(info->>'$.Subject') LIKE LOWER(?)
             OR LOWER(info->>'$.Keywords') LIKE LOWER(?)
             OR LOWER(xmp->>'$.title') LIKE LOWER(?)
             OR LOWER(filename) LIKE LOWER(?)
        `;
        params = Array(7).fill(`%${searchValue}%`);

        // Add page logic if Everythin looks like a number or range.
        if (pageMatch) {
          if (/^\d+$/.test(searchValue)) {
            sql += ' OR numpages = ?';
            params.push(parseInt(searchValue));
          } else if (/^>(\d+)$/.test(searchValue)) {
            sql += ' OR numpages > ?';
            params.push(parseInt(pageMatch[3]));
          } else if (/^(\d+)-(\d+)$/.test(searchValue)) {
            const [min, max] = searchValue.split('-').map(Number);
            sql += ' OR numpages BETWEEN ? AND ?';
            params.push(min, max);
          }
        }

      } else if (field === 'Filename') {
        sql = `
          SELECT id, filename, numpages, text,
            info->>'$.Title' AS title,
            info->>'$.Author' AS author,
            info->>'$.Subject' AS subject,
            info->>'$.Keywords' AS keywords,
            xmp->>'$.title' AS xmp_title
          FROM pdf_metadata
          WHERE LOWER(filename) LIKE LOWER(?)
        `;
        params = [`%${searchValue}%`];

      } else {
        // Title, Author, Subject, Keywords
        sql = `
          SELECT id, filename, numpages, text,
            info->>'$.Title' AS title,
            info->>'$.Author' AS author,
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
      console.error('Error by search:', err);
      res.status(500).json({ error: 'Server errror' });
    }
  });

  // Default startpage: show the first 10 PDFs (with text)
  router.get('/api/pdf-default', async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT id, filename, numpages, text,
          info->>'$.Title' AS title,
          info->>'$.Author' AS author,
          info->>'$.Subject' AS subject,
          info->>'$.Keywords' AS keywords,
          xmp->>'$.title' AS xmp_title
        FROM pdf_metadata
        ORDER BY id ASC
        LIMIT 10
      `);
      res.json(rows);
    } catch (err) {
      console.error('Error fetch for default PDFs:', err);
      res.status(500).json({ error: 'Server fetch error' });
    }
  });

  // Default with optional limit
  router.get('/api/pdf-default/:limit', async (req, res) => {
    try {
      const limit = parseInt(req.params.limit) || 20;
      const [rows] = await db.execute(`
        SELECT id, filename, numpages, text,
          info->>'$.Title' AS title,
          info->>'$.Author' AS author,
          info->>'$.Subject' AS subject,
          info->>'$.Keywords' AS keywords,
          xmp->>'$.title' AS xmp_title
        FROM pdf_metadata
        ORDER BY id ASC
        LIMIT ?
      `, [limit]);
      res.json(rows);
    } catch (err) {
      console.error('Error fetch for default PDFs:', err);
      res.status(500).json({ error: 'Serverer fetch error' });
    }
  });

  // All metadata by id
  router.get('/api/pdf-all-meta/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.execute(`SELECT * FROM pdf_metadata WHERE id = ?`, [id]);
      res.json(rows.length ? rows[0] : { error: 'PDF not found' });
    } catch (err) {
      console.error('Error fetch for metadata:', err);
      res.status(500).json({ error: 'Server fetch error' });
    }
  });

  // Only XMP
  router.get('/api/pdf-xmp/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.execute(`SELECT xmp FROM pdf_metadata WHERE id = ?`, [id]);
      res.json(rows.length ? (rows[0].xmp || {}) : { error: 'XMP-data missing' });
    } catch (err) {
      console.error('Error fetch for XMP:', err);
      res.status(500).json({ error: 'Server fetch error' });
    }
  });

  // Only text (optional)
  router.get('/api/pdf-text/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.execute(`SELECT text FROM pdf_metadata WHERE id = ?`, [id]);
      res.json(rows.length ? { text: rows[0].text || '' } : { error: 'Text missing' });
    } catch (err) {
      console.error('Error fetch for text:', err);
      res.status(500).json({ error: 'Server fetch error' });
    }
  });

  app.use(router);
}