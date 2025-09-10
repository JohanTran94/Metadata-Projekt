import path from 'path';
import express from 'express';
import mysql from 'mysql2/promise';
import dbCredentials from './db.js';


import setupImageRestRoutes from './backend/imageBackend/image_rest_routes.js';
/*
import setupMusicRestRoutes from './backend/musicBackend/music_rest_routes.js';
import setupPdfRestRoutes from './backend/pdfBackend/pdf_rest_routes.js';
*/
import setupPptRestRoutes from './backend/pptBackend/ppt_rest_routes.js';

import { importImageMetadata } from './backend/imageBackend/image_db_import.js';
import { importPptMetadata } from './backend/pptBackend/ppt_db_import.js';
import { runPptETL } from './backend/pptBackend/ppt_ETL.js';

async function init() {
  const db = await mysql.createConnection(dbCredentials);
  db.config.namedPlaceholders = true;

  console.log('Loading Image metadata to database...');
  await importImageMetadata();
  /*
    await importMusicMetadata();
    await importPdfMetadata();
  */

  // ETL + import
  console.log('Cleaning PowerPoint metadata...');
  await runPptETL();

  console.log('Loading PowerPoint metadata to database...');
  await importPptMetadata(db);

  // Express-app
  const app = express();
  app.use(express.json());

  // API routes

  setupImageRestRoutes(app, db);
  /*
  setupMusicRestRoutes(app, db);
  setupPdfRestRoutes(app, db);
  */
  setupPptRestRoutes(app, db);

  // Static serving
  app.use(express.static(path.resolve(process.cwd(), 'frontend')));
  app.use('/image', express.static(path.resolve(process.cwd(), 'warehouse/image')));
  /*
  app.use('/music', express.static(path.resolve(process.cwd(), 'warehouse/music/')));
  app.use('/pdf', express.static(path.resolve(process.cwd(), 'warehouse/pdf')));
  */
  app.use('/powerpoint', express.static(path.resolve(process.cwd(), 'warehouse/powerpoint')));

  // Start server
  app.listen(3000, () => {
    console.log('Server listening on http://localhost:3000');
  });
}

// Kör hela init-sekvensen
init().catch((err) => {
  console.error('Fatal error during initialization:', err);
  process.exit(1);
});

