import path from 'path';
import express from 'express';
import mysql from 'mysql2/promise';
import dbCredentials from './db.js';


import setupImageRestRoutes from './backend/imageBackend/image_rest_routes.js';
import setupMusicRestRoutes from './backend/musicBackend/music_rest_routes.js';
import setupPdfRestRoutes from './backend/pdfBackend/pdf_rest_routes.js';
import setupPptRestRoutes from './backend/pptBackend/ppt_rest_routes.js';


/*
import { importImageMetadata } from './backend/imageBackend/image_db_import.js';
import { importMusicMetadata } from './backend/musicBackend/music_db_import.js';
import { importPdfMetadata } from './backend/pdfBackend/pdf_db_import.js';
*/
import { importPptMetadata } from './backend/pptBackend/ppt_db_import.js';

/*
import { runImageETL } from './backend/imageBackend/image_ETL.js';
import { runMusicETL } from './backend/musicBackend/music_ETL.js';
import { runPdfETL } from './backend/pdfBackend/pdf_ETL.js';
*/
import { runPptETL } from './backend/pptBackend/ppt_ETL.js';

async function init() {
 
  const db = await mysql.createConnection(dbCredentials);
  db.config.namedPlaceholders = true;


  console.log('Cleaning PowerPoint metadata...');
  await runPptETL();

  console.log('Loading PowerPoint metadata to database.');
  await importPptMetadata(db);
}