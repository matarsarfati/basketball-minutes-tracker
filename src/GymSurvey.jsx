import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import "./SurveyForm.css";
import { practiceDataService } from './services/practiceDataService';
import { rosterService } from './services/rosterService';

const SURVEY_STORE_KEY = "practiceSurveysV1";

const SUCCESS_MESSAGES = [
  "Now it's time for rest, you earned it.",
  "The basket already misses you.",
  "Great work today, champion.",
  "Recovery is part of the process.",
  "See you at the next practice!",
  "Another brick in the wall of success.",
  "Rest up, tomorrow we go again."
];

const GYM_RPE_SHORT = {
  1: "Very light",
  2: "Light",
  3: "Moderate",
  4: "Somewhat hard",
  5: "Hard",
  6: "Harder",
  7: "Very hard",
  8: "Extremely hard",
  9: "Near maximal",
  10: "Maximal effort",
};

// Helper functions
function rpeShort(value) {
  return GYM_RPE_SHORT[value] || `${value}`;
}

function rpeEmoji(value) {
  const EMOJI = ["😴", "🙂", "😊", "😌", "😰", "😕", "😣", "😫", "😬", "😱"];
  return EMOJI[value - 1] || "🙂";
}

const styles = {
  section: {
    marginBottom: "1.5rem",
  },
  bar: {
    position: "relative",
    height: "8px",
    background: "linear-gradient(to right, #22c55e, #f59e0b, #ef4444)",
    borderRadius: "999px",
    marginBottom: "1rem",
  },
  track: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  thumb: {
    position: "absolute",
    top: "50%",
    width: "20px",
    height: "20px",
    backgroundColor: "#fff",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    border: "2px solid currentColor",
    transition: "left 0.1s ease-out",
  },
  tokenGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "0.5rem",
    marginTop: "1rem",
  },
  token: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0.5rem",
    background: "#F3F4F6",
    borderRadius: "0.5rem",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tokenActive: {
    background: "#4B5563",
    color: "white",
  },
  emoji: {
    fontSize: "1.25rem",
    marginBottom: "0.25rem",
  },
  number: {
    fontSize: "0.875rem",
    fontWeight: "500",
  }
};

const QUESTION_LABELS = {
  rpe: "Session Intensity (RPE) — 1 to 10"
};

