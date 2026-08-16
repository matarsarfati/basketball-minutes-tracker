const fs = require('fs');

const path = 'src/SchedulePlanner.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
content = content.replace(
  "import { scheduleService } from './services/scheduleService';",
  "import { scheduleService } from './services/scheduleService';\nimport { syncScheduleWithGoogleSheets, pushUpdateToGoogleSheets } from './services/googleSheetsService';"
);

// 2. Add sheet sync state
content = content.replace(
  "const [isSyncing, setIsSyncing] = useState(false);",
  "const [isSyncing, setIsSyncing] = useState(false);\n  const [isSyncingSheets, setIsSyncingSheets] = useState(false);\n  const sheetUpdateTimeoutRef = useRef({});"
);

// 3. Add handleSyncGoogleSheets function
const syncFunctionCode = `
  const handleSyncGoogleSheets = async () => {
    if (!activeTeam?.id) return;
    setIsSyncingSheets(true);
    try {
      const result = await syncScheduleWithGoogleSheets(activeTeam.id);
      alert(\`Sync Complete! Added \${result.added} new events (Total processed: \${result.totalFound})\`);
      // Reload sessions
      const events = await scheduleService.getScheduleEvents(activeTeam.id);
      setSessions(
        events.map(e => ({
          ...e,
          id: e.id || Math.random().toString(),
          parts: Array.isArray(e.parts) ? e.parts : []
        }))
      );
    } catch (error) {
      console.error(error);
      alert("Failed to sync with Google Sheets: " + error.message);
    } finally {
      setIsSyncingSheets(false);
    }
  };
`;
content = content.replace(
  "const handleGenerateSchedule = async () => {",
  syncFunctionCode + "\n  const handleGenerateSchedule = async () => {"
);

// 4. Update mutateSession to push updates to Google Sheets
const mutateSessionRegex = /(const mutateSession = useCallback\(async \(sessionId, mutator\) => \{)([\s\S]+?)(\/\/ Sync to Firebase)/;
content = content.replace(mutateSessionRegex, `$1$2
      // Google Sheets sync for title changes
      if (updated.sheetRef && session.title !== updated.title) {
        if (sheetUpdateTimeoutRef.current[updated.sheetRef]) {
          clearTimeout(sheetUpdateTimeoutRef.current[updated.sheetRef]);
        }
        sheetUpdateTimeoutRef.current[updated.sheetRef] = setTimeout(() => {
          pushUpdateToGoogleSheets(process.env.REACT_APP_GOOGLE_SHEET_ID, updated.sheetRef, updated.title)
            .catch(err => console.error("Sheets update failed:", err));
        }, 1000);
      }
      
      $3`);

// 5. Add button to nav
const buttonHtml = `          <button
            onClick={handleSyncGoogleSheets}
            className="btn btn-primary"
            style={{ backgroundColor: '#10b981', color: 'white' }}
            disabled={isSyncingSheets}
          >
            {isSyncingSheets ? "Syncing..." : "Sync with Sheets"}
          </button>`;
content = content.replace(
  '<button\n            onClick={() => navigate(\'/wellness\')}',
  buttonHtml + '\n          <button\n            onClick={() => navigate(\'/wellness\')}'
);

fs.writeFileSync(path, content, 'utf8');
