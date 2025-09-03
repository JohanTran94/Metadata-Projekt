export default function pdf_route(app, db) {

  // Sök PDF-filer baserat på metadatafält i `info` eller antal sidor
  app.get('/api/pdf-search/:field/:searchValue', async (req, res) => {
    const { field, searchValue } = req.params;

    const allowedFields = ['Title', 'Author', 'Subject', 'Keywords', 'Pages'];
    if (!allowedFields.includes(field)) {
      res.json({ error: 'Invalid field name!' });
      return;
    }

    let query = '';
    let params = [];

    if (field === 'Pages') {
      // handling for numeric search on number of pages
      if (/^\d+$/.test(searchValue)) {
        query = `
          SELECT id, filename, numpages,
            info->>'$.Title' AS info_title,
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
          SELECT id, filename, numpages,
            info->>'$.Title' AS info_title,
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
          SELECT id, filename, numpages,
            info->>'$.Title' AS info_title,
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

    } else {
      query = `
        SELECT id, filename, numpages,
          info->>'$.Title' AS info_title,
          info->>'$.Author' AS author,
          info->>'$.Subject' AS subject,
          info->>'$.Keywords' AS keywords,
          xmp->>'$.title' AS xmp_title
        FROM pdf_metadata
        WHERE LOWER(info->>'$."${field}"') LIKE LOWER(?)
      `;
      params = [`%${searchValue}%`];
    }

    try {
      const [result] = await db.execute(query, params);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Serverfel vid sökning' });
    }
  });

  //get all metadata for a specific PDF by id
  app.get('/api/pdf-all-meta/:id', async (req, res) => {
    const { id } = req.params;
    const [result] = await db.execute(`SELECT * FROM pdf_metadata WHERE id = ?`, [id]);
    res.json(result.length ? result[0] : { error: 'PDF hittades inte' });
  });

  // get only XMP metadata
  app.get('/api/pdf-xmp/:id', async (req, res) => {
    const { id } = req.params;
    const [result] = await db.execute(`SELECT xmp FROM pdf_metadata WHERE id = ?`, [id]);
    res.json(result.length ? result[0].xmp : { error: 'XMP-data saknas' });
  });

  // get only text content
  app.get('/api/pdf-text/:id', async (req, res) => {
    const { id } = req.params;
    const [result] = await db.execute(`SELECT text FROM pdf_metadata WHERE id = ?`, [id]);
    res.json(result.length ? { text: result[0].text } : { error: 'Text saknas' });
  });

}