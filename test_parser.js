const fs = require('fs');
const sheetData = JSON.parse(fs.readFileSync('sheet_data.json', 'utf8')).values;

const IGNORED_LABELS = [
  "DAY 1", "DAY 2", "DAY 3", "DAY 4", "DAY 5", "DAY 6", "DAY 7",
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
  "TYPE OF MICROCYCLE", "DATE", "MICROCYCLE", "MACRO"
];

function isValidSessionCell(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim().toUpperCase();
  if (t === '') return false;
  if (t === 'PRACTICE') return false; 
  if (t === 'MORNING PRACTICE' || t === 'EVENING PRACTICE') return false;
  if (IGNORED_LABELS.some(label => t === label || t.includes(label))) return false;
  return true;
}

function parseCellText(text, defaultSlot) {
  if (!text || text.trim() === '') return undefined;
  return { type: "PRACTICE", title: text.trim(), slot: defaultSlot };
}

function extractMatrixEvents(rows, teamId) {
  const parsedEvents = [];
  let i = 0;

  while (i < rows.length) {
    const row = rows[i];
    if (!row) {
      i++;
      continue;
    }

    const isDateRow = row.some(
      (cell) => typeof cell === "string" && (cell.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) || cell.toUpperCase() === "DATE")
    );

    if (isDateRow) {
      const dates = [];
      for (let c = 0; c < row.length; c++) {
        const cellText = typeof row[c] === 'string' ? row[c] : '';
        const match = cellText.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        if (match) {
          let [_, day, month, year] = match;
          if (year.length === 2) year = "20" + year;
          dates[c] = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
      }

      let morningRowIndex = -1;
      let eveningRowIndex = -1;
      const startScan = Math.max(0, i - 10);
      const endScan = Math.min(rows.length - 1, i + 10);

      for (let j = startScan; j <= endScan; j++) {
        const subRow = rows[j];
        if (!subRow) continue;

        const rowLabel = (subRow[2] || '').toString().toUpperCase().trim().replace(/\n/g, ' ');
        if (rowLabel === 'MORNING PRACTICE' || (rowLabel.includes('AM') && rowLabel.includes('PRACTICE'))) {
          morningRowIndex = j;
        }
        if (rowLabel === 'EVENING PRACTICE' || (rowLabel.includes('PM') && rowLabel.includes('PRACTICE'))) {
          eveningRowIndex = j;
        }
      }

      if (morningRowIndex >= 0) {
        const mRow = rows[morningRowIndex];
        for (let c = 0; c < dates.length; c++) {
          if (dates[c] && isValidSessionCell(mRow[c])) {
            const event = parseCellText(mRow[c], 'AM');
            if (event && event.type) {
              parsedEvents.push({ date: dates[c], title: event.title, col: c });
            }
          }
        }
      }
    }
    i++;
  }

  return parsedEvents;
}

console.log(extractMatrixEvents(sheetData, 'TEAM1'));
