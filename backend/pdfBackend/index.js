
import express from 'express';
import mysql from 'mysql2/promise';
import dbConfig from '../../db.js';
import pdf_route from './pdf_route.js';

//create express app
const app = express();

//create db connection
let db;
try {
  db = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
  });
} catch (err) {
  console.error('Unable to connect to databas:', err.message);
  process.exit(1);
}

// Initialize PDF routes
pdf_route(app, db);

// Extra route om du vill hämta all metadata (kan tas bort om du använder pdf-all-meta istället)
//app.get('/api/metadata', async (_req, res) => {
//try {
//const [rows] = await db.execute('SELECT * FROM pdf_metadata ORDER BY id ASC');
//res.json(rows);
//} //catch (err) {
//console.error('Fel vid hämtning från databasen:', err.message);
//res.status(500).json({ error: 'Kunde inte hämta metadata från databasen' });
//}
//});

// Serve static files from the frontend folder
app.use(express.static('frontend'));

// Start server
app.listen(3000, () => {
  console.log(' Servern lyssnar på http://localhost:3000');
});