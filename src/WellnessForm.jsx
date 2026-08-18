import React, { useState, useEffect } from 'react';
import { rosterService } from './services/rosterService';
import { wellnessService } from './services/wellnessService';
import { practiceDataService } from './services/practiceDataService';
import SurveySessionSelector from './components/surveys/SurveySessionSelector';
import { useTeam } from './context/TeamContext';
import { useNavigate } from 'react-router-dom';
import './SurveyForm.css';

const QUESTIONS = {
  sleep: {
    title: "How was your sleep quality last night?",
    labels: ["Very poor", "Poor", "Below average", "Slightly poor", "Average", "Decent", "Good", "Very good", "Great", "Excellent"],
    emojis: ["😴", "😪", "🥱", "😑", "😐", "🙂", "😊", "😁", "😄", "🤩"]
  },
  fatigue: {
    title: "How fatigued do you feel today?",
    labels: ["Not tired at all", "Minimal fatigue", "Slightly tired", "A bit fatigued", "Moderately tired", "Quite tired", "Very fatigued", "Extremely tired", "Exhausted", "Completely drained"],
    emojis: ["😌", "🙂", "😐", "😕", "😟", "😓", "😰", "😫", "😵", "💀"]
  },
  soreness: {
    title: "How sore are your muscles today?",
    labels: ["No soreness", "Very light", "Light", "Mild", "Moderate", "Noticeable", "Significant", "Very sore", "Extremely sore", "Severely painful"],
    emojis: ["💪", "😊", "🙂", "😐", "😕", "😣", "😖", "😩", "😫", "🤕"]
  }
};

