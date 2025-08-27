// server.js (ESM, minimalist)
import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dbCredentials from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const app = express();

// Statiska filer (frontend)
const FRONTEND_DIR = path.join(__dirname, 'frontend');
app.use(express.static(FRONTEND_DIR));

// Serva musikfiler
app.use('/music', express.static(path.join(__dirname, '../music')));

// DB-koppling
let db = null;
async function connectDb() {
  try {
    db = await mysql.createConnection({ ...dbCredentials });
  } catch {
    db = null;
  }
}
await connectDb();

// Middleware: kräver DB för /api/*
function requireDb(_req, res, next) {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  next();
}

// Sök (title/album/artist/genre/year/all-fields med 'any')
app.get('/api/music-search/:field/:searchValue', requireDb, async (req, res) => {
  const { field, searchValue } = req.params;
  const allowed = ['title', 'album', 'artist', 'genre', 'year', 'any'];
  if (!allowed.includes(field)) return res.status(400).json({ error: 'Invalid field name!' });

  let sql, params;

  if (field === 'any') {
    // Fri text över alla fält (år jämförs som text)
    sql = `
      SELECT
        id,
        meta->>'$.file'               AS fileName,
        meta->>'$.common.title'       AS title,
        meta->>'$.common.artist'      AS artist,
        meta->>'$.common.album'       AS album,
        meta->>'$.common.genre'       AS genre,
        meta->>'$.common.year'        AS year,
        ROUND((meta->>'$.format.bitrate')/1000) AS kbps
      FROM musicJson
      WHERE
        LOWER(COALESCE(meta->>'$.common.title',  '')) LIKE LOWER(?) OR
        LOWER(COALESCE(meta->>'$.common.artist', '')) LIKE LOWER(?) OR
        LOWER(COALESCE(meta->>'$.common.album',  '')) LIKE LOWER(?) OR
        LOWER(COALESCE(meta->>'$.common.genre',  '')) LIKE LOWER(?) OR
        LOWER(COALESCE(meta->>'$.common.year',   '')) LIKE LOWER(?)
      ORDER BY
        meta->>'$.common.artist',
        meta->>'$.common.album',
        meta->>'$.common.title'
      LIMIT 200
    `;
    const like = `%${searchValue}%`;
    params = [like, like, like, like, like];
  } else if (field === 'year') {
    // Jämför år – LIKE för att "201" kan matcha 2012 om man vill
    sql = `
      SELECT
        id,
        meta->>'$.file'               AS fileName,
        meta->>'$.common.title'       AS title,
        meta->>'$.common.artist'      AS artist,
        meta->>'$.common.album'       AS album,
        meta->>'$.common.genre'       AS genre,
        meta->>'$.common.year'        AS year,
        ROUND((meta->>'$.format.bitrate')/1000) AS kbps
      FROM musicJson
      WHERE LOWER(COALESCE(meta->>'$.common.year','')) LIKE LOWER(?)
      ORDER BY
        meta->>'$.common.artist',
        meta->>'$.common.album',
        meta->>'$.common.title'
      LIMIT 200
    `;
    params = [`%${searchValue}%`];
  } else {
    // Enskilt fält (title/artist/album/genre)
    sql = `
      SELECT
        id,
        meta->>'$.file'               AS fileName,
        meta->>'$.common.title'       AS title,
        meta->>'$.common.artist'      AS artist,
        meta->>'$.common.album'       AS album,
        meta->>'$.common.genre'       AS genre,
        meta->>'$.common.year'        AS year,
        ROUND((meta->>'$.format.bitrate')/1000) AS kbps
      FROM musicJson
      WHERE LOWER(COALESCE(meta->>'$.common.${field}', '')) LIKE LOWER(?)
      ORDER BY
        meta->>'$.common.artist',
        meta->>'$.common.album',
        meta->>'$.common.title'
      LIMIT 200
    `;
    params = [`%${searchValue}%`];
  }

  const [rows] = await db.execute(sql, params);
  res.json(rows);
});

// Hämta all metadata för en låt (via id)
app.get('/api/music-all-meta/:id', requireDb, async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.execute(`SELECT * FROM musicJson WHERE id = ?`, [id]);
  res.json(rows);
});

// Hämta första N poster (default 100) för startöversikt
// Hämta första N poster (default 100) för startöversikt
app.get('/api/music', requireDb, async (req, res) => {
  // Sanera och tvinga till heltal
  let limit = Number.parseInt(req.query.limit ?? '100', 10);
  let offset = Number.parseInt(req.query.offset ?? '0', 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 100;
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  if (limit > 200) limit = 200;

  // Interpolera EFTER sanering för att slippa bindningsstrul i LIMIT/OFFSET
  const sql = `
    SELECT
      id,
      meta->>'$.file'               AS fileName,
      meta->>'$.common.title'       AS title,
      meta->>'$.common.artist'      AS artist,
      meta->>'$.common.album'       AS album,
      meta->>'$.common.genre'       AS genre,
      meta->>'$.common.year'        AS year,
      ROUND((meta->>'$.format.bitrate')/1000) AS kbps
    FROM musicJson
    ORDER BY
      meta->>'$.common.artist',
      meta->>'$.common.album',
      meta->>'$.common.title'
    LIMIT ${limit} OFFSET ${offset};
  `;

  const [rows] = await db.query(sql);
  res.json({ items: rows, limit, offset });
});

// Starta servern (enda console.log)
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
