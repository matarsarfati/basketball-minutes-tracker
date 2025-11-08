import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rosterService } from './services/rosterService';
import { wellnessService } from './services/wellnessService';
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

export default function WellnessSurvey() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [responses, setResponses] = useState({});
  const [completed, setCompleted] = useState({});
  const [values, setValues] = useState({ sleep: null, fatigue: null, soreness: null, physioNotes: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const [playersList, wellnessData] = await Promise.all([
        rosterService.getPlayers(),
        wellnessService.getTodayWellness()
      ]);
      
      setPlayers(playersList || []);
      if (playersList.length > 0 && !selectedPlayer) {
        const firstPending = playersList.find(p => !wellnessData?.responses?.[p.name]);
        setSelectedPlayer(firstPending?.name || playersList[0].name);
      }
      
      if (wellnessData?.responses) {
        setCompleted(wellnessData.responses);
        setResponses(wellnessData.responses);
      }
    };
    loadData();
  }, [selectedPlayer]);

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
      const result = await wellnessService.submitWellnessCheck(selectedPlayer, values);
      if (result.success) {
        // Update completed list and responses state
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
      } else {
        throw new Error("Failed to save wellness check");
      }
    } catch (err) {
      setError("Failed to save wellness check. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderControl = (name, value, onChange) => {
    const question = QUESTIONS[name];
    const hasValue = value !== null;
    const displayValue = hasValue ? value : 5;

    return (
      <div className="survey-control">
        <label className="survey-label">
          {question.title}
          <span className="survey-emoji">{question.emojis[displayValue - 1]}</span>
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={displayValue}
          onChange={e => onChange(name, parseInt(e.target.value))}
          className="survey-range"
          style={{
            background: 'linear-gradient(to right, #14b8a6, #06b6d4, #0ea5e9)',
            opacity: hasValue ? 1 : 0.4
          }}
        />
        <div className="survey-scale">
          <span style={{ color: hasValue ? 'inherit' : '#94a3b8' }}>
            {hasValue ? question.labels[displayValue - 1] : 'Not selected yet'}
          </span>
          <span className="survey-value" style={{ opacity: hasValue ? 1 : 0.4 }}>
            {displayValue}/10
          </span>
        </div>
      </div>
    );
  };

  const pendingPlayers = players.filter(p => !completed[p.name]);
  const completedCount = Object.keys(completed).length;
  const totalPlayers = players.length;

  if (showSuccess) {
    return (
      <div className="survey-success">
        <h2>✅ Wellness Check Saved!</h2>
        <button
          onClick={() => {
            setShowSuccess(false);
            setSelectedPlayer("");
            setValues({ sleep: null, fatigue: null, soreness: null, physioNotes: "" });
          }}
          className="survey-button"
          style={{ backgroundColor: '#14b8a6' }}
        >
          Next Player
        </button>
      </div>
    );
  }

  return (
    <div className="survey-container">
      <button 
        onClick={() => navigate('/schedule')} 
        className="survey-back"
      >
        ← Back to Schedule
      </button>

      <h2 className="survey-title">Daily Wellness Check</h2>
      <p className="survey-date">{new Date().toLocaleDateString()}</p>
      
      <div className="survey-status">
        <p>Completed: {completedCount} of {totalPlayers} players</p>
        {pendingPlayers.length > 0 && (
          <details className="survey-pending">
            <summary>Pending Players ({pendingPlayers.length})</summary>
            <ul>
              {pendingPlayers.map(player => (
                <li key={player.name}>{player.name}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <form onSubmit={handleSubmit} className="survey-form">
        <select
          value={selectedPlayer}
          onChange={e => {
            const playerName = e.target.value;
            setSelectedPlayer(playerName);

            // Always reset form fields to blank (privacy: don't show previous responses)
            setValues({ sleep: null, fatigue: null, soreness: null, physioNotes: "" });

            // Check if player has already submitted today (for info message only)
            if (responses[playerName]) {
              setError("ℹ️ You have already submitted today's wellness check. Submit again to update it.");
            } else {
              setError("");
            }
          }}
          className="survey-select"
        >
          <option value="">Select Player</option>
          {players.map(player => (
            <option key={player.name} value={player.name}>
              {player.name} {player.number ? `#${player.number}` : ''} {completed[player.name] ? "✓" : ""}
            </option>
          ))}
        </select>

        {renderControl("sleep", values.sleep, (name, value) => 
          setValues(prev => ({ ...prev, [name]: value })))}
        {renderControl("fatigue", values.fatigue, (name, value) => 
          setValues(prev => ({ ...prev, [name]: value })))}
        {renderControl("soreness", values.soreness, (name, value) => 
          setValues(prev => ({ ...prev, [name]: value })))}

        <div className="survey-control">
          <label className="survey-label">
            Notes for Physiotherapist (optional)
          </label>
          <textarea
            value={values.physioNotes}
            onChange={e => setValues(prev => ({ ...prev, physioNotes: e.target.value }))}
            className="survey-textarea"
            placeholder="Any injuries, pain, or concerns the physio should know about..."
            rows={4}
            dir="auto"
            lang="he"
          />
        </div>

        {error && <div className="survey-error">{error}</div>}

        <button
          type="submit"
          disabled={
            isSaving ||
            !selectedPlayer ||
            values.sleep === null ||
            values.fatigue === null ||
            values.soreness === null
          }
          className="survey-submit"
          style={{ backgroundColor: '#14b8a6' }}
        >
          {isSaving ? "Saving..." : "Submit Wellness Check"}
        </button>
      </form>
    </div>
  );
}
