// Importera nödvändiga moduler
import express from 'express';
import mysql from 'mysql2/promise';
import dbConfig from './db.js'; // Se till att du har en db.js med dina databasinställningar

// Skapa en express-app
const app = express();

// REST-route för att hämta metadata från databasen
app.get('/api/metadata', async (_req, res) => {
  try {
    // Skapa anslutning till databasen
    const db = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database
    });

    // Hämta metadata från tabellen pdf_metadata
    const [rows] = await db.execute('SELECT * FROM pdf_metadata ORDER BY id ASC');

    // Stäng anslutningen
    await db.end();

    // Skicka metadata som JSON
    res.json(rows);
  } catch (err) {
    console.error('🚨 Fel vid hämtning från databasen:', err.message);
    res.status(500).json({ error: 'Kunde inte hämta metadata från databasen' });
  }
});

// Servera statiska filer från frontend-mappen
app.use(express.static('frontend'));

// Starta servern
app.listen(3000, () => {
  console.log('Servern lyssnar på http://localhost:3000');
});