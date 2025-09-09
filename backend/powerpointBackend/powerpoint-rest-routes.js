export default function powerpointRoute(app, db) {

  app.get('/api/ppt-search/:field/:searchValue', async (req, res) => {

    const allowedFields = {
      company: "company",
      creationDate: "creationDate",
      fileName: "fileName",
      fileSize: "fileSize",
      id: "id",
      lastModified: "lastModified",
      mimetype: "mimetype",
      original: "original",
      revisionNumber: "revisionNumber",
      slideCount: "slideCount",
      title: "title",
      wordCount: "wordCount"
    };

    // get field and searhValue from the request parameters
    const { field, searchValue } = req.params;

    if (!allowedFields[field]) {
      res
        .status(400)
        .json({ error: "Invalid field name" });
      return;
    }

    const sqlPath = `$.${allowedFields[field]}`;

    try {

      const [result] = await db
        .execute(
          `
  SELECT id, metadata,
         metadata->>'$.fileName' AS fileName,
         metadata->>'$.title' AS title,
         metadata->>'$.company' AS company,
         metadata->>'$.creationDate' AS creationDate,
         metadata->>'$.original' AS original
  FROM powerpoint_metadata
  WHERE LOWER(metadata->>'${sqlPath}') LIKE LOWER(?)
  LIMIT 5
  `,
          [`%${searchValue}%`]
        );
      res
        .json(result);

    } catch (err) {
      console
        .error("Database error:", err);
      res
        .status(500)
        .json({ error: "Database query failed" });
    }
  });
}
