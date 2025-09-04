export default function pdf_route(app, db) {

  // search pdfs based on metadata or text content
  app.get('/api/pdf-search/:field/:searchValue', async (req, res) => {
    const { field, searchValue } = req.params;

    const allowedFields = ['Title', 'Author', 'Subject', 'Keywords', 'Pages', 'Text'];
    if (!allowedFields.includes(field)) {
      res.json({ error: 'Invalid field name!' });
      return;
    }

    let query = '';
    let params = [];

    try {
      if (field === 'Pages') {
        // handdle different formats for page search
        if (/^\d+$/.test(searchValue)) {
          query = `
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
          const match = searchValue.match(/^>(\d+)$/);
          query = `
            SELECT id, filename, numpages, text,
              info->>'$.Title' AS title,
              info->>'$.Author' AS author,
              info->>'$.Subject' AS subject,
              info->>'$.Keywords' AS keywords,
              xmp->>'$.title' AS xmp_title
            FROM pdf_metadata
            WHERE numpages > ?
          `;
          params = [parseInt(match[1])];
        } else if (/^(\d+)-(\d+)$/.test(searchValue)) {
          const [min, max] = searchValue.split('-').map(Number);
          if (min > max) {
            res.json({ error: 'Minsta värde måste vara mindre än största.' });
            return;
          }
          query = `
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
          res.json({ error: 'Ogiltigt format för sidantal! Använd t.ex. 12, >10 eller 5-15.' });
          return;
        }

      } else if (field === 'Text') {
        // search in text content
        query = `
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

      } else {
        // search in metadata fields
        query = `
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

      const [result] = await db.execute(query, params);
      res.json(result);

    } catch (err) {
      console.error('Fel vid sökning:', err);
      res.status(500).json({ error: 'Serverfel vid sökning' });
    }
  });

  // Get all metadata for a specific PDF by ID
  app.get('/api/pdf-all-meta/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [result] = await db.execute(`SELECT * FROM pdf_metadata WHERE id = ?`, [id]);
      res.json(result.length ? result[0] : { error: 'PDF hittades inte' });
    } catch (err) {
      console.error('Fel vid hämtning av metadata:', err);
      res.status(500).json({ error: 'Serverfel vid hämtning' });
    }
  });

  // get only XMP metadata
  app.get('/api/pdf-xmp/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [result] = await db.execute(`SELECT xmp FROM pdf_metadata WHERE id = ?`, [id]);
      res.json(result.length ? (result[0].xmp || {}) : { error: 'XMP-data saknas' });
    } catch (err) {
      console.error('Fel vid hämtning av XMP:', err);
      res.status(500).json({ error: 'Serverfel vid hämtning' });
    }
  });

  // get only text content
  app.get('/api/pdf-text/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [result] = await db.execute(`SELECT text FROM pdf_metadata WHERE id = ?`, [id]);
      res.json(result.length ? { text: result[0].text || '' } : { error: 'Text saknas' });
    } catch (err) {
      console.error('Fel vid hämtning av text:', err);
      res.status(500).json({ error: 'Serverfel vid hämtning' });
    }
  });
}
