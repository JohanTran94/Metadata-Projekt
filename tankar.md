En specifik sök knapp istället för att det går på auto... gruppbeslut
Hur ha struktur framöver? mappar....
array i genre.. typ 2-3 som har mer än en. sätta som regel att bara visa den första? 
Fixat med JSON_UNQUOTE(JSON_EXTRACT(meta, '$.common.genre[0]')) AS genre,
Bryt ut med import enl Thomas exempel 28 aug. Snällt mot allt och alla
plocka ut bpm för att kunna "räkna" med det. kul? 
Hantera tomma fält. "Saknas" eller något annat generiskt

















Överblick;

mp3.js--> startar servern & api
test-mp3-raw-data.json--> dåligt namn, byt. Läser in till  DB och skapar table
mp3.html--> det visuella för användaren, basic structure
mp3-client.js--> nyttjar api och pratar med html
mp3.css--> visuellt, inte viktigt nu.