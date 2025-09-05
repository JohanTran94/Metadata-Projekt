export default function powerpointRoute(app, db) {

  app.get('/api/ppt-search/:field/:searchValue', async (req, res) => {
    // get field and searhValue from the request parameters
    const { field, searchValue } = req.params;
    /*
      // check that field is a valid field, if not do nothing
      if (!['title', 'album', 'artist', 'genre'].includes(field)) {
        res.json({ error: 'Invalid field name!' });
        return;
      }
      */

    // run the db query as a prepared statement
    const [result] = await db.execute(`
    SELECT id,
	    metadata->>'$.fileName' AS fileName,
      metadata->>'$.title' AS title,
      metadata->>'$.company' AS company,
      metadata->>'$.creationDate' AS creationDate,
      metadata->>'$.original' AS original
    FROM powerpoint_metadata
    WHERE LOWER (metadata->>'${field}') LIKE LOWER(?)
 `, ['%' + searchValue + '%']
    );

    //return the result as json
    res.json(result);
  });

}
