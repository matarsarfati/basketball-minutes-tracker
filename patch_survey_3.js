const fs = require('fs');
let code = fs.readFileSync('src/SurveyForm.jsx', 'utf8');

const prefixIdx = code.indexOf('  const [activeSession, setActiveSession] = useState(null);');
if(prefixIdx === -1) {
    console.log("NOT FOUND");
    process.exit(1);
}

const suffixIdx = code.indexOf('// Update handleSubmit to use Firebase');
if(suffixIdx === -1) {
    console.log("SUFFIX NOT FOUND");
    process.exit(1);
}

const newBlock = `  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    if (!activeSession) return;

    const targetSessionId = activeSession.id || activeSession.firebaseId;

    // Fetch Remote Data
    const loadRemoteData = async () => {
      setIsLoading(true);
      setDataError("");
      try {
        let practiceData;
        let allPlayers;
        
        try {
            const results = await Promise.all([
              practiceDataService.getPracticeData(targetSessionId),
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

    // Set up real-time listener for Firebase updates
    const unsubscribe = practiceDataService.subscribeToPracticeData(
      targetSessionId,
      (practiceData) => {
        if (practiceData?.surveyData) {
          // Update store with Firebase data
          setStore(prev => {
            const updatedStore = {
              ...prev,
              [targetSessionId]: practiceData.surveyData
            };
            try {
              localStorage.setItem(STORE_KEY, JSON.stringify(updatedStore));
            } catch (err) {
              console.error('Failed to backup survey data to localStorage:', err);
            }
            return updatedStore;
          });
        }
      }
    );

    return () => unsubscribe();
  }, [activeSession]);

`;

code = code.substring(0, prefixIdx) + newBlock + code.substring(suffixIdx);

fs.writeFileSync('src/SurveyForm.jsx', code);
console.log("done");
