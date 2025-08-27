// server.js (ESM)
import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dbCredentials from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const app = express();

// --- Hjälp: logga requests (enkelt) ---
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// --- Statiska filer (frontend/index.html etc.) ---
const FRONTEND_DIR = path.join(__dirname, 'frontend');
app.use(express.static(FRONTEND_DIR));

// En enkel hälsokoll
app.get('/health', (_req, res) => res.json({ ok: true }));

// --- DB-koppling ---
let db = null;
async function connectDb() {
  try {
    db = await mysql.createConnection({ ...dbCredentials });
    console.log('✅ MySQL connected');
  } catch (err) {
    console.error('❌ MySQL connect failed:', err.message);
    db = null;
  }
}
await connectDb();

// Middleware: kräver DB för /api/*
function requireDb(req, res, next) {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  next();
}

// --- API ---
app.get('/api/music-search/:field/:searchValue', requireDb, async (req, res) => {
  try {
    const { field, searchValue } = req.params;
    const allowed = ['title', 'album', 'artist', 'genre'];
    if (!allowed.includes(field)) {
      return res.status(400).json({ error: 'Invalid field name!' });
    }


    const sql = `
      SELECT id,
             meta->>'$.file'           AS fileName,
             meta->>'$.common.title'   AS title,
             meta->>'$.common.artist'  AS artist,
             meta->>'$.common.album'   AS album,
             meta->>'$.common.genre'   AS genre
      FROM musicJson
      WHERE LOWER(meta->>'$.common.${field}') LIKE LOWER(?)
    `;
    const params = [`%${searchValue}%`];

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('API error /music-search:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Hämta all metadata för en låt
app.get('/api/music-all-meta/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(`SELECT * FROM musicJson WHERE id = ?`, [id]);
    res.json(rows);
  } catch (err) {
    console.error('API error /music-all-meta:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/final', requireDb, async (req, res) => {

  const [rows] = await db.execute(`SELECT * FROM musicJson`);
  res.json(rows);

}
);

















// --- Starta servern ---
app.listen(PORT, () => {
  console.log(`🚀 Listening on http://localhost:${PORT}`);
  console.log(`   Try /health  → http://localhost:${PORT}/health`);
  console.log(`   Try API      → http://localhost:${PORT}/api/music-search/artist/abba`);
});
