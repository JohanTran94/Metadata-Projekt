// backend/musicBackend/music-rest-routes.js
import { Router } from 'express';

export default function setupMusicRestRoutes(app, db) {
  const router = Router();

  function requireDb(_req, res, next) {
    if (!db) return res.status(503).json({ error: 'Database not connected' });
    next();
  }

  // Sök (title/album/artist/genre/year/any)
  router.get('/api/music-search/:field/:searchValue', requireDb, async (req, res) => {
    const { field, searchValue } = req.params;
    const allowed = ['title', 'album', 'artist', 'genre', 'year', 'any'];
    if (!allowed.includes(field)) {
      return res.status(400).json({ error: 'Invalid field name!' });
    }

    let sql, params;

    if (field === 'any') {
      const raw = String(searchValue ?? '').trim();
      // okänd funktionen fungerade visuellt utan sök på localhost (gjorde tomma rutor till okänd)--> ändrade i backend för att faktiskt kunna söka på det 
      const asksUnknown = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .startsWith('oka'); // matchar "okä", "okän", "okänd"

      if (asksUnknown) {
        // sök på allt--> visar kolumner där man kan söka på okänd och visa det
        sql = `
          SELECT
            id,
            meta->>'$.file'             AS fileName,
            meta->>'$.common.title'     AS title,
            meta->>'$.common.artist'    AS artist,
            meta->>'$.common.album'     AS album,
            JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]')) AS genre,
            meta->>'$.common.year'      AS year
          FROM musicJson
          WHERE
            TRIM(COALESCE(meta->>'$.common.title',''))  = '' OR
            TRIM(COALESCE(meta->>'$.common.artist','')) = '' OR
            TRIM(COALESCE(meta->>'$.common.album',''))  = '' OR
            TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]')),'')) = '' OR
            TRIM(COALESCE(meta->>'$.common.year',''))   = ''
          ORDER BY
            meta->>'$.common.artist',
            meta->>'$.common.album',
            meta->>'$.common.title'
          LIMIT 500
        `;
        params = [];
      } else {
        const like = `%${searchValue}%`;
        sql = `
          SELECT
            id,
            meta->>'$.file'             AS fileName,
            meta->>'$.common.title'     AS title,
            meta->>'$.common.artist'    AS artist,
            meta->>'$.common.album'     AS album,
            JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]')) AS genre,
            meta->>'$.common.year'      AS year
          FROM musicJson
          WHERE
            LOWER(COALESCE(meta->>'$.common.title',''))  LIKE LOWER(?) OR
            LOWER(COALESCE(meta->>'$.common.artist','')) LIKE LOWER(?) OR
            LOWER(COALESCE(meta->>'$.common.album',''))  LIKE LOWER(?) OR
            LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]')),'')) LIKE LOWER(?) OR
            LOWER(COALESCE(meta->>'$.common.year',''))   LIKE LOWER(?)
          ORDER BY
            meta->>'$.common.artist',
            meta->>'$.common.album',
            meta->>'$.common.title'
          LIMIT 500
        `;
        params = [like, like, like, like, like];
      }
    } else if (field === 'year') {
      sql = `
        SELECT
          id,
          meta->>'$.file'             AS fileName,
          meta->>'$.common.title'     AS title,
          meta->>'$.common.artist'    AS artist,
          meta->>'$.common.album'     AS album,
          JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]')) AS genre,
          meta->>'$.common.year'      AS year
        FROM musicJson
        WHERE LOWER(COALESCE(meta->>'$.common.year','')) LIKE LOWER(?)
        ORDER BY
          meta->>'$.common.artist',
          meta->>'$.common.album',
          meta->>'$.common.title'
        LIMIT 500
      `;
      params = [`%${searchValue}%`];
    } else {
      // title/album/artist/genre
      const path =
        field === 'genre'
          ? `JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]'))`
          : `meta->>'$.common.${field}'`;

      sql = `
        SELECT
          id,
          meta->>'$.file'             AS fileName,
          meta->>'$.common.title'     AS title,
          meta->>'$.common.artist'    AS artist,
          meta->>'$.common.album'     AS album,
          JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]')) AS genre,
          meta->>'$.common.year'      AS year
        FROM musicJson
        WHERE LOWER(COALESCE(${path}, '')) LIKE LOWER(?)
        ORDER BY
          meta->>'$.common.artist',
          meta->>'$.common.album',
          meta->>'$.common.title'
        LIMIT 500
      `;
      params = [`%${searchValue}%`];
    }

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  });

  // Hämta all metadata för en låt (via id)
  router.get('/api/music-all-meta/:id', requireDb, async (req, res) => {
    const { id } = req.params;
    const [rows] = await db.execute(`SELECT * FROM musicJson WHERE id = ?`, [id]);
    res.json(rows);
  });

  // Lista en start)
  router.get('/api/music', requireDb, async (req, res) => {
    let limit = Number.parseInt(req.query.limit ?? '100', 10);
    let offset = Number.parseInt(req.query.offset ?? '0', 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 100;
    if (!Number.isFinite(offset) || offset < 0) offset = 0;
    if (limit > 200) limit = 200;

    const sql = `
      SELECT
        id,
        meta->>'$.file'             AS fileName,
        meta->>'$.common.title'     AS title,
        meta->>'$.common.artist'    AS artist,
        meta->>'$.common.album'     AS album,
        JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]')) AS genre,
        meta->>'$.common.year'      AS year
      FROM musicJson
      ORDER BY
        meta->>'$.common.artist',
        meta->>'$.common.album',
        meta->>'$.common.title'
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await db.query(sql);
    res.json({ items: rows, limit, offset });
  });

  app.use(router);
}
