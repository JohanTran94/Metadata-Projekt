// backend/musicBackend/music-rest-routes.js
import { Router } from 'express';

export default function setupMusicRestRoutes(app, db) {
  const router = Router();

  const requireDb = (_req, res, next) =>
    db ? next() : res.status(503).json({ error: 'Database not connected' });

  // Gemensamm grund för att slippa lit upprepande kod
  const SELECT = `
    SELECT
      id,
      file                               AS file,
      meta->>'$.common.title'            AS title,
      meta->>'$.common.artist'           AS artist,
      meta->>'$.common.album'            AS album,
      JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]')) AS genre,
      meta->>'$.common.year'             AS year
    FROM musicJson
  `;
  // Gemensamm grund för att slippa lit upprepande kod
  const ORDER = `
    ORDER BY
      meta->>'$.common.artist',
      meta->>'$.common.album',
      meta->>'$.common.title'
  `;

  const ALLOWED = new Set(['title', 'album', 'artist', 'genre', 'year', 'file', 'any']);

  const pathFor = (field) =>
    field === 'genre' // genre är array i metadata, behöver behandlas annorlunda
      ? `JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]'))`
      : field === 'file' // file ligger också utanför json kolumnen i db.
        ? `file`
        : `meta->>'$.common.${field}'`;

  const likeify = (s) => `%${s ?? ''}%`; // Hanterar olika möjliga varianter av tex acid
  const norm = (s) => (s ?? '').toLowerCase();


  // Sök (title/album/artist/genre/year/file/any)
  router.get('/api/music-search/:field/:searchValue', requireDb, async (req, res) => {
    const { field, searchValue } = req.params;
    if (!ALLOWED.has(field)) return res.status(400).json({ error: 'Invalid field name!' });

    // Alla fält, med okänd på urprungligen tomma fält i db 
    if (field === 'any') {
      const raw = String(searchValue ?? '').trim();
      const asksUnknown = norm(raw).startsWith('okä'); // kan hanter okänd (genre,artist...)

      if (asksUnknown) {
        const sql = `
          ${SELECT}
          WHERE
            TRIM(COALESCE(meta->>'$.common.title',''))  = '' OR
            TRIM(COALESCE(meta->>'$.common.artist','')) = '' OR
            TRIM(COALESCE(meta->>'$.common.album',''))  = '' OR
            TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]')),'')) = '' OR
            TRIM(COALESCE(meta->>'$.common.year',''))   = ''
          ${ORDER}
        `;
        const [rows] = await db.execute(sql);
        return res.json(rows);
      } else {
        const like = likeify(searchValue);
        const sql = `
          ${SELECT}
          WHERE
            LOWER(COALESCE(meta->>'$.common.title',''))  LIKE LOWER(?) OR
            LOWER(COALESCE(meta->>'$.common.artist','')) LIKE LOWER(?) OR
            LOWER(COALESCE(meta->>'$.common.album',''))  LIKE LOWER(?) OR
            LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]')),'')) LIKE LOWER(?) OR
            LOWER(COALESCE(meta->>'$.common.year',''))   LIKE LOWER(?)
          ${ORDER}
        `;
        const [rows] = await db.execute(sql, [like, like, like, like, like]);
        return res.json(rows);
      }
    }


    if (field === 'year') {
      const raw = String(searchValue ?? '').trim();
      const m = raw.match(/^(<=|>=|=|!=|<>|<|>)[ ]*(\d{1,4})$/);

      const yearText = `JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.year'))`;
      const yearIsNumeric = `${yearText} REGEXP '^[0-9]{1,4}$'`;
      const yearNum = `CAST(${yearText} AS UNSIGNED)`;
      //regex för att kolla om det är ett årtal med operator
      if (m) {
        let op = m[1];
        const val = parseInt(m[2], 10);
        if (op === '<>') op = '!=';
        const sql = `
          ${SELECT}
          WHERE ${yearIsNumeric} AND ${yearNum} ${op} ?
          ${ORDER}
        `;
        const [rows] = await db.execute(sql, [val]);
        return res.json(rows);
      } else { // behöver inte vara ett komplett årtal
        const sql = `
          ${SELECT}
          WHERE LOWER(COALESCE(${yearText},'')) LIKE LOWER(?)
          ${ORDER}
        `;
        const [rows] = await db.execute(sql, [likeify(raw)]);
        return res.json(rows);
      }
    }


    const path = pathFor(field);
    const sql = `
      ${SELECT}
      WHERE LOWER(COALESCE(${path},'')) LIKE LOWER(?)
      ${ORDER}
    `;
    const [rows] = await db.execute(sql, [likeify(searchValue)]);
    return res.json(rows);
  });

  // Hämta all metadata för en låt (via id)
  router.get('/api/music-all-meta/:id', requireDb, async (req, res) => {
    const { id } = req.params;
    const [rows] = await db.execute(`SELECT * FROM musicJson WHERE id = ?`, [id]);
    res.json(rows);
  });



  app.use(router);
}
