// backend/musicBackend/music-rest-routes.js
import { Router } from 'express';

export default function setupMusicRestRoutes(app, db) {
  const router = Router();

  // Middleware: ensure DB connection exists
  const requireDb = (_req, res, next) =>
    db ? next() : res.status(503).json({ error: 'Database not connected' });

  // Common SQL SELECT clause: fields to return
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

  // Common ORDER BY (for consistent sorting)
  const ORDER = `
    ORDER BY
      meta->>'$.common.artist',
      meta->>'$.common.album',
      meta->>'$.common.title'
  `;

  // Allowed search fields
  const ALLOWED = new Set(['title', 'album', 'artist', 'genre', 'year', 'file', 'any']);

  // Translate a field name into its SQL path
  const pathFor = (field) =>
    field === 'genre' // genre is stored as array → must extract first element
      ? `JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.genre[0]'))`
      : field === 'file' // file column is outside JSON
        ? `file`
        : `meta->>'$.common.${field}'`;

  // Utility functions
  const likeify = (s) => `%${s ?? ''}%`; // Wrap string in % for LIKE search
  const norm = (s) => (s ?? '').toLowerCase();

  /**
   * Search endpoint
   * GET /api/music-search/:field/:searchValue
   *   field: title | album | artist | genre | year | file | any
   *   searchValue: value to search for
   */
  router.get('/api/music-search/:field/:searchValue', requireDb, async (req, res) => {
    const { field, searchValue } = req.params;
    if (!ALLOWED.has(field)) return res.status(400).json({ error: 'Invalid field name!' });

    // Special handling for "any" field → search across all columns
    if (field === 'any') {
      const raw = String(searchValue ?? '').trim();
      const asksUnknown = raw === 'unknown' || raw === 'Unknown';

      // Search for missing/empty values
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
        // Normal free-text search across multiple fields
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

    // Special handling for year field → supports operators like >=1990
    if (field === 'year') {
      const raw = String(searchValue ?? '').trim();
      const m = raw.match(/^(<=|>=|=|!=|<>|<|>)[ ]*(\d{1,4})$/);

      const yearText = `JSON_UNQUOTE(JSON_EXTRACT(meta,'$.common.year'))`;
      const yearIsNumeric = `${yearText} REGEXP '^[0-9]{1,4}$'`;
      const yearNum = `CAST(${yearText} AS UNSIGNED)`;

      if (m) {
        // Query with operator
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
      } else {
        // Fallback: text-like search
        const sql = `
          ${SELECT}
          WHERE LOWER(COALESCE(${yearText},'')) LIKE LOWER(?)
          ${ORDER}
        `;
        const [rows] = await db.execute(sql, [likeify(raw)]);
        return res.json(rows);
      }
    }

    // Default case: search in specific field
    const path = pathFor(field);
    const sql = `
      ${SELECT}
      WHERE LOWER(COALESCE(${path},'')) LIKE LOWER(?)
      ${ORDER}
    `;
    const [rows] = await db.execute(sql, [likeify(searchValue)]);
    return res.json(rows);
  });

  /**
   * Get full metadata of a single song by DB id
   * GET /api/music-all-meta/:id
   */
  router.get('/api/music-all-meta/:id', requireDb, async (req, res) => {
    const { id } = req.params;
    const [rows] = await db.execute(`SELECT * FROM musicJson WHERE id = ?`, [id]);
    res.json(rows);
  });

  // Register router with app
  app.use(router);
}
