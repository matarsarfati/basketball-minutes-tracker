const fs = require('fs');
let code = fs.readFileSync('src/WellnessForm.jsx', 'utf8');

// Imports
code = code.replace(/import \{ wellnessService \} from '\.\/services\/wellnessService';/, 
`import { wellnessService } from './services/wellnessService';
import { practiceDataService } from './services/practiceDataService';
import SurveySessionSelector from './components/surveys/SurveySessionSelector';
import { useTeam } from './context/TeamContext';
import { scheduleService } from './services/scheduleService';
import { useNavigate } from 'react-router-dom';`);

// Export block prefix
const prefixIdx = code.indexOf('export default function WellnessForm() {');
const suffixIdx = code.indexOf('  const handleSubmit = async ');

const newBlock = `export default function WellnessForm() {
  const navigate = useNavigate();
  const { activeTeam } = useTeam();
  const [activeSession, setActiveSession] = useState(null);

  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [responses, setResponses] = useState({});
  const [completed, setCompleted] = useState({});
  const [values, setValues] = useState({
    sleep: null,
    fatigue: null,
    soreness: null,
    physioNotes: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataError, setDataError] = useState("");

  const currentId = activeSession?.id || activeSession?.firebaseId;

  // Initial load
  useEffect(() => {
    if (!activeSession) return;

    const loadData = async () => {
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
          practiceData = { attendance: {}, surveys: {}, gymSurveyData: {}, wellnessData: {}, metrics: {} };
        }

        const hasAttendance = practiceData.attendance && Object.keys(practiceData.attendance).length > 0;
        
        const present = allPlayers
          .filter(p => hasAttendance ? practiceData.attendance[p.name]?.present : true)
          .sort((a, b) => a.name.localeCompare(b.name));

        setPlayers(present);
      } catch (err) {
        console.error('Failed to load remote survey data:', err);
        setDataError("Failed to fetch session practice data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Subscribe to updates real-time
    const unsubscribe = practiceDataService.subscribeToPracticeData(
      currentId,
      (data) => {
        if (data?.wellnessData) {
          setCompleted(data.wellnessData);
          setResponses(data.wellnessData);
        }
      }
    );

    return () => unsubscribe();
  }, [activeSession, currentId]);

`;

code = code.substring(0, prefixIdx) + newBlock + code.substring(suffixIdx);

// Replace handleSubmit
const handleStartIdx = code.indexOf('  const handleSubmit = async ');
const handleEndIdx = code.indexOf('  return (');

const handleCode = `  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPlayer) {
      setError("Please select a player");
      return;
    }

    if (values.sleep === null || values.fatigue === null || values.soreness === null) {
      setError("Please answer all 3 questions");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await practiceDataService.updateWellnessSurveyResponse(currentId, selectedPlayer, {
        ...values,
        savedAt: new Date().toISOString()
      });

      // Update local state is handled implicitly by the listener, but immediately:
      setCompleted(prev => ({
        ...prev,
        [selectedPlayer]: values
      }));
      setResponses(prev => ({
        ...prev,
        [selectedPlayer]: values
      }));

      // Show success message briefly
      setError("✅ Wellness check saved!");

      // Reset form after short delay
      setTimeout(() => {
        setError("");
        setSelectedPlayer("");
        setValues({ sleep: null, fatigue: null, soreness: null, physioNotes: "" });
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save wellness check");
    } finally {
      setIsSaving(false);
    }
  };

`;

code = code.substring(0, handleStartIdx) + handleCode + code.substring(handleEndIdx);

// Append Layout wrappers
const wrapStartIdx = code.indexOf('  return (');
const wrapEndIdx = code.indexOf('<div className="survey-form">', wrapStartIdx) + 29;

const wrapCode = `  return (
    <div className="flex flex-col flex-1 p-6">
      <SurveySessionSelector onSessionSelect={setActiveSession} />
      
      {activeSession ? (
        <div className="survey-form mx-auto w-full" style={{maxWidth: "500px"}}>`;

code = code.substring(0, wrapStartIdx) + wrapCode + code.substring(wrapEndIdx);

const lastDiv = code.lastIndexOf('</div>');
code = code.substring(0, lastDiv) + `      ) : (!isLoading && !dataError) ? (
        <div className="text-center text-slate-500 mt-10">Please select a session above to begin survey.</div>
      ) : null}
    </div>
  );
}
`;

fs.writeFileSync('src/WellnessForm.jsx', code);
console.log("Patched wellness");
