// convert.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const imgDir = path.join(process.cwd(), 'public', 'img');
const images = ['background800.jpg', 'background1280.jpg', 'background1920.jpg'];

images.forEach(file => {
  const inputPath = path.join(imgDir, file);
  const outputPath = path.join(imgDir, file.replace('.jpg', '.webp'));

  sharp(inputPath)
    .toFile(outputPath)
    .then(() => console.log(`${file} → ${outputPath}`))
    .catch(err => console.error(err));
});