export default function GymSurvey() {
  const { sessionId } = useParams();
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [rpe, setRpe] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!sessionId) return;

    // Fetch Remote Data
    const loadRemoteData = async () => {
      setIsLoading(true);
      setDataError("");
      try {
        const [practiceData, allPlayers] = await Promise.all([
          practiceDataService.getPracticeData(sessionId),
          rosterService.getPlayers()
        ]);

        if (!practiceData) {
          setDataError("Session not found.");
          return;
        }

        if (practiceData.attendance) {
          const present = allPlayers
            .filter(p => practiceData.attendance[p.name]?.present)
            .map(p => ({
              id: p.id,
              name: p.name,
              number: p.number
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          setPlayers(present);
          // Also update localStorage as backup for next reload (optional, but requested to remove dependency)
          // localStorage.setItem(`gymSurveyPlayers_${sessionId}`, JSON.stringify(present));
        } else {
          setPlayers([]);
        }
      } catch (err) {
        console.error('Failed to load remote gym survey data', err);
        setDataError("Failed to load session data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadRemoteData();

    // Set up real-time listener for submissions
    const unsubscribe = practiceDataService.subscribeToPracticeData(
      sessionId,
      (practiceData) => {
        if (practiceData?.gymSurveyData) {
          setSubmitted(practiceData.gymSurveyData);
          // Backup to localStorage
          try {
            localStorage.setItem(
              `gymSurvey_${sessionId}`,
              JSON.stringify(practiceData.gymSurveyData)
            );
          } catch (err) {
            console.error('Failed to backup gym survey data:', err);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  const renderControl = (type, currentValue, setter) => {
    const emojiFor = rpeEmoji;  // Since we only have RPE
    const shortFor = rpeShort;
    const hasValue = typeof currentValue === "number" && currentValue >= 1 && currentValue <= 10;
    const displayValue = hasValue ? currentValue : 5;

    const applyValue = (newValue) => {
      setter(newValue);
      setShowSuccess(false);
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
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
              const selected = hasValue && level === displayValue;
              return (
                <button
                  key={`rpe-token-${level}`}
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPlayer || rpe === null) return;

    const surveyData = {
      rpe: Number(rpe),
      notes: notes.trim(),
      savedAt: new Date().toISOString()
    };

    try {
      // Save to Firebase FIRST
      await practiceDataService.updateGymSurveyResponse(sessionId, selectedPlayer, surveyData);

      // Then save to localStorage as backup
      const store = JSON.parse(localStorage.getItem(SURVEY_STORE_KEY) || '{}');
      store[`${sessionId}_gym`] = {
        ...(store[`${sessionId}_gym`] || {}),
        [selectedPlayer]: surveyData
      };
      localStorage.setItem(SURVEY_STORE_KEY, JSON.stringify(store));

      // Update local state
      setSubmitted(prev => ({
        ...prev,
        [selectedPlayer]: surveyData
      }));

      // Reset form
      setRpe(null);
      setNotes('');
      setSelectedPlayer('');

      const randomMsg = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
      setSuccessMessage(randomMsg);
      setShowSuccess(true);

      console.log('✅ Gym survey saved successfully for:', selectedPlayer);
    } catch (err) {
      console.error('❌ Failed to save gym survey:', err);
      alert('Failed to save response. Please try again.');
    }
  };

  const pendingPlayers = players.filter(p => !submitted[p.name]);

  if (showSuccess) {
    return (
      <div className="survey-form">
        <div className="survey-wrap">
          <div className="survey-card success-wrap">
            <div className="success-title">✅ Response Saved!</div>
            <p className="mb-4 text-center text-gray-600">{successMessage}</p>
            <button
              type="button"
              onClick={() => {
                setShowSuccess(false);
                setSelectedPlayer('');
                setRpe(null);
                setNotes('');
              }}
              className="survey-primary w-full"
              style={{ backgroundColor: '#8b5cf6' }}
            >
              Next Player →
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="survey-form">
      <div className="survey-wrap">
        <div className="survey-card">
          <Link to={`/practice/${sessionId}`} className="back-link">
            ← Back to Practice
          </Link>

          <h1 className="survey-title">Gym Session Feedback</h1>

          {/* Conditional Status Section */}
          {!isLoading && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="status-header">
                <span className="text-2xl font-bold text-purple-600">
                  {Object.keys(submitted).length} of {players.length} players completed
                </span>
              </div>
              {pendingPlayers.length > 0 ? (
                <div className="status-body">
                  <div className="status-label">Still waiting for:</div>
                  <div className="flex flex-wrap gap-2">
                    {pendingPlayers.map(player => (
                      <span
                        key={player.name}
                        className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 border border-gray-300"
                      >
                        {player.name} {player.number ? `#${player.number}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-green-600 font-medium text-center">
                  ✅ All present players have completed the survey!
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Player</label>
              <div className="relative">
                <select
                  value={selectedPlayer}
                  onChange={e => {
                    setSelectedPlayer(e.target.value);
                    const existing = submitted[e.target.value];
                    if (existing) {
                      setRpe(existing.rpe);
                      setNotes(existing.notes || '');
                    } else {
                      setRpe(null);
                      setNotes('');
                    }
                  }}
                  className="player-select"
                  required
                  disabled={isLoading}
                >
                  <option value="">{isLoading ? "Loading players..." : "Choose player..."}</option>
                  {!isLoading && players.map(p => (
                    <option key={p.name} value={p.name}>
                      {p.name} {submitted[p.name] ? '✓' : ''}
                    </option>
                  ))}
                </select>
                {isLoading && (
                  <div className="absolute right-3 top-3">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>{QUESTION_LABELS.rpe}</label>
              {renderControl("rpe", rpe, setRpe)}
            </div>

            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="notes-input"
                rows={3}
                placeholder="Any additional comments..."
              />
            </div>

            <button
              type="submit"
              className="survey-primary"
              style={{ backgroundColor: '#8b5cf6' }}
              disabled={!selectedPlayer || rpe === null}
            >
              Save Response
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}