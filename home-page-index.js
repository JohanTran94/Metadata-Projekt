import express from 'express';
import mysql from 'mysql2/promise';
import dbCredentials from './db.js';
import path from 'path';

import setupImageRestRoutes from './backend/imageBackend/image-rest-routes.js';
import setupMusicRestRoutes from './backend/musicBackend/music-rest-routes.js';
import setupPdfRestRoutes from './backend/pdfBackend/pdf_route.js';

const db = await mysql.createConnection(dbCredentials);
db.config.namedPlaceholders = true;

const app = express();
app.use(express.json());

// APIs
setupImageRestRoutes(app, db);
setupMusicRestRoutes(app, db); // mount API nhạc
setupPdfRestRoutes(app, db);   // mount API pdf

// Static for SPA (frontend chung của bạn bạn)
app.use(express.static(path.resolve(process.cwd(), 'frontend')));

// Ảnh
app.use('/images', express.static(path.resolve(process.cwd(), '/warehouse/dm23-jpgs')));

// Nhạc (đặt đúng thư mục mp3 thực tế)
app.use('/music', express.static(path.resolve(process.cwd(), '/warehouse/music')));

app.use('/dm23-pdfs', express.static(path.resolve(process.cwd(), '/warehouse/dm23-pdfs')));

app.listen(3000, () => console.log('Server listening on http://localhost:3000'));

