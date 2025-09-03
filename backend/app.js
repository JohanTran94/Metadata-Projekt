import express from 'express';
import dbCreds from './db.js';
import mysql from 'mysql2/promise';
//import pdfRoute from './pdfBackend/pdf_route.js';
//import musicRoute from './musicBackend/music_route.js';
//import imageRoute from './imageBackend/image_route.js';
import powerpointRoute from './powerpointBackend/powerpoint_route.js';

const db = await mysql.createConnection(dbCreds);

// create a web server - app
const app = express();

//musicRoute(app, db);
powerpointRoute(app, db);
//pdfRoute(app, db);
//imageRoute(app, db);

// serve files from the frontend folder
app.use(express.static('frontend'));

// start the web server
app.listen(3010, () => console.log('Listening on http://localhost:3010'));