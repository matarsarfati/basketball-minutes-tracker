const fs = require('fs');
let code = fs.readFileSync('src/SurveyForm.jsx', 'utf8');

const lines = code.split('\n');
const pre = lines.slice(0, 163).join('\n');
const post = lines.slice(228).join('\n');

const newCode = pre + '\n' + `  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    if (!activeSession) return;

    // Fetch Remote Data
    const loadRemoteData = async () => {
      setIsLoading(true);
      setDataError("");
      try {
        let practiceData;
        let allPlayers;
        
        try {
            const results = await Promise.all([
              practiceDataService.getPracticeData(activeSession.id || activeSession.firebaseId),
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

        // Always show all players if attendance has not been strictly locked exclusively
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

        setPresentPlayers(present);
      } catch (err) {
        console.error("Failed to load remote survey data:", err);
        setDataError("Failed to fetch session practice data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadRemoteData();
  }, [activeSession]);` + '\n' + post;

fs.writeFileSync('src/SurveyForm.jsx', newCode);
