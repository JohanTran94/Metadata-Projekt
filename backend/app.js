import express from 'express';

import musicRoute from './musicBackend/music_route.js';
import powerpointRoute from './powerpointBackend/powerpoint_route.js';
import pdfRoute from './pdfBackend/pdf_route.js';
import imageRoute from './imageBackend/image_route.js';

// create a web server - app
const app = express();

// routrar
app.use('/api/music', musicRoute);
app.use('/api/powerpoint', powerpointRoute);
app.use('/api/pdf', pdfRoute);
app.use('/api/image', imageRoute);

// serve files from the frontend folder
app.use(express.static('frontend'));

// start the web server
app.listen(3010, () => console.log('Listening on http://localhost:3010'));