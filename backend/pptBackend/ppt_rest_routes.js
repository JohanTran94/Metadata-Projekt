import express from 'express';

export default function setupPptRestRoutes(app, db) {
  const router = express.Router();

  // Allowed fields for search
  const allowedFields = {
    creationDate: "creationDate",
    fileName: "fileName",
    organisation: "organisation",
    original: "original",
    title: "title"
  };

  // Middleware: require DB connection
  function requireDb(req, res, next) {
    if (!db) return res.status(503).json({ error: 'Database not connected' });
    next();
  }

  /**
   * GET /api/ppt
   * Returns random results (default limit = 10, max = 500).
   */
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

      // Convert fileSize to number
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

  /**
   * GET /api/ppt-search/:field/:searchValue
   * Search by field or across all ("any").
   * Supports optional date range (dateFrom, dateTo) if field=creationDate.
   * Supports limit & offset pagination.
   */
  router.get('/api/ppt-search/:field/:searchValue', requireDb, async (req, res) => {
    let { field, searchValue } = req.params;
    const { dateFrom, dateTo } = req.query;

    if (!searchValue || searchValue === '-' || searchValue.trim() === '') searchValue = '';

    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));
    const offset = Math.max(0, Number(req.query.offset) || 0);

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
          if (!dateFrom || !dateTo) {
            return res.status(400).json({ error: 'Specify both dateFrom and dateTo' });
          }
          conditions.push("DATE(JSON_UNQUOTE(metadata->>'$.creationDate')) >= ?");
          conditions.push("DATE(JSON_UNQUOTE(metadata->>'$.creationDate')) <= ?");
          params.push(dateFrom, dateTo);
        } else if (searchValue) {
          conditions.push(`LOWER(metadata->>'$.${field}') LIKE LOWER(?)`);
          params.push(`%${searchValue}%`);
        }
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

  /**
   * GET /api/ppt/:id/metadata
   * Returns full JSON metadata for one PowerPoint file by id.
   */
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
