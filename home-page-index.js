import express from 'express';
import mysql from 'mysql2/promise';
import dbCredentials from './db.js';

import setupImageRestRoutes from './backend/image-rest-routes.js';
// import setupMusicRestRoutes from './backend/music-rest-routes.js';
// import setupPdfRestRoutes   from './backend/pdf-rest-routes.js';
// import setupPptRestRoutes   from './backend/ppt-rest-routes.js';

const db = await mysql.createConnection(dbCredentials);
db.config.namedPlaceholders = true;

const app = express();

app.use(express.json());

setupImageRestRoutes(app, db);
// setupMusicRestRoutes(app, db);
// setupPdfRestRoutes(app, db);
// setupPptRestRoutes(app, db);

import path from 'path';
app.use('/files', express.static(path.resolve(process.cwd(), '../dm23-jpgs')));

app.use(express.static('frontend'));

app.listen(3000, () => console.log('Server listening on http://localhost:3000'));