En specifik sök knapp istället för att det går på auto... enter? gruppbeslut
Hur ha struktur framöver? mappar....
array i genre.. typ 2-3 som har mer än en. sätta som regel att bara visa den första? 
Fixat med JSON_UNQUOTE(JSON_EXTRACT(meta, '$.common.genre[0]')) AS genre,
Bryt ut med import enl Thomas exempel 28 aug. Snällt mot allt och alla
plocka ut bpm för att kunna "räkna" med det. kul? 
Hantera tomma fält. "Saknas" eller något annat generiskt
få musikspelaren att följa med på sidan?
"sökfältet" följer med fast man scrollar ner på sidan
PLAY/PAUSE button. just nu bara play. nice to have? svårt? 


Startsida.
"välkommen blabla"
Här kan man klicka in på specifika sökmotorer baserat på fil, dropdown?
klick på mp3-->mp3.html laddas. Här finns också en "tillbaka" knapp till huvudmenyn. 

Hur hantera data och import för Thomas? 


Överblick;

mp3.js--> startar servern & api
test-mp3-raw-data.json--> dåligt namn, byt. Läser in till  DB och skapar table
mp3.html--> det visuella för användaren, basic structure
mp3-client.js--> nyttjar api och pratar med html
mp3.css--> visuellt, inte viktigt nu.




bryta ut api/rest routes 