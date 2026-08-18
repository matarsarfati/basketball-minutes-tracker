import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { practiceDataService } from './services/practiceDataService';
import { rosterService } from './services/rosterService';
import { useTeam } from './context/TeamContext';
import { scheduleService } from './services/scheduleService';
import SurveySessionSelector from './components/surveys/SurveySessionSelector';
import "./SurveyForm.css";

const STORE_KEY = "practiceSurveysV1";

const SUCCESS_MESSAGES = [
  "Now it's time for rest, you earned it.",
  "The basket already misses you.",
  "Great work today, champion.",
  "Recovery is part of the process.",
  "See you at the next practice!",
  "Another brick in the wall of success.",
  "Rest up, tomorrow we go again."
];

const RPE_SHORT = {
  1: "Very very light",
  2: "Very light",
  3: "Light",
  4: "Moderate",
  5: "Somewhat hard",
  6: "Hard",
  7: "Very hard",
  8: "Extremely hard",
  9: "Near maximal",
  10: "Maximal",
};

const LEGS_SHORT = {
  1: "Fresh",
  2: "Very fresh",
  3: "Light",
  4: "Mild",
  5: "Noticeable",
  6: "Heavy",
  7: "Very heavy",
  8: "Extremely",
  9: "Almost exh.",
  10: "Completely",
};

function rpeShort(value) {
  return RPE_SHORT[value] || `${value}`;
}

function legsShort(value) {
  return LEGS_SHORT[value] || `${value}`;
}

function rpeEmoji(value) {
  const EMOJI = ["😀", "🙂", "😊", "😌", "😐", "😕", "😣", "😫", "😬", "😱"];
  return EMOJI[value - 1] || "🙂";
}

function legsEmoji(value) {
  const EMOJI = ["🟢", "🟢", "🟢", "🟡", "🟠", "🟠", "🔴", "🔴", "🔴", "🔴"];
  return EMOJI[value - 1] || "🟢";
}

const LEVELS = Array.from({ length: 10 }, (_, index) => index + 1);

const styles = {
  section: { marginTop: 16 },
  barWrap: { padding: "6px 0" },
  bar: {
    height: 6,
    borderRadius: 999,
    background: "linear-gradient(90deg,#6ee7b7,#60a5fa,#f59e0b,#ef4444)",
    position: "relative",
  },
  track: { position: "relative", height: 6 },
  thumb: {
    position: "absolute",
    top: -6,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 4px rgba(0,0,0,.2)",
    border: "2px solid #3b82f6",
    transform: "translateX(-50%)",
    transition: "left 120ms ease, opacity 120ms ease",
  },
  currentLine: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 600,
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  legend: {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 6,
  },
  token: {
    scrollSnapAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 6px",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#fff",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
    minWidth: 64,
    transition: "box-shadow 120ms ease, border-color 120ms ease",
    cursor: "pointer",
  },
  tokenSel: {
    borderColor: "#3b82f6",
    boxShadow: "0 0 0 2px rgba(59,130,246,.15)",
    fontWeight: 600,
  },
  number: { fontSize: 12, opacity: 0.8, marginTop: 6 },
  emoji: { fontSize: 18, marginTop: 2 },
};

const QUESTION_LABELS = {
  rpe: "Session Intensity (RPE) — 1 to 10",
  legs: "How heavy do your legs feel — 1 to 10",
  gymRpe: "Gym Intensity (RPE)"
};

