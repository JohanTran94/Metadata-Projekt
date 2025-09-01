// Importera nödvändiga moduler
import express from 'express';
import mysql from 'mysql2/promise';
import dbConfig from './db.js';
import pdfRestRoute from './backend/pdfRestRoute.js';

// Skapa en express-app
const app = express();

// Skapa databasanslutning en gång
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
  console.error('🚨 Kunde inte ansluta till databasen:', err.message);
  process.exit(1);
}

// Registrera dina PDF-routes
pdfRestRoute(app, db);

// Extra route om du vill hämta all metadata (kan tas bort om du använder pdf-all-meta istället)
//app.get('/api/metadata', async (_req, res) => {
//try {
//const [rows] = await db.execute('SELECT * FROM pdf_metadata ORDER BY id ASC');
//res.json(rows);
//} //catch (err) {
//console.error('🚨 Fel vid hämtning från databasen:', err.message);
//res.status(500).json({ error: 'Kunde inte hämta metadata från databasen' });
//}
//});

// Servera statiska filer från frontend-mappen
app.use(express.static('frontend'));

// Starta servern
app.listen(3000, () => {
  console.log(' Servern lyssnar på http://localhost:3000');
});