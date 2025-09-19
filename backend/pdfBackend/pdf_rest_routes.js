import { Router } from 'express';

export default function setupPdfRestRoutes(app, db) {
  const router = Router();

  /**
   * Search endpoint
   * GET /api/pdf-search/:field/:searchValue
   *   field can be: Title | Author | Subject | Keywords | Pages | Text | Everything | Filename
   *   searchValue depends on field type:
   *     - Pages: "12", ">10", "5-15"
   *     - Text/Everything: free text
   *     - Filename/Title/Author/...: free text
   */
  router.get('/api/pdf-search/:field/:searchValue', async (req, res) => {
    const { field, searchValue } = req.params;
    const allowed = ['Title', 'Author', 'Subject', 'Keywords', 'Pages', 'Text', 'Everything', 'Filename'];
    if (!allowed.includes(field)) {
      return res.json({ error: 'Invalid field name!' });
    }

    try {
      let sql = '';
      let params = [];

      const pageMatch = searchValue.match(/^(\d+)-(\d+)$|^>(\d+)$|^\d+$/);

      // Special handling for "Pages"
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

        // Search in text content
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

        // Search across everything (text + info + xmp + filename + optional pages)
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

        // Extend with page queries if applicable
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

        // Search by filename
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

        // Default: Title, Author, Subject, Keywords
      } else {
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

  /**
   * GET /api/pdf-default
   * Returns first 10 PDFs (basic preview).
   */
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

  /**
   * GET /api/pdf-default/:limit
   * Same as above but allows custom limit.
   */
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

  /**
   * GET /api/pdf-all-meta/:id
   * Returns full metadata for a specific PDF.
   */
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

  /**
   * GET /api/pdf-xmp/:id
   * Returns only the XMP metadata of a PDF.
   */
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

  /**
   * GET /api/pdf-text/:id
   * Returns only the text snippet of a PDF.
   */
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

  // Register router
  app.use(router);
}