export default function SurveyForm() {

  const navigate = useNavigate();
  const { activeTeam } = useTeam();

  const [store, setStore] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed ?? {};
    } catch {
      return {};
    }
  });

  const [presentPlayers, setPresentPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [rpe, setRpe] = useState(null);
  const [legs, setLegs] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  const [activeSession, setActiveSession] = useState(null);

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

  // Update handleSubmit to use Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlayer || rpe === null || legs === null) return;

    try {
      // Save to Firebase
      await practiceDataService.updateSurveyResponse(currentId, selectedPlayer, {
        rpe,
        legs,
        notes: notes.trim(),
        savedAt: new Date().toISOString()
      });

      // Also save to localStorage as backup
      const surveys = { ...store };
      surveys[currentId] = {
        ...surveys[currentId],
        [selectedPlayer]: {
          rpe,
          legs,
          notes: notes.trim(),
          savedAt: new Date().toISOString()
        }
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(surveys));
      setStore(surveys);

      // Reset form - clear all fields including info message
      setRpe(null);
      setLegs(null);
      setNotes('');
      setSelectedPlayer('');
      setError('');

      const randomMsg = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
      setSuccessMessage(randomMsg);
      setShowSuccess(true);

    } catch (err) {
      console.error('Failed to save survey:', err);
      setError('Failed to save response. Please try again.');
    }
  };

  const handlePlayerChange = (e) => {
    const playerName = e.target.value;
    setSelectedPlayer(playerName);

    // Always reset form fields to blank (privacy: don't show previous responses)
    setRpe(null);
    setLegs(null);
    setNotes("");

    // Check if player has already submitted (for confirmation message only)
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        const surveys = JSON.parse(stored);
        const response = surveys[currentId]?.[playerName];
        if (response) {
          // Player has already submitted - show info message but don't pre-fill
          setError("ℹ️ You have already submitted a response. Submit again to update it.");
        } else {
          setError("");
        }
      }
    } catch (err) {
      console.error("Failed to check existing response:", err);
    }
  };

  const renderControl = (type, currentValue, setter) => {
    const emojiFor = type === "rpe" ? rpeEmoji : legsEmoji;
    const shortFor = type === "rpe" ? rpeShort : legsShort;
    const hasValue = typeof currentValue === "number" && currentValue >= 1 && currentValue <= 10;
    const displayValue = hasValue ? currentValue : 5;

    const applyValue = (newValue) => {
      setter(newValue);
      setShowSuccess(false);
      setError("");
    };

    const thumbStyle = {
      ...styles.thumb,
      left: `${((displayValue - 1) / 9) * 100}%`,
      opacity: hasValue ? 1 : 0.4,
    };

    return (
      <div style={styles.section}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{QUESTION_LABELS[type]}</div>
        <div className="scaleSection" style={{ marginTop: 4 }}>
          <div className="sliderBar">
            <div style={styles.bar}>
              <div style={styles.track}>
                <div style={thumbStyle} />
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={displayValue}
                  onChange={(event) => applyValue(Number(event.target.value))}
                  style={{
                    position: "absolute",
                    top: -12,
                    left: 0,
                    width: "100%",
                    height: 32,
                    opacity: 0,
                    cursor: "pointer",
                  }}
                  aria-valuenow={displayValue}
                  aria-valuemin={1}
                  aria-valuemax={10}
                  aria-label={QUESTION_LABELS[type]}
                />
              </div>
            </div>
          </div>
          <div className="scaleSelected">
            <span className="tokenEmoji">{emojiFor(displayValue)}</span>
            <span style={{ marginLeft: 6, fontSize: 12, color: hasValue ? "#374151" : "#94a3b8" }}>
              {hasValue
                ? `Selected: ${displayValue} — ${shortFor(displayValue)}`
                : "Selected: none yet"}
            </span>
          </div>
          <div className="scaleRow">
            {LEVELS.map((level) => {
              const selected = hasValue && level === displayValue;
              return (
                <button
                  key={`${type}-token-${level}`}
                  type="button"
                  onClick={() => applyValue(level)}
                  className={`scaleToken${selected ? " active" : ""}`}
                  aria-pressed={selected}
                >
                  <span className="tokenEmoji">{emojiFor(level)}</span>
                  <span className="tokenNum">{level}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (dataError) {
    return (
      <div className="survey-form">
        <div className="survey-wrap">
          <div className="survey-card text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3>Unable to load survey</h3>
            <p className="text-red-500">{dataError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentId = activeSession?.id || activeSession?.firebaseId;

  return (
    <div className="flex flex-col flex-1 p-6">
      <SurveySessionSelector onSessionSelect={setActiveSession} />

      {activeSession ? (
        <div className="survey-form mx-auto w-full" style={{ maxWidth: "500px" }}>
          <div className="survey-wrap">
            <div className="survey-card">
              <h1 className="text-xl font-bold mb-4">Practice Survey</h1>

              {!isLoading && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-center mb-3">
                    <span className="text-2xl font-bold text-blue-600">
                      {Object.keys(store[currentId] || {}).length}
                    </span>
                    <span className="text-gray-600"> of </span>
                    <span className="text-2xl font-bold text-blue-600">
                      {presentPlayers.length}
                    </span>
                    <span className="text-gray-600"> players completed</span>
                  </div>

                  {(() => {
                    const completedNames = new Set(Object.keys(store[currentId] || {}));
                    const pendingPlayers = presentPlayers.filter(
                      p => !completedNames.has(p.name)
                    );

                    if (pendingPlayers.length === 0 && presentPlayers.length > 0) {
                      return (
                        <div className="text-center text-green-600 font-medium mt-2">
                          All present players have submitted! 🎉
                        </div>
                      );
                    }

                    if (pendingPlayers.length > 0) {
                      return (
                        <div className="mt-2 text-sm text-gray-600 text-center">
                          <span className="font-medium text-gray-700">Pending: </span>
                          {pendingPlayers.map(p => p.name).join(", ")}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Select Player</label>
                  <div className="relative">
                    <select
                      value={selectedPlayer}
                      onChange={handlePlayerChange}
                      className="w-full p-2 border rounded"
                      required
                      disabled={isLoading}
                    >
                      <option value="">{isLoading ? "Loading players..." : "Choose player..."}</option>
                      {!isLoading && presentPlayers.map((player) => (
                        <option key={player.id} value={player.name}>
                          {player.name} {player.number ? `#${player.number}` : ""}
                        </option>
                      ))}
                    </select>
                    {isLoading && (
                      <div className="absolute right-3 top-3">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>

                {renderControl("rpe", rpe, setRpe)}

                {renderControl("legs", legs, setLegs)}

                <div>
                  <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Share anything about the session you'd like the staff to know."
                    className="w-full p-2 border rounded"
                  />
                </div>

                {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

                <button
                  type="submit"
                  className="survey-primary mt-4"
                  disabled={!selectedPlayer || rpe === null || legs === null}
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (!isLoading && !dataError) ? (
        <div className="text-center text-slate-500 mt-10">Please select a session above to begin survey.</div>
      ) : null}
    </div>
  );
}
