import { scheduleService } from './scheduleService';

const API_BASE = 'http://localhost:5174/api/sheets';

const EVENT_KEYWORDS = {
  GAME_DAY: ["GAME", "MATCH", "FRIENDLY", "CUP", "LEAGUE", "משחק", "משחק אימון", "משחק ליגה", "גביע", "דרבי"],
  RECOVERY: ["RECOVERY", "REHAB", "REST", "POOL", "COLD TUB", "ICE", "MOBILITY", "התאוששות", "שיקום", "בריכה", "מתיחות", "אמבטיית קרח"],
  OFF_DAY: ["DAY OFF", "OFF", "HOLIDAY", "VACATION", "HOLIDAYS", "יום חופש", "חופש", "מנוחה", "חג"],
  TESTING: ["TESTS", "TESTING", "ASSESSMENT", "BEEP TEST", "1RM", "JUMP TEST", "VO2MAX", "טסטים", "מבחנים", "מדידות", "בדיקות"],
  MEETING: ["VIDEO", "MEETING", "SCOUTING", "TACTICAL PREP", "FILM", "וידאו", "אסיפה", "תדריך", "סקאוטינג", "פגישה"]
};

const GYM_KEYWORDS = ["SPLIT PRACTICE", "STRENGTH", "WEIGHTS", "GYM", "LIFTING", "INJURY PREV", "CORE", "POWER", "HYPERTROPHY", "חדר כושר", "כוח", "משקולות", "מניעת פציעות", "חיזוקים", "ליבה", "כוח מתפרץ"];

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
  if (!text || text.trim() === '') return null;
  const upperText = text.toUpperCase();

  let type = "PRACTICE";
  for (const [key, keywords] of Object.entries(EVENT_KEYWORDS)) {
    if (keywords.some(kw => upperText.includes(kw))) {
      type = key;
      break;
    }
  }

  const isGym = GYM_KEYWORDS.some(kw => upperText.includes(kw));

  const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const time = timeMatch ? timeMatch[0] : (defaultSlot === 'AM' ? '09:30' : '18:00');

  return {
    type,
    isGym,
    title: text.trim(),
    startTime: time,
    slot: defaultSlot,
    parts: [] // Ensures structural metrics aggregate cleanly into 0m instead of NaNm
  };
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
      // Start scan from precisely the surrounding block, but don't overwrite if we find another microcycle header
      const startScan = Math.max(0, i - 5);
      const endScan = Math.min(rows.length - 1, i + 8);

      for (let j = startScan; j <= endScan; j++) {
        const subRow = rows[j];
        if (!subRow) continue;

        // The exact API return payload consistently nests the row label blocks inside Column C (Index 2)
        const rowLabel = (subRow[2] || '').toString().toUpperCase().trim().replace(/\n/g, ' ');
        if (morningRowIndex === -1 && (rowLabel === 'MORNING PRACTICE' || (rowLabel.includes('AM') && rowLabel.includes('PRACTICE')))) {
          morningRowIndex = j;
        }
        if (eveningRowIndex === -1 && (rowLabel === 'EVENING PRACTICE' || (rowLabel.includes('PM') && rowLabel.includes('PRACTICE')))) {
          eveningRowIndex = j;
        }
      }

      if (morningRowIndex >= 0) {
        const mRow = rows[morningRowIndex];
        for (let c = 0; c < dates.length; c++) {
          if (dates[c]) {
            const rawText = mRow[c];
            const isValid = isValidSessionCell(rawText);
            console.log(`[MAPPER] DATE: ${dates[c]} | SLOT: AM | RAW: '${rawText}' | VALID: ${isValid}`);
            if (isValid) {
              const event = parseCellText(rawText, 'AM');
              if (event && event.type) {
                parsedEvents.push({ ...event, date: dates[c], teamId, created: new Date().toISOString(), sheetRef: `'PRE-SEASON PLAN'!${String.fromCharCode(65 + c)}${morningRowIndex + 1}` });
                console.log(`         -> Registered: ${event.title} (${event.type})`);
              }
            }
          }
        }
      }

      if (eveningRowIndex >= 0) {
        const eRow = rows[eveningRowIndex];
        for (let c = 0; c < dates.length; c++) {
          if (dates[c]) {
            const rawText = eRow[c];
            const isValid = isValidSessionCell(rawText);
            console.log(`[MAPPER] DATE: ${dates[c]} | SLOT: PM | RAW: '${rawText}' | VALID: ${isValid}`);
            if (isValid) {
              const event = parseCellText(rawText, 'PM');
              if (event && event.type) {
                parsedEvents.push({ ...event, date: dates[c], teamId, created: new Date().toISOString(), sheetRef: `'PRE-SEASON PLAN'!${String.fromCharCode(65 + c)}${eveningRowIndex + 1}` });
                console.log(`         -> Registered: ${event.title} (${event.type})`);
              }
            }
          }
        }
      }
    }
    i++;
  }

  return parsedEvents;
}

