// mp3.js
import express from 'express';
import { readdir } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';

const app = express();
const MUSIC_DIR = path.resolve(process.cwd(), '../music');
const OUT_DIR = path.resolve(process.cwd(), 'output');
const OUT_FILE = path.join(OUT_DIR, 'metadata.json');

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
        const mm = await parseFile(path.join(MUSIC_DIR, f));
        items.push({
          file: f,
          title: mm.common?.title ?? null,
          artist: mm.common?.artist ?? null,
          album: mm.common?.album ?? null,
          year: mm.common?.year ?? null
        });
      } catch { }
    }

    // Spara till output/metadata.json om ?save=1
    if (req.query.save === '1') {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(OUT_FILE, JSON.stringify(items, null, 2), 'utf8');
    }

    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static('frontend'));
app.listen(3000, () => console.log('http://localhost:3000'));
