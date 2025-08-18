
import express from 'express';
import { readdir } from 'fs/promises';
import path from 'path';
import { parseFile } from 'music-metadata';

const app = express();
const MUSIC_DIR = path.resolve(process.cwd(), '../music');

app.get('/api/mp3', async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 50);
    const files = (await readdir(MUSIC_DIR))
      .filter(f => f.toLowerCase().endsWith('.mp3'))
      .slice(0, limit);

    const items = [];
    for (const f of files) {
      try {
        const mm = await parseFile(path.join(MUSIC_DIR, f));
        items.push({
          file: f,
          title: mm.common?.title ?? null,
          artist: mm.common?.artist ?? null,
          album: mm.common?.album ?? null,
          year: mm.common?.year ?? null,
          durationSec: mm.format?.duration ?? null
        });
      } catch { /* hoppa över felaktig fil */ }
    }
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static('frontend'));
app.listen(3000, () => console.log('http://localhost:3000'));
