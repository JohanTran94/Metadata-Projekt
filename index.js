import path from 'path';
import fs from 'fs'; // måste importeras
import express from 'express';
import mysql from 'mysql2/promise';
import dbCredentials from './db.js';

import setupImageRestRoutes from './backend/imageBackend/image_rest_routes.js';
import setupMusicRestRoutes from './backend/musicBackend/music_rest_routes.js';
import setupPdfRestRoutes from './backend/pdfBackend/pdf_rest_routes.js';
import setupPptRestRoutes from './backend/pptBackend/ppt_rest_routes.js';

import { importImageMetadata } from './backend/imageBackend/image_db_import.js';
import { importMusicMetadata } from './backend/musicBackend/music_db_import.js';
import { importPdfMetadata } from './backend/pdfBackend/pdf_db_import.js';
import { importPptMetadata } from './backend/pptBackend/ppt_db_import.js';

import { runPptETL } from './backend/pptBackend/ppt_ETL.js';

async function init() {
  const db = await mysql.createConnection(dbCredentials);
  db.config.namedPlaceholders = true;

  if (false) {
    console.log(' - Extracting data from warehouse and loading to database...');
    await importImageMetadata();
    await importMusicMetadata();
    console.log(' - Ignore PDF-warnings.');
    await importPdfMetadata();

    console.log(' - Cleaning PowerPoint metadata...');
    await runPptETL();
    await importPptMetadata(db);
  }

  const app = express();
  app.use(express.json());

  // Lägg till pptFolder
  const pptFolder = path.resolve(process.cwd(), 'warehouse/ppt');

  // PPT-filroute med inline / download
  app.get('/ppt/:fileName', (req, res) => {
    const { fileName } = req.params;
    const { download } = req.query; // ?download=1 för nedladdning
    const filePath = path.join(pptFolder, fileName);

    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    if (download) {
      res.download(filePath); // Content-Disposition: attachment
    } else {
      res.setHeader('Content-Disposition', 'inline'); // försök öppna i browser
      res.sendFile(filePath);
    }
  });

  setupImageRestRoutes(app, db);
  setupMusicRestRoutes(app, db);
  setupPdfRestRoutes(app, db);
  setupPptRestRoutes(app, db);

  app.use(express.static(path.resolve(process.cwd(), 'frontend')));
  app.use('/image', express.static(path.resolve(process.cwd(), 'warehouse/image')));
  app.use('/music', express.static(path.resolve(process.cwd(), 'warehouse/music/')));
  app.use('/pdf', express.static(path.resolve(process.cwd(), 'warehouse/pdf')));
  // app.use('/ppt', express.static(...)); // tas bort, använder egen route

  app.listen(3000, () => {
    console.log(' - Server listening on http://localhost:3000');
  });
}

init().catch((err) => {
  console.error(' - Fatal error during initialization:', err);
  process.exit(1);
});


/*

import path from 'path';
import express from 'express';
import mysql from 'mysql2/promise';
import dbCredentials from './db.js';

import setupImageRestRoutes from './backend/imageBackend/image_rest_routes.js';
import setupMusicRestRoutes from './backend/musicBackend/music_rest_routes.js';
import setupPdfRestRoutes from './backend/pdfBackend/pdf_rest_routes.js';
import setupPptRestRoutes from './backend/pptBackend/ppt_rest_routes.js';

import { importImageMetadata } from './backend/imageBackend/image_db_import.js';
import { importMusicMetadata } from './backend/musicBackend/music_db_import.js';
import { importPdfMetadata } from './backend/pdfBackend/pdf_db_import.js';
import { importPptMetadata } from './backend/pptBackend/ppt_db_import.js';

import { runPptETL } from './backend/pptBackend/ppt_ETL.js';

async function init() {
  const db = await mysql.createConnection(dbCredentials);
  db.config.namedPlaceholders = true;

  if (true) {
    console.log(' - Extracting data from warehouse and loading to database...');
    await importImageMetadata();
    await importMusicMetadata();
    console.log(' - Ignore PDF-warnings.');
    await importPdfMetadata();

    console.log(' - Cleaning PowerPoint metadata...');
    await runPptETL();
    await importPptMetadata(db);
  }


  const app = express();
  app.use(express.json());

  app.get('/ppt/:fileName', (req, res) => {
    const { fileName } = req.params;
    const { download } = req.query; // ?download=1 för nedladdning
    const filePath = path.join(pptFolder, fileName);

    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    if (download) {
      res.download(filePath); // skickar Content-Disposition: attachment
    } else {
      res.setHeader('Content-Disposition', 'inline'); // försöker öppna i browser
      res.sendFile(filePath);
    }
  });

  setupImageRestRoutes(app, db);
  setupMusicRestRoutes(app, db);
  setupPdfRestRoutes(app, db);
  setupPptRestRoutes(app, db);

  app.use(express.static(path.resolve(process.cwd(), 'frontend')));
  app.use('/image', express.static(path.resolve(process.cwd(), 'warehouse/image')));
  app.use('/music', express.static(path.resolve(process.cwd(), 'warehouse/music/')));
  app.use('/pdf', express.static(path.resolve(process.cwd(), 'warehouse/pdf')));
  //app.use('/ppt', express.static(path.resolve(process.cwd(), 'warehouse/ppt')));

  app.listen(3000, () => {
    console.log(' - Server listening on http://localhost:3000');
  });
}
init().catch((err) => {
  console.error(' - Fatal error during initialization:', err);
  process.exit(1);
});

*/