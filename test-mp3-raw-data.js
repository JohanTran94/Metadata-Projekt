
import fs from 'fs/promises';
import path from 'path';
import { parseFile } from 'music-metadata';

const MUSIC_DIR = '../music';
const OUT_FILE = './output/mp3-metadata.json';

async function main() {
  const files = await fs.readdir(MUSIC_DIR);
  const items = []; // array som är tom där lagring komemr ske

  for (const file of files) {
    if (!file.toLowerCase().endsWith('.mp3')) continue;  // loop, hoppar över ev trash som inte är mp3. Thomas ex på jpg/jpeg..

    const absPath = path.join(MUSIC_DIR, file);
    const meta = await parseFile(absPath);

    items.push({
      file,
      ...meta //sprider ut data i objekt
    });
  }

  await fs.writeFile(OUT_FILE, JSON.stringify(items, null, 2), 'utf8'); //läsbar json 2= indentering 2 mellanslag
}

main();

