const fs = require('fs');
const sheetData = JSON.parse(fs.readFileSync('sheet_data.json', 'utf8')).values;
console.log("Rows: ", sheetData.length);

for (let i=0; i<10; i++) {
  const row = sheetData[i] || [];
  const hasDate = row.some(cell => typeof cell === "string" && (cell.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) || cell.toUpperCase() === "DATE"));
  console.log("Row", i, "hasDate?", hasDate);
}
