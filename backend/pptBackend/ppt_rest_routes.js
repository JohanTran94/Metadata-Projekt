import express from 'express';

export default function setupPowerpointRoutes(app, db) {
  const router = express.Router();

  function requireDb(_req, res, next) {
    if (!db) return res.status(503).json({ error: 'Database not connected' });
    next();
  }

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

  router.get('/api/ppt-search/:field/:searchValue', requireDb, async (req, res) => {
    const { field, searchValue } = req.params;
    const like = `%${searchValue}%`;
    let limit = Number(req.query.limit) || 100;
    let offset = Number(req.query.offset) || 0;
    let sortField = req.query.sortField || 'title';

    limit = Math.max(1, Math.min(500, limit));
    offset = Math.max(0, offset);
    if (!allowedFields[sortField]) sortField = 'title';

    try {
      let sql, params;

      if (field === 'any') {
        const paths = Object.values(allowedFields).map(
          f => `LOWER(metadata->>'$.${f}') LIKE LOWER(?)`
        );
        sql = `
          SELECT
            id,
            metadata,
            metadata->>'$.fileName' AS fileName,
            metadata->>'$.title' AS title,
            metadata->>'$.organisation' AS organisation,
            metadata->>'$.creationDate' AS creationDate,
            metadata->>'$.original' AS original
          FROM powerpoint_metadata
          WHERE ${paths.join(' OR ')}
          ORDER BY metadata->>'$.${sortField}'
          LIMIT ${limit} OFFSET ${offset}
        `;
        params = Array(paths.length).fill(like);
      } else {
        if (!allowedFields[field]) {
          return res.status(400).json({ error: "Invalid field name" });
        }
        const sqlPath = `$.${allowedFields[field]}`;
        sql = `
          SELECT
            id,
            metadata,
            metadata->>'$.fileName' AS fileName,
            metadata->>'$.title' AS title,
            metadata->>'$.organisation' AS organisation,
            metadata->>'$.creationDate' AS creationDate,
            metadata->>'$.original' AS original
          FROM powerpoint_metadata
          WHERE LOWER(metadata->>'${sqlPath}') LIKE LOWER(?)
          ORDER BY metadata->>'$.${sortField}'
          LIMIT ${limit} OFFSET ${offset}
        `;
        params = [like];
      }

      const [rows] = await db.execute(sql, params);
      res.json({ items: rows, limit, offset, sortField });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Database query failed" });
    }
  });

  router.get('/api/ppt/:id', requireDb, async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await db.execute(
        `SELECT * FROM powerpoint_metadata WHERE id = ?`,
        [id]
      );
      res.json(rows);
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Database query failed" });
    }
  });

  router.get('/api/ppt', requireDb, async (req, res) => {
    let limit = Number(req.query.limit) || 100;
    let offset = Number(req.query.offset) || 0;
    let sortField = req.query.sortField || 'title';

    limit = Math.max(1, Math.min(500, limit));
    offset = Math.max(0, offset);
    if (!allowedFields[sortField]) sortField = 'title';

    try {
      const [rows] = await db.execute(
        `
        SELECT
          id,
          metadata,
          metadata->>'$.fileName' AS fileName,
          metadata->>'$.title' AS title,
          metadata->>'$.organisation' AS organisation,
          metadata->>'$.creationDate' AS creationDate,
          metadata->>'$.original' AS original
        FROM powerpoint_metadata
        ORDER BY metadata->>'$.${sortField}'
        LIMIT ${limit} OFFSET ${offset}
        `
      );
      res.json({ items: rows, limit, offset, sortField });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Database query failed" });
    }
  });

  app.use(router);
}


/*
//import { Router } from 'express';
import express from 'express';
const router = express.Router();

export default function setupPowerpointRoutes(app, db) {
  const router = Router();

  function requireDb(_req, res, next) {
    if (!db) return res.status(503).json({ error: 'Database not connected' });
    next();
  }

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

  router.get('/api/ppt-search/:field/:searchValue', requireDb, async (req, res) => {
    const { field, searchValue } = req.params;
    const like = `%${searchValue}%`;
    let limit = Number(req.query.limit) || 100;
    let offset = Number(req.query.offset) || 0;
    let sortField = req.query.sortField || 'title';

    limit = Math.max(1, Math.min(500, limit));
    offset = Math.max(0, offset);
    if (!allowedFields[sortField]) sortField = 'title';

    try {
      let sql, params;

      if (field === 'any') {
        const paths = Object.values(allowedFields).map(f => `LOWER(metadata->>'$.${f}') LIKE LOWER(?)`);
        sql = `
          SELECT
            id,
            metadata,
            metadata->>'$.fileName' AS fileName,
            metadata->>'$.title' AS title,
            metadata->>'$.organisation' AS organisation,
            metadata->>'$.creationDate' AS creationDate,
            metadata->>'$.original' AS original
          FROM powerpoint_metadata
          WHERE ${paths.join(' OR ')}
          ORDER BY metadata->>'$.${sortField}'
          LIMIT ${limit} OFFSET ${offset}
        `;
        params = Array(paths.length).fill(like);
      } else {
        if (!allowedFields[field]) {
          return res.status(400).json({ error: "Invalid field name" });
        }
        const sqlPath = `$.${allowedFields[field]}`;
        sql = `
          SELECT
            id,
            metadata,
            metadata->>'$.fileName' AS fileName,
            metadata->>'$.title' AS title,
            metadata->>'$.organisation' AS organisation,
            metadata->>'$.creationDate' AS creationDate,
            metadata->>'$.original' AS original
          FROM powerpoint_metadata
          WHERE LOWER(metadata->>'${sqlPath}') LIKE LOWER(?)
          ORDER BY metadata->>'$.${sortField}'
          LIMIT ${limit} OFFSET ${offset}
        `;
        params = [like];
      }

      const [rows] = await db.execute(sql, params);
      res.json({ items: rows, limit, offset, sortField });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Database query failed" });
    }
  });


  router.get('/api/ppt/:id', requireDb, async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await db.execute(
        `SELECT * FROM powerpoint_metadata WHERE id = ?`,
        [id]
      );
      res.json(rows);
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Database query failed" });
    }
  });


  router.get('/api/ppt', requireDb, async (req, res) => {
    let limit = Number(req.query.limit) || 100;
    let offset = Number(req.query.offset) || 0;
    let sortField = req.query.sortField || 'title';

    limit = Math.max(1, Math.min(500, limit));
    offset = Math.max(0, offset);
    if (!allowedFields[sortField]) sortField = 'title';

    try {
      const [rows] = await db.execute(
        `
        SELECT
          id,
          metadata,
          metadata->>'$.fileName' AS fileName,
          metadata->>'$.title' AS title,
          metadata->>'$.organisation' AS organisation,
          metadata->>'$.creationDate' AS creationDate,
          metadata->>'$.original' AS original
        FROM powerpoint_metadata
        ORDER BY metadata->>'$.${sortField}'
        LIMIT ${limit} OFFSET ${offset}
        `
      );
      res.json({ items: rows, limit, offset, sortField });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Database query failed" });
    }
  });

  app.use(router);

}  
  */