export async function syncScheduleWithGoogleSheets(teamId) {
  console.log("--- SYNC START ---");
  const spreadsheetId = process.env.REACT_APP_GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error("REACT_APP_GOOGLE_SHEET_ID is missing in .env.local");
  }

  const range = "'PRE-SEASON PLAN'!A1:Z100";
  console.log(`1. Fetching Sheet Data: ${range} for team ${teamId}`);
  let res;
  try {
    res = await fetch(`${API_BASE}/read?spreadsheetId=${spreadsheetId}&range=${encodeURIComponent(range)}&teamId=${teamId}`);
  } catch (error) {
    console.error("Fetch Network Failure:", error);
    alert(`Fetch failed entirely. Backend server running? ${error.message}`);
    throw error;
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.details?.message || errData.details || errData.error || 'Failed to read from Google Sheets API');
  }
  const data = await res.json();
  const rows = data.values || [];
  console.log(`2. Data fetched successfully. Rows returned: ${rows.length}`);
  console.log('Raw Sheet Grid:', rows);

  console.log("3. Passing to extractMatrixEvents()...");
  const parsedEvents = extractMatrixEvents(rows, teamId);
  console.log(`4. Parsed Events fully returned from matrix: ${parsedEvents.length} events`, parsedEvents);

  if (parsedEvents.length === 0) {
    alert("No valid events were mapped by the parsing strictures.");
    return { added: 0, totalFound: 0 };
  }

  console.log("5. Fetching existing events for Nuclear Wipe from Firestore...");
  const existingEvents = await scheduleService.getScheduleEvents(teamId);
  console.log(`-> Loaded ${existingEvents.length} existing events.`);

  if (existingEvents.length > 0) {
    console.log(`6. Initiating batch deletion against ${existingEvents.length} distinct docs...`);
    try {
      await scheduleService.deleteScheduleEventsBatch(existingEvents.map(e => e.firebaseId), teamId);
      console.log("-> Batch Delete COMPLETED successfully.");
    } catch (e) {
      console.error("BATCH DELETE FAILED UNEXPECTEDLY:", e);
      alert(`Delete chunk failed! ${e.message}`);
      throw e;
    }
  }

  console.log(`7. Initiating batch WRITE for ${parsedEvents.length} totally new events...`);
  if (parsedEvents.length > 0) {
    // Deduplicate parsed events natively by Key just in case layout duplicates them on same day/slot
    const deduplicatedEvents = [];
    const internalSet = new Set();
    for (const e of parsedEvents) {
      const key = `${e.date}|${e.slot}|${e.type}`;
      if (!internalSet.has(key)) {
        internalSet.add(key);
        deduplicatedEvents.push(e);
      }
    }

    try {
      await scheduleService.addScheduleEventsBatch(deduplicatedEvents, teamId);
      console.log(`-> Batch Write COMPLETED successfully for ${deduplicatedEvents.length} unique items.`);
    } catch (e) {
      console.error("BATCH WRITE FAILED UNEXPECTEDLY:", e);
      alert(`Write chunk failed! ${e.message}`);
      throw e;
    }
  }

  console.log("--- SYNC END ---");
  return { added: parsedEvents.length, totalFound: parsedEvents.length };
}

export async function pushUpdateToGoogleSheets(spreadsheetId, sheetRef, value) {
  const res = await fetch(`${API_BASE}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spreadsheetId,
      range: sheetRef,
      values: [[value]], teamId: localStorage.getItem('activeTeamId')
    })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.details?.message || errData.details || errData.error || 'Failed to write to Google Sheets');
  }
  return res.json();
}
