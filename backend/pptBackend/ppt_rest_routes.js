import express from 'express';

export default function setupPptRestRoutes(app, db) {
  const router = express.Router();

  const allowedFields = {
    creationDate: "creationDate",
    fileName: "fileName",
    fileSize: "fileSize",
    id: "id",
    lastModified: "lastModified",
    mimetype: "mimetype",
    organisation: "organisation",
    original: "original",
    revisionNumber: "revisionNumber",
    slideCount: "slideCount",
    title: "title",
    wordCount: "wordCount"
  };

  function requireDb(req, res, next) {
    if (!db) return res.status(503).json({ error: 'Database not connected' });
    next();
  }


  router.get('/api/ppt-search/:field/:searchValue', requireDb, async (req, res) => {
    let { field, searchValue } = req.params;
    const { dateFrom, dateTo } = req.query;

    // Treat single-space as empty search
    if (searchValue === ' ' || searchValue === '-') searchValue = '';

    let limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));
    let offset = Math.max(0, Number(req.query.offset) || 0);
    let sortField = allowedFields[req.query.sortField] ? req.query.sortField : 'title';

    try {
      const conditions = [];
      const params = [];

      if (field === 'any') {
        if (searchValue) {
          const paths = Object.values(allowedFields).map(f => `LOWER(metadata->>'$.${f}') LIKE LOWER(?)`);
          conditions.push(`(${paths.join(' OR ')})`);
          params.push(...Array(paths.length).fill(`%${searchValue}%`));
        }
      } else {
        if (!allowedFields[field]) return res.status(400).json({ error: "Invalid field name" });
        if (searchValue) {
          conditions.push(`LOWER(metadata->>'$.${field}') LIKE LOWER(?)`);
          params.push(`%${searchValue}%`);
        }
      }

      // --- Date filters ---
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
        metadata->>'$.fileName' AS fileName,
        metadata->>'$.title' AS title,
        metadata->>'$.organisation' AS organisation,
        metadata->>'$.creationDate' AS creationDate,
        metadata->>'$.original' AS original
      FROM powerpoint_metadata
      ${whereClause}
      ORDER BY metadata->>'$.${sortField}'
      LIMIT ${limit} OFFSET ${offset}
    `;

      const countSql = `SELECT COUNT(*) AS total FROM powerpoint_metadata ${whereClause}`;

      const [rows] = await db.execute(sql, params);
      const [[{ total }]] = await db.execute(countSql, params);

      res.json({ items: rows, limit, offset, sortField, total });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Database query failed" });
    }
  });




  // ----------- /api/ppt (slump / initial load) ----------------
  router.get('/api/ppt', requireDb, async (req, res) => {
    let limit = Number(req.query.limit) || 10;
    limit = Math.max(1, Math.min(500, limit));
    const sortField = req.query.sortField || 'random'; // kan vara 'creationDate' eller annat

    try {
      // bestäm ORDER BY
      let orderBy;
      if (sortField === 'creationDate') {
        orderBy = "STR_TO_DATE(JSON_UNQUOTE(metadata->'$.creationDate'), '%Y-%m-%d')";
      } else if (sortField === 'random') {
        orderBy = "RAND()";
      } else {
        orderBy = `JSON_UNQUOTE(metadata->'$.${sortField}')`;
      }

      const [rows] = await db.execute(`
      SELECT
        id,
        metadata,
        JSON_UNQUOTE(metadata->'$.fileName') AS fileName,
        JSON_UNQUOTE(metadata->'$.title') AS title,
        JSON_UNQUOTE(metadata->'$.organisation') AS organisation,
        JSON_UNQUOTE(metadata->'$.creationDate') AS creationDate,
        JSON_UNQUOTE(metadata->'$.original') AS original
      FROM powerpoint_metadata
      ORDER BY ${orderBy}
      LIMIT ${limit}
    `);

      const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM powerpoint_metadata`);

      res.json({ items: rows, limit, offset: 0, sortField, total });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Database query failed" });
    }
  });


  app.use(router);
}
