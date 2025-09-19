import path from 'path';
import fs from 'fs';
import express from 'express';
import mysql from 'mysql2/promise';
import dbCredentials from './db.js';
import { fileURLToPath } from 'url';

// Import backend route modules
import setupImageRestRoutes from './backend/imageBackend/image_rest_routes.js';
import setupMusicRestRoutes from './backend/musicBackend/music_rest_routes.js';
import setupPdfRestRoutes from './backend/pdfBackend/pdf_rest_routes.js';
import setupPptRestRoutes from './backend/pptBackend/ppt_rest_routes.js';

// Import ETL + DB import functions
import { importImageMetadata } from './backend/imageBackend/image_db_import.js';
import { importMusicMetadata } from './backend/musicBackend/music_db_import.js';
import { importPdfMetadata } from './backend/pdfBackend/pdf_db_import.js';
import { importPptMetadata } from './backend/pptBackend/ppt_db_import.js';
import { runPptETL } from './backend/pptBackend/ppt_ETL.js';

async function init() {
  // --- Setup MySQL connection ---
  const db = await mysql.createConnection(dbCredentials);
  db.config.namedPlaceholders = true;

  // --- ETL/Import pipeline (disabled unless toggled) ---
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

  // --- Setup Express app ---
  const app = express();
  app.use(express.json());

  // Resolve __dirname for ES module
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Serve public static files (frontend entry point)
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // --- Serve PowerPoint files (inline or download) ---
  const pptFolder = path.resolve(process.cwd(), 'warehouse/ppt');
  app.get('/ppt/:fileName', (req, res) => {
    const { fileName } = req.params;
    const { download } = req.query;
    const filePath = path.join(pptFolder, fileName);

    // Return 404 if file not found
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    // Set correct Content-Type for ppt/pptx
    const ext = path.extname(fileName).substring(1).toLowerCase();
    const mimeTypes = {
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    if (mimeTypes[ext]) res.type(mimeTypes[ext]);

    // Decide between inline view vs download
    res.setHeader('Content-Disposition', download ? 'attachment' : 'inline');
    res.sendFile(filePath);
  });

  // --- Register REST routes for each media type ---
  setupImageRestRoutes(app, db);
  setupMusicRestRoutes(app, db);
  setupPdfRestRoutes(app, db);
  setupPptRestRoutes(app, db);

  // --- Serve frontend and warehouse files ---
  app.use(express.static(path.resolve(process.cwd(), 'frontend')));
  app.use('/image', express.static(path.resolve(process.cwd(), 'warehouse/image')));
  app.use('/music', express.static(path.resolve(process.cwd(), 'warehouse/music/')));
  app.use('/pdf', express.static(path.resolve(process.cwd(), 'warehouse/pdf')));

  // --- Start server ---
  app.listen(3000, () => {
    console.log(' - Server listening on http://localhost:3000');
  });
}

// Start app with error handling
init().catch((err) => {
  console.error(' - Fatal error during initialization:', err);
  process.exit(1);
});
