import express from 'express';
import fs from 'fs';
import path from 'path';
import exifr from 'exifr';

/**
 * Safely convert a date-like value to ISO 8601 (or null if invalid).
 * EXIF dates come in various shapes; this normalizes them for storage/search.
 */
function toIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Convert a numeric-like value to Number (or null if not parseable).
 */
function toNumberOrNull(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * Convert GPS coordinates provided as DMS (degrees, minutes, seconds) or as a
 * flexible string (e.g., "59; 20; 30" or "59,20,30" or "59 20 30") into a decimal degree.
 * If ref is 'S' or 'W', the value is negated.
 * Returns:
 *   - decimal number if conversion succeeds
 *   - null if it cannot interpret the input
 */
function dmsToDecFlexible(v, ref) {
  if (v == null) return null;

  // If EXIF lib delivered a string, split on common separators into D/M/S
  if (typeof v === 'string') {
    const parts = v.split(/[;,\s]+/).filter(Boolean).map(Number);
    if (parts.length >= 3) v = parts.slice(0, 3);
    else return null;
  }

  // If it's an array [deg, min, sec]
  if (Array.isArray(v)) {
    const [d, m, s] = v.map(Number);
    if (![d, m, s].every(n => Number.isFinite(n))) return null;
    const sign = (ref === 'S' || ref === 'W') ? -1 : 1;
    return sign * (d + m / 60 + s / 3600);
  }

  // Already a single number? Accept if finite.
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Registers image-related REST endpoints on the provided Express app.
 * Endpoints:
 *   - GET /api/image/metadata
 *       Extract EXIF from all images in warehouse/image → write metadata.json and return JSON
 *   - GET /api/image/search
 *       Search images by text/make/model/date; optionally filter by geo radius
 *   - GET /api/image/meta/:id
 *       Get a single image row's meta (parsed from JSON) by DB id
 */
export default function setupImageRestRoutes(app, db) {
  const router = express.Router();

  /**
   * GET /api/image/metadata
   * Scans the warehouse/image folder, reads EXIF via exifr, normalizes key fields,
   * persists an aggregated metadata.json at project root, and returns the array.
   *
   * Fields pushed per file:
   *  - file_name, file_path, size_bytes, mtime_iso
   *  - make, model, create_date (ISO)
   *  - latitude, longitude (decimal; derived from direct fields or GPS DMS)
   *  - raw (the full EXIF object for transparency/debugging)
   */
  router.get('/api/image/metadata', async (_req, res) => {
    const imagesFolder = path.resolve(process.cwd(), './warehouse/image');

    try {
      // Collect candidate files by extension
      const files = fs.readdirSync(imagesFolder)
        .filter(f => /\.(jpe?g|tiff?|png|heic)$/i.test(f));

      const out = [];
      for (const file of files) {
        const fullPath = path.join(imagesFolder, file);
        try {
          const stat = fs.statSync(fullPath);
          // Parse EXIF (exifr returns a large object with Make/Model/GPS/Date fields)
          const raw = await exifr.parse(fullPath);

          // EXIF fields can vary in casing depending on the file/camera/library
          const make = raw?.Make ?? raw?.make ?? null;
          const model = raw?.Model ?? raw?.model ?? null;

          // Pick the most reliable creation timestamp available
          const createRaw = raw?.CreateDate ?? raw?.DateTimeOriginal ?? raw?.ModifyDate ?? null;

          // Prefer decimal lat/lon if available, otherwise convert from GPS DMS
          let lat = raw?.latitude ?? raw?.Latitude ?? null;
          let lon = raw?.longitude ?? raw?.Longitude ?? null;

          if (lat == null) lat = dmsToDecFlexible(raw?.GPSLatitude, raw?.GPSLatitudeRef);
          if (lon == null) lon = dmsToDecFlexible(raw?.GPSLongitude, raw?.GPSLongitudeRef);

          out.push({
            file_name: file,
            file_path: fullPath,
            size_bytes: stat.size,
            mtime_iso: stat.mtime.toISOString(),
            make,
            model,
            create_date: toIsoOrNull(createRaw),
            latitude: lat,
            longitude: lon,
            raw
          });
        } catch (err) {
          // Keep going even if one file fails; include the error for visibility
          out.push({ file_name: file, file_path: fullPath, error: err.message });
        }
      }

      // Persist a top-level metadata.json snapshot (useful for debugging and import)
      fs.writeFileSync(
        path.resolve(process.cwd(), 'metadata.json'),
        JSON.stringify(out, null, 2),
        'utf-8'
      );

      res.json(out);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read images folder', details: err.message });
    }
  });

  /**
   * GET /api/image/search
   * Query params:
   *   text     : fuzzy match on file/make/model
   *   make     : fuzzy match on make
   *   model    : fuzzy match on model
   *   from,to  : date range filter (inclusive) on create_date (expects ISO yyyy-mm-dd)
   *   page,pageSize : pagination (server clamps pageSize to <=100)
   *   nearLat, nearLon, radius : if all present → apply Haversine distance filter (km)
   *
   * Returns: { type, total, page, pageSize, results[] }
   * Notes:
   *   - Uses JSON_EXTRACT to read fields from a JSON column `meta`.
   *   - Relevance ordering: exact/like matches first, then (if geo) nearest distance,
   *     then most recent create_date.
   */
  router.get('/api/image/search', async (req, res) => {
    try {
      const {
        text = '', make = '', model = '', from = '', to = '',
        page = '1', pageSize = '20',
        nearLat = '', nearLon = '', radius = ''
      } = req.query;

      // Pagination guards
      const limit = Math.min(parseInt(pageSize, 10) || 20, 100);
      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const offset = (pageNum - 1) * limit;

      const likeText = text ? `%${text}%` : '';
      const hasGeo = nearLat !== '' && nearLon !== '' && radius !== '';

      // Columns to project (some are extracted from JSON `meta`, with fallbacks)
      const COLS = `
        id,
        file,
        file AS file_name,

        JSON_UNQUOTE(COALESCE(
          JSON_EXTRACT(meta,'$.file_path'),
          JSON_EXTRACT(meta,'$.raw.SourceFile')
        )) AS file_path,

        JSON_UNQUOTE(COALESCE(
          JSON_EXTRACT(meta,'$.make'),
          JSON_EXTRACT(meta,'$.raw.Make')
        )) AS make,

        JSON_UNQUOTE(COALESCE(
          JSON_EXTRACT(meta,'$.model'),
          JSON_EXTRACT(meta,'$.raw.Model')
        )) AS model,

        JSON_UNQUOTE(COALESCE(
          JSON_EXTRACT(meta,'$.create_date'),
          JSON_EXTRACT(meta,'$.raw.CreateDate'),
          JSON_EXTRACT(meta,'$.raw.DateTimeOriginal'),
          JSON_EXTRACT(meta,'$.raw.ModifyDate')
        )) AS create_date,

        COALESCE(
          JSON_EXTRACT(meta,'$.raw.ImageWidth'),
          JSON_EXTRACT(meta,'$.raw.ExifImageWidth'),
          JSON_EXTRACT(meta,'$.raw.PixelXDimension')
        ) AS width,

        COALESCE(
          JSON_EXTRACT(meta,'$.raw.ImageHeight'),
          JSON_EXTRACT(meta,'$.raw.ExifImageHeight'),
          JSON_EXTRACT(meta,'$.raw.PixelYDimension')
        ) AS height,

        CAST(COALESCE(
          JSON_EXTRACT(meta,'$.latitude'),
          JSON_EXTRACT(meta,'$.raw.GPSLatitude'),
          JSON_EXTRACT(meta,'$.raw.Latitude')
        ) AS DECIMAL(12,8)) AS latitude,

        CAST(COALESCE(
          JSON_EXTRACT(meta,'$.longitude'),
          JSON_EXTRACT(meta,'$.raw.GPSLongitude'),
          JSON_EXTRACT(meta,'$.raw.Longitude')
        ) AS DECIMAL(12,8)) AS longitude
      `;

      const BASE = `SELECT ${COLS} FROM image_metadata`;

      // Build WHERE conditions + named params
      const cond = [];
      const whereParams = {};

      if (text) {
        cond.push(`(
    LOWER(file)  LIKE LOWER(:text) OR
    LOWER(make)  LIKE LOWER(:text) OR
    LOWER(model) LIKE LOWER(:text)
  )`);
        whereParams.text = `%${text}%`;
      }
      if (make) {
        cond.push(`LOWER(make) LIKE LOWER(:make)`);
        whereParams.make = `%${make}%`;
      }
      if (model) {
        cond.push(`LOWER(model) LIKE LOWER(:model)`);
        whereParams.model = `%${model}%`;
      }
      if (from) {
        cond.push(`create_date IS NOT NULL AND create_date >= :from`);
        whereParams.from = from;
      }
      if (to) {
        cond.push(`create_date IS NOT NULL AND create_date <= :to`);
        whereParams.to = to;
      }
      const WHERE = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

      // Params that influence ORDER BY relevance
      const relevanceParams = {
        textExact: text || '',
        textLike: likeText,
        makeExact: make || '',
        modelExact: model || ''
      };

      let dataSql = '';
      let countSql = '';
      let params = {};

      // If geo filter requested, compute distance with Haversine (in km)
      if (hasGeo) {
        dataSql = `
          WITH base AS (${BASE})
          SELECT b.*,
            (6371 * ACOS(
              COS(RADIANS(:nearLat)) * COS(RADIANS(b.latitude)) *
              COS(RADIANS(b.longitude) - RADIANS(:nearLon)) +
              SIN(RADIANS(:nearLat)) * SIN(RADIANS(b.latitude))
            )) AS distance_km
          FROM base b
          ${WHERE ? WHERE : ''}
          WHERE b.latitude IS NOT NULL AND b.longitude IS NOT NULL
          HAVING distance_km <= :radius
          ORDER BY
            (b.file = :textExact) DESC,
            (b.file LIKE :textLike) DESC,
            (b.make = :makeExact) DESC,
            (b.model = :modelExact) DESC,
            distance_km ASC,
            b.create_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countSql = `
          WITH base AS (${BASE})
          SELECT COUNT(*) AS total
          FROM (
            SELECT
              (6371 * ACOS(
                COS(RADIANS(:nearLat)) * COS(RADIANS(b.latitude)) *
                COS(RADIANS(b.longitude) - RADIANS(:nearLon)) +
                SIN(RADIANS(:nearLat)) * SIN(RADIANS(b.latitude))
              )) AS distance_km
            FROM base b
            ${WHERE ? WHERE : ''}
            WHERE b.latitude IS NOT NULL AND b.longitude IS NOT NULL
          ) x
          WHERE distance_km <= :radius
        `;
        params = {
          ...whereParams, ...relevanceParams,
          nearLat: Number(nearLat),
          nearLon: Number(nearLon),
          radius: Number(radius)
        };
      } else {
        // Non-geo search: simple relevance + recency ordering
        dataSql = `
          WITH base AS (${BASE})
          SELECT b.*
          FROM base b
          ${WHERE ? WHERE : ''}
          ORDER BY
            (b.file = :textExact) DESC,
            (b.file LIKE :textLike) DESC,
            (b.make = :makeExact) DESC,
            (b.model = :modelExact) DESC,
            b.create_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countSql = `
          WITH base AS (${BASE})
          SELECT COUNT(*) AS total
          FROM base b
          ${WHERE ? WHERE : ''}
        `;
        params = { ...whereParams, ...relevanceParams };
      }

      // Run count query first for pagination metadata
      const [countRows] = await db.execute(countSql, params);
      const total = countRows?.[0]?.total ?? 0;

      // Fetch the actual page of results
      const [rows] = await db.execute(dataSql, params);

      res.json({ type: 'image', total, page: pageNum, pageSize: limit, results: rows });
    } catch (err) {
      console.error('image search error:', err);
      res.status(500).json({ error: 'Image search failed', details: err.message });
    }
  });

  /**
   * GET /api/image/meta/:id
   * Fetch a single row's JSON metadata from the DB by internal numeric ID.
   * The `meta` column is stored as JSON (or stringified JSON) — we parse it if needed.
   */
  router.get('/api/image/meta/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const [rows] = await db.execute(
        `SELECT id, file, meta
       FROM image_metadata
       WHERE id = ? LIMIT 1`,
        [id]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Not found' });
      }

      const row = rows[0];

      // meta may already be an object (JSON column) or a string (TEXT/VARCHAR)
      let meta = row.meta;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch { /* fall through with raw string */ }
      }

      res.json({ id: row.id, file: row.file, meta });
    } catch (err) {
      console.error('get meta error:', err);
      res.status(500).json({ error: 'Failed to fetch metadata', details: err.message });
    }
  });

  // Register router on the app
  app.use(router);
}
