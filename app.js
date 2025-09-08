import path from 'path';
import express from 'express';
import mysql from 'mysql2/promise';
import dbCredentials from './db.js';

import setupImageRestRoutes from './backend/imageBackend/image-rest-routes.js';
import setupMusicRestRoutes from './backend/musicBackend/music-rest-routes.js';
import setupPdfRestRoutes from './backend/pdfBackend/pdf-rest-routes.js';
import setupPowerpointRestRoutes from './backend/powerpointBackend/powerpoint-rest-routes.js';

const db = await mysql
  .createConnection(dbCredentials);

db
  .config
  .namedPlaceholders = true;

const app = express();
app
  .use(express.json());

// APIs
setupImageRestRoutes(app, db);
setupMusicRestRoutes(app, db);
setupPdfRestRoutes(app, db);
setupPowerpointRestRoutes(app, db);

app
  .use(express
    .static(path
      .resolve(process.cwd(), 'frontend')));

app
  .use('/image', express.static(path
    .resolve(process
      .cwd(), 'warehouse/image')));

app
  .use('/music', express
    .static(path
      .resolve(process
        .cwd(), 'warehouse/music')));

app
  .use('/pdf', express.static(path
    .resolve(process
      .cwd(), 'warehouse/pdf')));

app
  .use('/powerpoint', express
    .static(path.resolve(process
      .cwd(), 'warehouse/powerpoint')));

app
  .listen(3000, () => console
    .log('Server listening on http://localhost:3000'));
