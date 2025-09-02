import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import exifr from 'exifr';

function toIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function toNumberOrNull(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export default function setupImageRestRoutes(app, db) {
  const router = Router();


  router.get('/api/image/metadata', async (_req, res) => {

    const imagesFolder = path.resolve(process.cwd(), '../dm23-jpgs');

    try {
      const files = fs.readdirSync(imagesFolder)
        .filter(f => /\.(jpe?g|tiff?|png|heic)$/i.test(f));

      const out = [];
      for (const file of files) {
        const fullPath = path.join(imagesFolder, file);
        try {
          const stat = fs.statSync(fullPath);
          const raw = await exifr.parse(fullPath);

          const make = raw?.Make ?? raw?.make ?? null;
          const model = raw?.Model ?? raw?.model ?? null;
          const createRaw = raw?.CreateDate ?? raw?.DateTimeOriginal ?? raw?.ModifyDate ?? null;
          const lat = raw?.GPSLatitude ?? raw?.latitude ?? raw?.Latitude ?? null;
          const lon = raw?.GPSLongitude ?? raw?.longitude ?? raw?.Longitude ?? null;

          out.push({
            file_name: file,
            file_path: fullPath,
            size_bytes: stat.size,
            mtime_iso: stat.mtime.toISOString(),
            make, model,
            create_date: toIsoOrNull(createRaw),
            latitude: toNumberOrNull(lat),
            longitude: toNumberOrNull(lon),
            raw
          });
        } catch (err) {
          out.push({ file_name: file, file_path: fullPath, error: err.message });
        }
      }


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


  router.get('/api/image/search', async (req, res) => {
    try {
      const {
        text = '', make = '', model = '', from = '', to = '',
        page = '1', pageSize = '20',
        nearLat = '', nearLon = '', radius = ''
      } = req.query;

      const limit = Math.min(parseInt(pageSize, 10) || 20, 100);
      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const offset = (pageNum - 1) * limit;

      const likeText = text ? `%${text}%` : '';
      const hasGeo = nearLat !== '' && nearLon !== '' && radius !== '';


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

      const cond = [];
      const whereParams = {};
      if (text) { cond.push(`(file LIKE :text OR make LIKE :text OR model LIKE :text)`); whereParams.text = likeText; }
      if (make) { cond.push(`make = :make`); whereParams.make = make; }
      if (model) { cond.push(`model = :model`); whereParams.model = model; }
      if (from) { cond.push(`create_date IS NOT NULL AND create_date >= :from`); whereParams.from = from; }
      if (to) { cond.push(`create_date IS NOT NULL AND create_date <= :to`); whereParams.to = to; }
      const WHERE = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

      const relevanceParams = {
        textExact: text || '',
        textLike: likeText,
        makeExact: make || '',
        modelExact: model || ''
      };

      let dataSql = '';
      let countSql = '';
      let params = {};

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

      const [countRows] = await db.execute(countSql, params);
      const total = countRows?.[0]?.total ?? 0;
      const [rows] = await db.execute(dataSql, params);

      res.json({ type: 'image', total, page: pageNum, pageSize: limit, results: rows });
    } catch (err) {
      console.error('image search error:', err);
      res.status(500).json({ error: 'Image search failed', details: err.message });
    }
  });


  app.use(router);
}
