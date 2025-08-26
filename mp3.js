
import express from 'express';
import { readdir, readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';

const app = express();
const MUSIC_DIR = path.resolve(process.cwd(), '../music');
const OUT_DIR = path.resolve(process.cwd(), 'output');
const OUT_FILE = path.join(OUT_DIR, 'metadata.json');

//Läser den städade metadatan från .json filen.. pointless? (normaliserad i db)
app.get('/api/mp3/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const limit = Number(req.query.limit ?? 200);
    const offset = Number(req.query.offset ?? 0);

    const all = JSON.parse(await readFile(OUT_FILE, 'utf8'));
    const fields = ['title', 'artist', 'album', 'albumartist', 'genre', 'file'];
    const filtered = q
      ? all.filter(it => fields.some(k => (it[k] ?? '').toString().toLowerCase().includes(q)))
      : all;

    res.json({ total: filtered.length, items: filtered.slice(offset, offset + limit) });
  } catch {
    res.status(404).json({ error: 'metadata.json saknas. Kör /api/mp3?limit=all&save=1 först.' });
  }
});

//Läser in mp3 data direkt från music (../), städad
app.get('/api/mp3', async (req, res) => {
  try {
    const limitParam = req.query.limit;
    const limit = limitParam === 'all' ? Infinity : Number(limitParam ?? 500);

    const files = (await readdir(MUSIC_DIR))
      .filter(f => f.toLowerCase().endsWith('.mp3'))
      .slice(0, isFinite(limit) ? limit : undefined);

    const items = [];
    for (const f of files) {
      try {
        const mm = await parseFile(path.join(MUSIC_DIR, f), { skipCovers: true });
        items.push({
          file: f,
          title: mm.common?.title ?? null,
          artist: mm.common?.artist ?? null,
          album: mm.common?.album ?? null,
          albumartist: mm.common?.albumartist ?? null,
          year: mm.common?.year ?? null,
          track: mm.common?.track?.no ?? null,
          genre: Array.isArray(mm.common?.genre) ? mm.common.genre.join(', ') : (mm.common?.genre ?? null),
          bitrate_kbps: mm.format?.bitrate ? Math.round(mm.format.bitrate / 1000) : null,
          sampleRate_hz: mm.format?.sampleRate ?? null
        });
      } catch { }
    }

    if (req.query.save === '1') {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(OUT_FILE, JSON.stringify(items, null, 2), 'utf8');
    }

    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// Rå json från output/mp3-metadata.json
app.get('/api/mp3/raw', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit ?? 500)));
    const offset = Math.max(0, Number(req.query.offset ?? 0));

    const raw = JSON.parse(await readFile(path.join(OUT_DIR, 'mp3-metadata.json'), 'utf8'));
    const filtered = q ? raw.filter(it => JSON.stringify(it).toLowerCase().includes(q)) : raw;

    res.json({ total: filtered.length, items: filtered.slice(offset, offset + limit), limit, offset });
  } catch {
    res.status(404).json({ error: 'mp3-metadata.json saknas i output/' });
  }
});

app.use('/music', express.static(MUSIC_DIR));
app.use(express.static('frontend'));
app.listen(3000, () => console.log('http://localhost:3000'));


// så--> api/mp3/raw , /api/mp3 , api/mp3/search
// i frontend mappen har jag en basic /mp3.html med en enkel sökfunktion