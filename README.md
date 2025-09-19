# Sons of Arholma Search Engine

A student project on metadata, developed for the Metadata course (2025-08-11 → 2025-09-19) at **TUC Yrkeshögskola**, Stockholm, Sweden.

Single-page web application that lets users search, filter and preview metadata from multiple file types. Each media type (Images, Music, PDF, PowerPoint) has a dedicated extractor and search endpoint. Backend contains ETL flows that load metadata into a MySQL database; frontend is an SPA built with vanilla JavaScript modules.

---

## Quick summary (what this repo contains)
- Backend (Node.js + Express) with ETL scripts and REST endpoints.
- Frontend SPA (HTML, CSS, vanilla JS modules).
- Example extractors: images (`exifr`), music (`music-metadata`), PDFs (`pdf-parse-fork`), custom PPT extractor.
- Instructions to load example data into a MySQL database and run the app locally.

---

## Requirements
- Node.js (v16+ recommended)
- npm
- MySQL server
- (Optional) DBeaver / Sequel Ace for DB inspection

---

## Setup — full procedure

1. clone & install
```bash
git clone <repo-url>
cd <repo>
npm install
```

2. download example data  
Download, unzip and place contents into the project `/warehouse` folder:  
https://drive.google.com/file/d/1LwzWfTYACRdSGXx0dSUH4WWya47Pza1i/view?usp=sharing

3. create MySQL database  
Create a database (example name used below: `soa_metadata`).

4. add DB credentials  
Create `db.js` in project root (same folder as `index.js`). Example:
```js
// db.js
export const dbConfig = {
  host: "localhost",
  user: "your-username",
  password: "your-password",
  database: "soa_metadata",
};
```
Keep `db.js` out of version control (add to `.gitignore`).

5. prepare schema (example)  
Run the SQL below in your MySQL client to create basic tables used by the importers:
```sql
CREATE DATABASE soa_metadata;
USE soa_metadata;

-- Music metadata
CREATE TABLE IF NOT EXISTS musicJson (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file VARCHAR(255) NOT NULL UNIQUE,
  meta JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Image metadata
CREATE TABLE IF NOT EXISTS image_metadata (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  file VARCHAR(512) NOT NULL,
  meta JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_file (file),
  INDEX idx_file (file)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PDF metadata
CREATE TABLE IF NOT EXISTS pdf_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255),
  numpages INT,
  text LONGTEXT,
  xmp JSON,
  info JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PowerPoint metadata
CREATE TABLE IF NOT EXISTS powerpoint_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metadata JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
Adjust types and columns to match actual extractor output if you changed fields.

6. enable data import in `index.js`  
Open `index.js` and find the import block:
```js
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
```
Change `if (false)` → `if (true)` to run ETL & import flow.

7. load data
```bash
node index.js
```
This runs extractors and inserts metadata into the DB. Expect warnings when importing some PDFs — these can be ignored.

8. start server  
After import (or with imports disabled) run the server:
```bash
node index.js
```
Server listens on `http://localhost:3000` by default. Open in a browser and use the SPA.

---

## Development / testing (frontend-only)
To work on the UI without loading DB data or without an active database:
- Leave `if (false)` in `index.js` so importers don't run.
- Start a static server or dev server. If a script `npm run dev` exists, use it, otherwise use VS Code Live Server or `npx http-server ./public` (or equivalent).
- Open `http://localhost:3000` (or the port the server uses) and test UI. Note: without backend responses the UI may show placeholders or mock data depending on local code.

---

## Known issues and limitations
- PDF parsing: some PDFs emit warnings during import. These warnings are non-fatal and can be ignored for the provided dataset.
- PowerPoint extractor: basic; may miss or normalize fields inconsistently.
- Frontend error handling is minimal when DB/backend is unreachable — UI might not show detailed error messages.
- ETL flows are not optimized for very large datasets; designed for course-scale samples.
- No authentication — intended as a local/course demo only.

---

## Troubleshooting
- DB connection errors: verify `db.js` credentials, host/port, and that the MySQL user has privileges for the database.
- Import stalls or crashes on specific files: check console for the file name and extractor stack trace; you can remove problematic files from `/warehouse` and re-run.
- Port in use: default port 3000 — stop other services or change port in `index.js`.
- If frontend shows empty results: confirm the import completed (inspect DB tables with DBeaver/Sequel Ace).

---

## Tech stack & libs
- Backend: Node.js + Express  
- Database: MySQL (tested with DBeaver, Sequel Ace)  
- Frontend: Vanilla JS modules (SPA), HTML, CSS  
- Notable libraries:
  - `exifr` — image EXIF extraction
  - `pdf-parse-fork` — PDF parsing
  - `music-metadata` — audio metadata
  - Custom PowerPoint extractors

---

## Team & credits
- Thomas Rosén — PowerPoint module · github.com/thomasavguld  
- Jonas Larsson — PDF module · github.com/JonasLarsson-coder  
- Max Nilsson — Music module · github.com/MaxNilssons  
- Johan Tran — Image module · github.com/JohanTran94  

Advisor: Thomas Frank · Nodehill (https://nodehill.com)

---

## Contributing / forks
This repo documents a course project. If you fork or extend it, make your changes explicit in commits and update schema/migration scripts where relevant. Keep `db.js` private.

---

## License & attribution
© 2025 Sons Of Arholma Search Engine — course project. No license file included; treat as course work unless a license is added.
