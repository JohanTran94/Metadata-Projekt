import { readdir } from 'fs/promises';
import path from 'path';
import { parseFile } from 'music-metadata';

const files = await readdir(path.resolve(process.cwd(), '../music'));

for (const file of files) {
  if (!file.toLowerCase().endsWith('.mp3')) continue;
  const full = path.resolve(process.cwd(), '../music', file);
  const metadata = await parseFile(full);
  console.log('');
  console.log(file);
  console.log(metadata);
}