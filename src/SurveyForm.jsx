import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./SurveyForm.css";

const STORE_KEY = "practiceSurveysV1";
const ROSTER_KEY = "teamRosterV1";
const NEW_PLAYER_VALUE = "__new__";

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
};

export default function SurveyForm() {
  const { sessionId } = useParams();
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
  const [rosterNames, setRosterNames] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(ROSTER_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed
            .map(p => (typeof p === "string" ? p : p?.name || ""))
            .filter(Boolean)
        : [];
    } catch {
      return [];
    }
  });

  const [selectedName, setSelectedName] = useState("");
  const [newName, setNewName] = useState("");
  const [rpe, setRpe] = useState(null);
  const [legs, setLegs] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [, setSuccess] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [justAddedName, setJustAddedName] = useState(false);

  const resetTimerRef = useRef(null);

  const resetForm = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setSelectedName("");
    setNewName("");
    setJustAddedName(false);
    setRpe(null);
    setLegs(null);
    setNotes("");
    setError("");
    setSuccess(false);
    setSubmitted(false);
  }, [resetTimerRef]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(ROSTER_KEY, JSON.stringify(rosterNames));
    } catch (err) {
      console.error("Failed to save", ROSTER_KEY, err);
    }
  }, [rosterNames]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (err) {
      console.error("Failed to save", STORE_KEY, err);
    }
  }, [store]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [resetTimerRef]);

  const sessionEntries = useMemo(() => store[sessionId] || {}, [store, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    resetForm();
  }, [resetForm, sessionId]);

  const handleSelectChange = event => {
    const value = event.target.value;
    setSuccess(false);
    setError("");
    setJustAddedName(false);
    setSubmitted(false);
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (value === NEW_PLAYER_VALUE) {
      setSelectedName(NEW_PLAYER_VALUE);
      setNewName("");
      setRpe(null);
      setLegs(null);
      setNotes("");
      return;
    }
    setSelectedName(value);
    const previous = sessionEntries[value];
    setRpe(previous?.rpe ?? null);
    setLegs(previous?.legs ?? null);
    setNotes(previous?.notes ?? "");
  };

  const handleAddNewPlayer = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Please enter a name for the new player.");
      return;
    }
    if (rosterNames.includes(trimmed)) {
      setError("That name already exists in the list.");
      return;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    const updatedRoster = [...rosterNames, trimmed];
    updatedRoster.sort((a, b) => a.localeCompare(b, "he"));
    setRosterNames(updatedRoster);
    setSelectedName(trimmed);
    setNewName("");
    setError("");
    setJustAddedName(true);
    setSuccess(false);
    setSubmitted(false);
    setRpe(null);
    setLegs(null);
    setNotes("");
  };

  const handleSubmit = event => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    const nameToUse = selectedName === NEW_PLAYER_VALUE ? newName.trim() : selectedName.trim();

    if (!nameToUse) {
      setError("Please choose a player name.");
      return;
    }
    if (!sessionId) {
      setError("The link is missing a session identifier.");
      return;
    }

    if (rpe === null) {
      setError("Please select a session intensity value.");
      return;
    }

    if (legs === null) {
      setError("Please select how heavy your legs feel.");
      return;
    }

    const numericRpe = Number(rpe);
    const numericLegs = Number(legs);
    if (Number.isNaN(numericRpe) || numericRpe < 1 || numericRpe > 10) {
      setError("Please set an RPE value between 1 and 10.");
      return;
    }
    if (Number.isNaN(numericLegs) || numericLegs < 1 || numericLegs > 10) {
      setError("Please set a legs value between 1 and 10.");
      return;
    }

    if (!rosterNames.includes(nameToUse)) {
      const updatedRoster = [...rosterNames, nameToUse];
      updatedRoster.sort((a, b) => a.localeCompare(b, "he"));
      setRosterNames(updatedRoster);
    }

    const updatedSession = {
      ...sessionEntries,
      [nameToUse]: {
        rpe: numericRpe,
        legs: numericLegs,
        notes,
        savedAt: new Date().toISOString(),
      },
    };

    setStore(prev => ({
      ...prev,
      [sessionId]: updatedSession,
    }));

    setSelectedName("");
    setNewName("");
    setRpe(null);
    setLegs(null);
    setNotes("");
    setSubmitted(true);
    setJustAddedName(false);
    if (document.activeElement?.blur) {
      document.activeElement.blur();
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = null;
      resetForm();
    }, 2000);
  };

  if (!sessionId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "rgba(255,255,255,0.95)",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: 24,
            textAlign: "center",
          }}
        >
          <h2>Missing session identifier</h2>
          <p>Please contact the staff for an updated link.</p>
          <Link to="/schedule">Back to schedule</Link>
        </div>
      </div>
    );
  }

  const showRosterSelect = rosterNames.length > 0;
  const existingSubmission = selectedName && sessionEntries[selectedName];
  const trimmedSelectedName = typeof selectedName === "string" ? selectedName.trim() : "";
  const hasPlayerSelected = trimmedSelectedName && trimmedSelectedName !== NEW_PLAYER_VALUE;
  const canSubmit = Boolean(hasPlayerSelected && rpe !== null && legs !== null);

  const renderControl = (type, currentValue, setter) => {
    const emojiFor = type === "rpe" ? rpeEmoji : legsEmoji;
    const shortFor = type === "rpe" ? rpeShort : legsShort;
    const hasValue = typeof currentValue === "number" && currentValue >= 1 && currentValue <= 10;
    const displayValue = hasValue ? currentValue : 5;

    const applyValue = newValue => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      setter(newValue);
      setSuccess(false);
      setSubmitted(false);
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
                  onChange={event => applyValue(Number(event.target.value))}
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
            <span className="tokenEmoji">
              {emojiFor(displayValue)}
            </span>
            <span style={{ marginLeft: 6, fontSize: 12, color: hasValue ? "#374151" : "#94a3b8" }}>
              {hasValue
                ? `Selected: ${displayValue} — ${shortFor(displayValue)}`
                : "Selected: none yet"}
            </span>
          </div>
          <div className="scaleRow">
            {LEVELS.map(level => {
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: "32px 16px",
        boxSizing: "border-box",
      }}
    >
      <div className="survey-wrap">
        {submitted ? (
          <div className="success-wrap">
            <div className="success-title">Thanks!</div>
            <p>Hand the phone to the next player.</p>
          </div>
        ) : (
          <div className="survey-card">
            <header style={{ textAlign: "center", marginBottom: 16 }}>
              <h1 style={{ margin: 0, fontSize: 24 }}>Training Feedback Form</h1>
              <p style={{ margin: "8px 0 0", color: "#475569" }}>
                Choose your name and rate today's session.
              </p>
            </header>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Player</label>
                {showRosterSelect ? (
                  <select
                    value={selectedName || ""}
                    onChange={handleSelectChange}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #cbd5f5",
                      background: "#fff",
                      fontSize: 15,
                    }}
                  >
                    <option value="">Choose a player...</option>
                    {rosterNames.map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value={NEW_PLAYER_VALUE}>Add new player...</option>
                  </select>
                ) : (
                  <div style={{ fontSize: 14, color: "#475569" }}>
                    No players found. Please add a name below.
                  </div>
                )}
              </div>

              {(selectedName === NEW_PLAYER_VALUE || (!showRosterSelect && rosterNames.length === 0)) && (
                <div
                  style={{
                    border: "1px solid #cbd5f5",
                    borderRadius: 10,
                    padding: 12,
                    background: "#f8fafc",
                  }}
                >
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Add new player name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => {
                      setNewName(e.target.value);
                      setSuccess(false);
                      setError("");
                      setSubmitted(false);
                      if (resetTimerRef.current) {
                        clearTimeout(resetTimerRef.current);
                        resetTimerRef.current = null;
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #cbd5f5",
                      background: "#fff",
                      fontSize: 15,
                      marginBottom: 8,
                    }}
                    placeholder="Enter full name"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewPlayer}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #10b981",
                      background: "#22c55e",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Save new player
                  </button>
                  {justAddedName && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#10b981" }}>
                      Player added. You can now submit feedback.
                    </div>
                  )}
                </div>
              )}

              {renderControl("rpe", rpe, setRpe)}

              {renderControl("legs", legs, setLegs)}

              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => {
                    setNotes(e.target.value);
                    setSuccess(false);
                    setSubmitted(false);
                    setError("");
                    if (resetTimerRef.current) {
                      clearTimeout(resetTimerRef.current);
                      resetTimerRef.current = null;
                    }
                  }}
                  rows={3}
                  placeholder="Share anything about the session you'd like the staff to know."
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #cbd5f5",
                    background: "#fff",
                    resize: "vertical",
                  }}
                />
              </div>

              {error && (
                <div style={{ color: "#dc2626", fontWeight: 600, textAlign: "center" }}>{error}</div>
              )}

              {existingSubmission && !submitted && (
                <div
                  style={{
                    textAlign: "center",
                    background: "#e0e7ff",
                    border: "1px solid #c7d2fe",
                    borderRadius: 12,
                    padding: 12,
                    color: "#3730a3",
                    fontSize: 13,
                  }}
                >
                  Your previous response was loaded. Feel free to update and resubmit.
                </div>
              )}

              <button
                type="submit"
                className="survey-primary"
                disabled={!canSubmit}
                style={{
                  opacity: canSubmit ? 1 : 0.5,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                Submit
              </button>
            </form>

            <footer style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
              Your response is private and not visible to other players.
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
