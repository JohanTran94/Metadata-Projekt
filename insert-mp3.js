
import { readFile } from 'fs/promises';
import mysql from 'mysql2/promise';
import db from './db.js'; // db bråkade förut, verkar fungera nu. 

const conn = await mysql.createConnection({ ...db, namedPlaceholders: true });


await conn.query(`
CREATE TABLE IF NOT EXISTS mp3_metadata (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  file          VARCHAR(255) NOT NULL,
  title         VARCHAR(255),
  artist        VARCHAR(255),
  album         VARCHAR(255),
  albumartist   VARCHAR(255),
  year          INT,
  track         INT,
  genre         VARCHAR(255),
  bitrate_kbps  INT,
  sampleRate_hz INT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_file (file)
)`);


const rows = JSON.parse(await readFile('./output/metadata.json', 'utf8'));


const sql = `
INSERT INTO mp3_metadata
(file,title,artist,album,albumartist,year,track,genre,bitrate_kbps,sampleRate_hz)
VALUES (:file,:title,:artist,:album,:albumartist,:year,:track,:genre,:bitrate_kbps,:sampleRate_hz)
ON DUPLICATE KEY UPDATE
title=VALUES(title), artist=VALUES(artist), album=VALUES(album),
albumartist=VALUES(albumartist), year=VALUES(year), track=VALUES(track),
genre=VALUES(genre), bitrate_kbps=VALUES(bitrate_kbps), sampleRate_hz=VALUES(sampleRate_hz)
`;

for (const it of rows) {
  await conn.execute(sql, {
    file: it.file ?? null,
    title: it.title ?? null,
    artist: it.artist ?? null,
    album: it.album ?? null,
    albumartist: it.albumartist ?? null,
    year: Number.isFinite(+it.year) ? +it.year : null,
    track: Number.isFinite(+it.track) ? +it.track : null,
    genre: it.genre ?? null,
    bitrate_kbps: Number.isFinite(+it.bitrate_kbps) ? +it.bitrate_kbps : null,
    sampleRate_hz: Number.isFinite(+it.sampleRate_hz) ? +it.sampleRate_hz : null
  });
}

await conn.end();
console.log(`Import klar – ${rows.length} rader.`);
