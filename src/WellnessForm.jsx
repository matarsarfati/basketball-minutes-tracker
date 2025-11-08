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

export default function WellnessForm() {
  const navigate = useNavigate();
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const [playersList, wellnessData] = await Promise.all([
        rosterService.getPlayers(),
        wellnessService.getTodayWellness()
      ]);
      
      setPlayers(playersList || []);
      
      if (wellnessData?.responses) {
        setCompleted(wellnessData.responses);
        setResponses(wellnessData.responses);
      }
    };
    loadData();
  }, []);

  const handlePlayerChange = (e) => {
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

  const renderControl = (type, currentValue, setter) => {
    const question = QUESTIONS[type];
    const hasValue = currentValue !== null;
    const displayValue = hasValue ? currentValue : 5;
    
    const applyValue = (newValue) => {
      setter(type, newValue);
      setShowSuccess(false);
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
      <div className="survey-control">
        <label className="control-label">{question.title}</label>
        
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

  if (showSuccess) {
    return (
      <div className="survey-form">
        <div className="survey-wrap">
          <div className="success-wrap">
            <div className="success-title">✅ Wellness Check Saved!</div>
            <p className="mb-4">Hand the phone to the next player.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedPlayer("");
                setValues({ sleep: null, fatigue: null, soreness: null, physioNotes: "" });
              }}
              className="survey-primary w-full"
              style={{ backgroundColor: '#14b8a6' }}
            >
              Next Player →
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
          <h1 className="survey-title">💪 Daily Wellness Check</h1>
          <p className="survey-date">{new Date().toLocaleDateString()}</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Player</label>
              <select
                value={selectedPlayer}
                onChange={handlePlayerChange}
                className="player-select"
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

            <div className="survey-control">
              <label className="control-label">Notes for Physiotherapist (optional)</label>
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
              className="survey-primary"
              style={{ backgroundColor: '#14b8a6' }}
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
      </div>
    </div>
  );
}