// convert.js
// Utility script to convert background images from .jpg to .webp format
// using the "sharp" library for optimized web performance.

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Folder containing images
const imgDir = path.join(process.cwd(), 'public', 'img');

// List of background images to convert
const images = ['background800.jpg', 'background1280.jpg', 'background1920.jpg'];

// Convert each image to WebP
images.forEach(file => {
  const inputPath = path.join(imgDir, file);
  const outputPath = path.join(imgDir, file.replace('.jpg', '.webp'));

  sharp(inputPath)
    .toFile(outputPath) // write new WebP file
    .then(() => console.log(`${file} → ${outputPath}`))
    .catch(err => console.error(err));
});
