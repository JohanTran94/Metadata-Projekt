// Import the file system module (fs)
import fs from 'fs';

// Read the json string from file
let json = fs.readFileSync('./pp-json-from-csv.json', 'utf-8');

// Convert from a string to a real data structure
let data = JSON.parse(json);


for (let powerpointMetadata of data) {
  // extract the file name (the property digest + '.ppt)
  let fileName = powerpointMetadata.digest + '.ppt';

  // remove the file name
  delete powerpointMetadata.digest;

  // remove sha hashes as well (only needed for file authenticy checks)
  delete powerpointMetadata.sha256;
  delete powerpointMetadata.sha512;

  // console.log things to see that we have correct 
  // filname and metadata
  // (that eventually want to write to the db)
  console.log('');
  console.log(fileName);
  console.log(powerpointMetadata);

  // TODO: Do something like this to INSERT the data in our database
  /*let result = await query(`
    INSERT INTO powerpoints (fileName, metadata)
    VALUES(?, ?)
  `, [fileName, powerPointMetadata]);
  console.log(result);*/

}