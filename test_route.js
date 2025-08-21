// Import the file system module (fs)
import fs from 'fs';

// Read the json string from file
let json = fs.readFileSync('./powerpoint.json', 'utf-8');

// Convert from a string to a real data structure
let data = JSON.parse(json);

for (let powerpointMetadata of data.slice(0, 5)) {

  // extract the file name (the property digest + '.ppt)
  let fileName = powerpointMetadata
    .digest + '.ppt'

  // add file name to attributes
  powerpointMetadata
    .file_name = fileName

  // clean mimetype and whitespace
  let cleanedMimeType = (powerpointMetadata.mimetype || '')
    .replace(/^(application\/+)/, '')
    .trim();

  // add cleaned mime type to the metadata
  powerpointMetadata
    .mimetype = cleanedMimeType

  // remove unnecessary attributes
  delete powerpointMetadata.digest;
  delete powerpointMetadata.sha256;
  delete powerpointMetadata.sha512;
  delete powerpointMetadata.urlkey;
  delete powerpointMetadata.timestamp;


  let newJson = JSON.stringify(powerpointMetadata, null, '  ');

  fs.writeFileSync('./newJson.json', newJson, 'utf-8');





  // console.log things to see that we have correct 
  // filname and metadata
  // (that eventually want to write to the db)
  //console.log('');
  //console.log(fileName);
  //console.log(powerpointMetadata);


}

/*
// TODO: Do something like this to INSERT the data in our database
/*let result = await query(`
  INSERT INTO powerpoints (fileName, metadata)
  VALUES(?, ?)
`, [fileName, powerPointMetadata]);
console.log(result);


//Identify non-standard data types for removal
let toRemove = ['powerpoint', 'PowerPoint%202007%20File']

// Check for different mime types
// Create set of mime types found in the JSON data
let mimeTypes = new Set();
for (let item of data) {
  if (item.mimetype) {
    mimeTypes.add(item.mimetype)
  }

  let cleanedMimeTypes = [...mimeTypes]

    //Map the set
    

  cleanedMimeTypes = [...new Set(cleanedMimeTypes)];



.map(powerpointMetadata => powerpointMetadata
      //remove instances of the string "/application"
      .replace(/^(application\/)+/, ''))
    //filter out non-standard data types
    .filter(powerpointMetadata => !toRemove.includes(powerpointMetadata));*/