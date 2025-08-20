// Import the file system module (fs)
import fs from 'fs';

// Read the json string from file
let json = fs.readFileSync('./powerpoint.json', 'utf-8');

// Convert from a string to a real data structure
let data = JSON.parse(json);

for (let powerpointMetadata of data.slice(0, 25)) {
  // extract the file name (the property digest + '.ppt)
  let fileName = powerpointMetadata.digest + '.ppt';


  // remove the unnecessary attributes
  delete powerpointMetadata.digest;
  delete powerpointMetadata.sha256;
  delete powerpointMetadata.sha512;
  delete powerpointMetadata.urlkey;
  delete powerpointMetadata.timestamp;

  // console.log things to see that we have correct 
  // filname and metadata
  // (that eventually want to write to the db)
  //console.log('');
  //console.log(fileName);
  //console.log(powerpointMetadata);

  // Check for different mime types
  // Create set of mime types in the JSON data
  let mimeTypes = new Set();
  for (let item of data) {
    if (item.mimetype) {
      mimeTypes.add(item.mimetype)
    }
  }

  //Identify non-standard data types for removal

  let toRemove = ['powerpoint', 'PowerPoint%202007%20File']

  let cleanedMimeTypes = [...mimeTypes]

    //Map the set
    .map(type => type
      //remove instances of the string "/application"
      .replace(/^(application\/)+/, ''))
    //filter out non-standard data types
    .filter(type => !toRemove.includes(type));

  cleanedMimeTypes = [...new Set(cleanedMimeTypes)];

  console.log(data)


}




// TODO: Do something like this to INSERT the data in our database
/*let result = await query(`
  INSERT INTO powerpoints (fileName, metadata)
  VALUES(?, ?)
`, [fileName, powerPointMetadata]);
console.log(result);*/