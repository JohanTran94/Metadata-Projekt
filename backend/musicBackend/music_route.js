
import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url'; // musik ligger utanför projektet.
import dbCredentials from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();


const FRONTEND_DIR = path.join(__dirname, '../../frontend');
app.use(express.static(FRONTEND_DIR));

// Serva musikfiler, ligger på samma nivå right now som projektet. 
app.use('/music', express.static(path.join(__dirname, '../../warehouse/music')));


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


function requireDb(_req, res, next) {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  next();
}

// Sök (title/album/artist/genre/year')
app.get('/api/music-search/:field/:searchValue', requireDb, async (req, res) => {
  const { field, searchValue } = req.params;
  const allowed = ['title', 'album', 'artist', 'genre', 'year', 'any'];
  if (!allowed.includes(field)) return res.status(400).json({ error: 'Invalid field name!' });

  let sql, params;

  if (field === 'any') {
    // ta bort? om man har specifika sökkriterier?
    sql = `
      SELECT
        id,
        meta->>'$.file' AS fileName,
        meta->>'$.common.title' AS title,
        meta->>'$.common.artist'AS artist,
        meta->>'$.common.album' AS album,
        JSON_UNQUOTE(JSON_EXTRACT(meta, '$.common.genre[0]')) AS genre,
        meta->>'$.common.year'AS year
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
      LIMIT 500
    `;
    const like = `%${searchValue}%`;
    params = [like, like, like, like, like];
  } else if (field === 'year') {

    sql = `
      SELECT
        id,
        meta->>'$.file'AS fileName,
        meta->>'$.common.title'AS title,
        meta->>'$.common.artist'AS artist,
        meta->>'$.common.album' AS album,
        JSON_UNQUOTE(JSON_EXTRACT(meta, '$.common.genre[0]')) AS genre,
        meta->>'$.common.year'AS year
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

    sql = `
      SELECT
        id,
        meta->>'$.file' AS fileName,
        meta->>'$.common.title'AS title,
        meta->>'$.common.artist'AS artist,
        meta->>'$.common.album' AS album,
        JSON_UNQUOTE(JSON_EXTRACT(meta, '$.common.genre[0]')) AS genre,
        meta->>'$.common.year' AS year
      FROM musicJson
      WHERE LOWER(COALESCE(meta->>'$.common.${field}', '')) LIKE LOWER(?)
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
app.get('/api/music-all-meta/:id', requireDb, async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.execute(`SELECT * FROM musicJson WHERE id = ?`, [id]);
  res.json(rows);
});

//Tillåter dom 100 första att ladda upp vid start
app.get('/api/music', requireDb, async (req, res) => {

  let limit = Number.parseInt(req.query.limit ?? '100', 10);
  let offset = Number.parseInt(req.query.offset ?? '0', 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 100;
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  if (limit > 200) limit = 200;
  //Få in bpm istället för kbps! eller inget alls? överflödigt?
  const sql = `
    SELECT
      id,
      meta->>'$.file'  AS fileName,
      meta->>'$.common.title' AS title,
      meta->>'$.common.artist' AS artist,
      meta->>'$.common.album' AS album,
      JSON_UNQUOTE(JSON_EXTRACT(meta, '$.common.genre[0]')) AS genre, 
      meta->>'$.common.year' AS year
    FROM musicJson
    ORDER BY
      meta->>'$.common.artist',
      meta->>'$.common.album',
      meta->>'$.common.title'
    LIMIT ${limit} OFFSET ${offset};
  `;
  // hämta hela arrayen och tar bort hakarna. 
  const [rows] = await db.query(sql);
  res.json({ items: rows, limit, offset });
});


app.listen(3000, () => {
  console.log(`Listening on http://localhost:3000`);
});