export default function WellnessForm() {
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
  const [showSuccess, setShowSuccess] = useState(false);

  const currentId = activeSession?.id || activeSession?.firebaseId;

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

  const handlePlayerChange = (e) => {
    const playerName = e.target.value;
    setSelectedPlayer(playerName);

    // Always reset form fields to blank (privacy: don't show previous responses)
    setValues({ sleep: null, fatigue: null, soreness: null, physioNotes: "" });
    setShowSuccess(false); // Hide success view if changing player

    // Check if player has already submitted today (for info message only)
    if (responses[playerName]) {
      setError("ℹ️ You have already submitted today's wellness check. Submit again to update it.");
    } else {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
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

      // Show success visual state
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save wellness check");
    } finally {
      setIsSaving(false);
    }
  };

  const renderControl = (type, currentValue, setter) => {
    const question = QUESTIONS[type];
    const hasValue = currentValue !== null;
    const displayValue = hasValue ? currentValue : 5;

    const applyValue = (newValue) => {
      setter(type, newValue);
      setError('');
    };

    const styles = {
      bar: {
        background: 'linear-gradient(to right, #14b8a6, #06b6d4, #0ea5e9)',
        height: '12px',
        borderRadius: '6px',
        width: '100%',
        opacity: hasValue ? 1 : 0.4
      },
      track: {
        background: 'transparent',
        WebkitAppearance: 'none',
        width: '100%',
        height: '12px',
        padding: '0',
        margin: '0',
        cursor: 'pointer'
      },
      thumb: {
        WebkitAppearance: 'none',
        width: '24px',
        height: '24px',
        backgroundColor: '#fff',
        borderRadius: '50%',
        border: '2px solid #14b8a6',
        margin: '-6px',
        cursor: 'grab',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        opacity: hasValue ? 1 : 0.4
      }
    };

    return (
      <div className="survey-control text-left">
        <label className="control-label text-left">{question.title}</label>
        <div className="scaleSection">
          <div className="sliderBar" style={styles.bar}>
            <input
              type="range"
              min="1"
              max="10"
              value={displayValue}
              onChange={e => applyValue(parseInt(e.target.value))}
              style={{ ...styles.track, ...styles.thumb, opacity: hasValue ? 1 : 0.4 }}
            />
          </div>
          <div className="scaleSelected">
            {hasValue ? (
              <>
                <span className="survey-emoji">{question.emojis[displayValue - 1]}</span>
                <span>{question.labels[displayValue - 1]}</span>
              </>
            ) : (
              <span className="text-gray-400">
                Not selected yet - click a number below or drag the slider
              </span>
            )}
          </div>
          <div className="scaleRow">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                type="button"
                className={`scaleToken ${num === displayValue && hasValue ? 'active' : ''}`}
                onClick={() => applyValue(num)}
              >
                <span className="token-emoji">{question.emojis[num - 1]}</span>
                <span className="token-number">{num}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 p-6">
      <SurveySessionSelector onSessionSelect={setActiveSession} />

      {activeSession ? (
        <div className="survey-form mx-auto w-full" style={{ maxWidth: "500px" }}>
          <div className="survey-wrap">
            {showSuccess ? (
              <div className="survey-card text-center py-10">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-2xl font-bold mb-2">Wellness Check Saved!</h2>
                <p className="mb-8 text-gray-600">Hand the phone to the next player.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlayer("");
                    setValues({ sleep: null, fatigue: null, soreness: null, physioNotes: "" });
                    setShowSuccess(false);
                  }}
                  className="w-full py-4 rounded-xl font-bold text-lg text-white"
                  style={{ backgroundColor: '#14b8a6' }}
                >
                  Next Player →
                </button>
              </div>
            ) : (
              <div className="survey-card">
                <h1 className="survey-title">💪 Daily Wellness Check</h1>

                {!isLoading && (
                  <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
                    <div className="text-center mb-3">
                      <span className="text-2xl font-bold text-teal-600">
                        {Object.keys(completed || {}).length}
                      </span>
                      <span className="text-gray-600"> of </span>
                      <span className="text-2xl font-bold text-teal-600">
                        {players.length}
                      </span>
                      <span className="text-gray-600"> players completed</span>
                    </div>
                    {(() => {
                      const completedNames = new Set(Object.keys(completed || {}));
                      const pendingPlayers = players.filter(p => !completedNames.has(p.name));

                      if (pendingPlayers.length === 0 && players.length > 0) {
                        return (
                          <div className="text-center text-green-600 font-medium mt-2">
                            All present players have submitted wellness! 🎉
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="text-left">
                  <div className="form-group text-left">
                    <label>Player</label>
                    <select
                      value={selectedPlayer}
                      onChange={handlePlayerChange}
                      className="player-select w-full p-3 rounded border border-gray-300"
                    >
                      <option value="">Select Player</option>
                      {players.map(player => (
                        <option key={player.name} value={player.name}>
                          {player.name} {player.number ? `#${player.number}` : ''} {completed[player.name] ? "✓" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {renderControl("sleep", values.sleep, (name, value) =>
                    setValues(prev => ({ ...prev, [name]: value })))}
                  {renderControl("fatigue", values.fatigue, (name, value) =>
                    setValues(prev => ({ ...prev, [name]: value })))}
                  {renderControl("soreness", values.soreness, (name, value) =>
                    setValues(prev => ({ ...prev, [name]: value })))}

                  <div className="survey-control text-left mt-6">
                    <label className="control-label text-left font-bold text-gray-700">Notes for Physiotherapist (optional)</label>
                    <textarea
                      value={values.physioNotes}
                      onChange={e => setValues(prev => ({ ...prev, physioNotes: e.target.value }))}
                      className="survey-textarea w-full p-3 border border-gray-300 rounded mt-2"
                      placeholder="Any injuries, pain, or concerns the physio should know about..."
                      rows={4}
                      dir="auto"
                    />
                  </div>

                  {error && <div className="survey-error text-red-500 mt-4 text-center">{error}</div>}

                  <button
                    type="submit"
                    className="w-full py-4 mt-6 rounded-xl font-bold text-lg text-white"
                    style={{ backgroundColor: '#14b8a6', opacity: (!selectedPlayer || values.sleep === null || values.fatigue === null || values.soreness === null || isSaving) ? 0.5 : 1 }}
                    disabled={
                      !selectedPlayer ||
                      values.sleep === null ||
                      values.fatigue === null ||
                      values.soreness === null ||
                      isSaving
                    }
                  >
                    {isSaving ? "Saving..." : "Submit Wellness Check"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (!isLoading && !dataError) ? (
        <div className="text-center text-slate-500 mt-10">Please select a session above to begin survey.</div>
      ) : null}
    </div>
  );
}
