const fs = require('fs');
const sheetData = JSON.parse(fs.readFileSync('sheet_data.json', 'utf8')).values;

function isValidSessionCell(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim().toUpperCase();
  if (t === '') return false;
  if (t === 'PRACTICE') return false; 
  if (t === 'MORNING PRACTICE' || t === 'EVENING PRACTICE') return false;
  return true;
}

let events = [];
let i = 0;
while (i < sheetData.length) {
  const row = sheetData[i];
  if (!row) { i++; continue; }
  
  const isDateRow = row.some(cell => typeof cell === "string" && (cell.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) || cell.toUpperCase() === "DATE"));
  
  if (isDateRow) {
    const dates = [];
    for (let c = 0; c < row.length; c++) {
      const match = typeof row[c] === 'string' ? row[c].match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/) : null;
      if (match) {
        let [_, day, month, year] = match;
        if (year.length === 2) year = "20" + year;
        dates[c] = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
    
    console.log(`Found Date Row at i=${i}. Dates array has length ${dates.length}`);

    let mIdx = -1, eIdx = -1;
    for (let j = Math.max(0, i-10); j <= Math.min(sheetData.length-1, i+10); j++) {
      const subRow = sheetData[j];
      if (!subRow) continue;
      const label = (subRow[2] || '').toString().toUpperCase().trim().replace(/\n/g, ' ');
      if (label === 'MORNING PRACTICE' || (label.includes('AM') && label.includes('PRACTICE'))) mIdx = j;
      if (label === 'EVENING PRACTICE' || (label.includes('PM') && label.includes('PRACTICE'))) eIdx = j;
    }
    
    console.log(`  mIdx = ${mIdx}, eIdx = ${eIdx}`);
    if (mIdx >= 0) {
      const mRow = sheetData[mIdx];
      for (let c = 0; c < dates.length; c++) {
         if (dates[c]) {
           const rawText = mRow[c];
           console.log(`    Date: ${dates[c]} | Raw: '${rawText}' | Valid: ${isValidSessionCell(rawText)}`);
         }
      }
    }
  }
  i++;
}
