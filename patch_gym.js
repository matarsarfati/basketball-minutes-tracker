const fs = require('fs');
let code = fs.readFileSync('src/GymSurvey.jsx', 'utf8');

// Replace { sessionId } with nothing from url since SurveySessionSelector uses it
code = code.replace(/const \{ sessionId \} = useParams\(\);/, '');

// Apply imports
code = code.replace(/import \{ scheduleService \} from '\.\/services\/scheduleService';/, "import { scheduleService } from './services/scheduleService';\nimport SurveySessionSelector from './components/surveys/SurveySessionSelector';");

// Replace all usages of sessionId to use (activeSession?.id || activeSession?.firebaseId)
code = code.replace(/submitted\[sessionId\]/g, 'submitted[currentId]');
code = code.replace(/\[sessionId\]: /g, '[currentId]: ');
code = code.replace(/navigate\(\`\/practice\/\$\{sessionId\}\`\)/g, 'navigate(`/team/${activeTeam?.id}/practice/${currentId}`)');
code = code.replace(/practiceDataService\.updateSurveyResponse\(sessionId,/g, 'practiceDataService.updateSurveyResponse(currentId,');
code = code.replace(/practiceDataService\.subscribeToPracticeData\(\n\s*sessionId,/g, 'practiceDataService.subscribeToPracticeData(\n      currentId,');

const prefixIdx = code.indexOf('  useEffect(() => {\n    if (sessionId) return;\n    if (!activeTeam?.id) return;');
if(prefixIdx === -1) {
    console.log("NOT FOUND");
    process.exit(1);
}

const suffixIdx = code.indexOf('// Update handleSubmit to use Firebase');

const newBlock = `  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    if (!activeSession) return;

    const currentId = activeSession.id || activeSession.firebaseId;

    // Fetch Remote Data
    const loadRemoteData = async () => {
      setIsLoading(true);
      setDataError("");
      try {
        let practiceData;
        let allPlayers;
        
        try {
            const results = await Promise.all([
              practiceDataService.getPracticeData(currentId),
              rosterService.getPlayers()
            ]);
            practiceData = results[0];
            allPlayers = results[1];
        } catch (err) {
            console.error(err);
            allPlayers = [];
        }

        if (!practiceData) {
          // Initialize a blank state temporarily in memory representing the targeted ID
          practiceData = { attendance: {}, surveys: {}, metrics: {} };
        }

        const hasAttendance = practiceData.attendance && Object.keys(practiceData.attendance).length > 0;
        const present = allPlayers
          .filter(p => hasAttendance ? practiceData.attendance[p.name]?.present : true)
          .map(p => ({
            id: p.id,
            name: p.name,
            number: p.number,
            preferredLanguage: p.preferredLanguage || 'he'
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setPlayers(present);
      } catch (err) {
        console.error("Failed to load remote survey data:", err);
        setDataError("Failed to fetch session practice data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadRemoteData();
  }, [activeSession]);

`;

code = code.substring(0, prefixIdx) + newBlock + code.substring(suffixIdx);

// Fix layout return block
const returnIdx = code.indexOf('return (', suffixIdx);
const wrapCode = `  const currentId = activeSession?.id || activeSession?.firebaseId;

  return (
    <div className="flex flex-col flex-1 p-6">
      <SurveySessionSelector onSessionSelect={setActiveSession} />
      
      {activeSession ? (
        <div className="survey-form mx-auto w-full" style={{maxWidth: "500px"}}>
          <div className="survey-wrap">
            <div className="survey-card">
              <h1 className="text-xl font-bold mb-4">Gym Survey</h1>
`;

let topPart = code.substring(0, returnIdx);
const formStartIdx = code.indexOf('<form', returnIdx);

const finalCode = topPart + wrapCode + code.substring(formStartIdx, code.lastIndexOf(');') + 2) + `\n          </div>\n        </div>\n      ) : (!isLoading && !dataError) ? (\n        <div className="text-center text-slate-500 mt-10">Please select a session above to begin survey.</div>\n      ) : null}\n    </div>\n  );\n}\n`;

fs.writeFileSync('src/GymSurvey.jsx', finalCode);
console.log("Mashed GymSurvey");
