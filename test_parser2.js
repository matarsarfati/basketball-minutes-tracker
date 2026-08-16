const fs = require('fs');
const sheetData = JSON.parse(fs.readFileSync('sheet_data.json', 'utf8')).values;

let i = 0;
while (i < sheetData.length) {
  const row = sheetData[i] || [];
  const isDateRow = row.some(cell => typeof cell === "string" && (cell.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) || cell.toUpperCase() === "DATE"));
  
  if (isDateRow) {
    console.log("Found Date Row at", i, ":", row);
    
    // Find morning
    let morningRowIndex = -1;
    for (let j = Math.max(0, i - 10); j <= Math.min(sheetData.length - 1, i + 10); j++) {
      const subRow = sheetData[j] || [];
      const rowLabel = (subRow[2] || '').toString().toUpperCase().trim().replace(/\n/g, ' ');
      if (rowLabel === 'MORNING PRACTICE') {
        morningRowIndex = j;
        console.log("  Found Morning Row at", j, ":", subRow);
      }
    }
  }
  i++;
}
