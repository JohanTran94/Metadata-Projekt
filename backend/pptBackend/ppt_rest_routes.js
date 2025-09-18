import express from 'express';

export default function setupPptRestRoutes(app, db) {
  const router = express.Router();

  const allowedFields = {
    creationDate: "creationDate",
    fileName: "fileName",
    organisation: "organisation",
    original: "original",
    title: "title"
  };

  function requireDb(req, res, next) {
    if (!db) return res.status(503).json({ error: 'Database not connected' });
    next();
  }

  // --- Slumpmässiga resultat vid initial load ---
  router.get('/api/ppt', requireDb, async (req, res) => {
    let limit = Math.max(1, Math.min(500, Number(req.query.limit) || 10));
  
    try {
      const sql = `
        SELECT
          id,
          metadata,
          JSON_UNQUOTE(metadata->>'$.fileName') AS fileName,
          JSON_UNQUOTE(metadata->>'$.title') AS title,
          JSON_UNQUOTE(metadata->>'$.organisation') AS organisation,
          JSON_UNQUOTE(metadata->>'$.creationDate') AS creationDate,
          JSON_UNQUOTE(metadata->>'$.original') AS original,
          JSON_UNQUOTE(metadata->>'$.fileSize') AS fileSize
        FROM powerpoint_metadata
        ORDER BY RAND()
        LIMIT ${limit}`;
  
      const [rows] = await db.execute(sql);
  
      // Konvertera fileSize till number
      const normalizedRows = rows.map(r => ({
        ...r,
        fileSize: r.fileSize ? Number(r.fileSize) : 0
      }));
  
      const countSql = `SELECT COUNT(*) AS total FROM powerpoint_metadata`;
      const [[{ total }]] = await db.execute(countSql);
  
      res.json({ items: normalizedRows, limit, total });
    } catch (err) {
      console.error("Database error in /api/ppt:", err);
      res.status(500).json({ error: "Database query failed" });
    }
  });
  

  // --- Sök med offset och ev. datumintervall ---
  router.get('/api/ppt-search/:field/:searchValue', requireDb, async (req, res) => {
    let { field, searchValue } = req.params;
    const { dateFrom, dateTo } = req.query;
  
    if (!searchValue || searchValue === '-' || searchValue.trim() === '') searchValue = '';
  
    let limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));
    let offset = Math.max(0, Number(req.query.offset) || 0);
  
    try {
      const conditions = [];
      const params = [];
  
      if (field === 'any') {
        if (searchValue) {
          const paths = Object.values(allowedFields).map(
            f => `LOWER(metadata->>'$.${f}') LIKE LOWER(?)`
          );
          conditions.push(`(${paths.join(' OR ')})`);
          params.push(...Array(paths.length).fill(`%${searchValue}%`));
        }
      } else {
        if (!allowedFields[field]) return res.status(400).json({ error: "Invalid field name" });
  
        if (field === 'creationDate') {
          // ignorera searchValue, endast datumintervall används
        } else if (searchValue) {
          conditions.push(`LOWER(metadata->>'$.${field}') LIKE LOWER(?)`);
          params.push(`%${searchValue}%`);
        }
      }
  
      if (dateFrom) {
        conditions.push("DATE(JSON_UNQUOTE(metadata->>'$.creationDate')) >= ?");
        params.push(dateFrom);
      }
      if (dateTo) {
        conditions.push("DATE(JSON_UNQUOTE(metadata->>'$.creationDate')) <= ?");
        params.push(dateTo);
      }
  
      const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  
      const sql = `
        SELECT
          id,
          metadata,
          JSON_UNQUOTE(metadata->>'$.fileName') AS fileName,
          JSON_UNQUOTE(metadata->>'$.title') AS title,
          JSON_UNQUOTE(metadata->>'$.organisation') AS organisation,
          JSON_UNQUOTE(metadata->>'$.creationDate') AS creationDate,
          JSON_UNQUOTE(metadata->>'$.original') AS original,
          JSON_UNQUOTE(metadata->>'$.fileSize') AS fileSize
        FROM powerpoint_metadata
        ${whereClause}
        LIMIT ${limit} OFFSET ${offset}`;
  
      const [rows] = await db.execute(sql, params);
  
      const countSql = `SELECT COUNT(*) AS total FROM powerpoint_metadata ${whereClause}`;
      const [[{ total }]] = await db.execute(countSql, params);
  
      // konvertera fileSize till number
      const normalizedRows = rows.map(r => ({
        ...r,
        fileSize: r.fileSize ? Number(r.fileSize) : 0
      }));
  
      res.json({ items: normalizedRows, limit, offset, total });
    } catch (err) {
      console.error("Database error in /api/ppt-search:", err);
      res.status(500).json({ error: "Database query failed" });
    }
  });

  router.get('/api/ppt/:id/metadata', requireDb, async (req, res) => {
    const { id } = req.params;
  
    try {
      const sql = `SELECT metadata FROM powerpoint_metadata WHERE id = ?`;
      const [rows] = await db.execute(sql, [id]);
  
      if (!rows.length) return res.status(404).json({ error: "Not found" });
  
      res.json(rows[0].metadata);
    } catch (err) {
      console.error("Database error in /api/ppt/:id/metadata:", err);
      res.status(500).json({ error: "Database query failed" });
    }
  });

  app.use(router);
}
