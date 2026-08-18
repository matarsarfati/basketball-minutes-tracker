import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { practiceDataService } from './services/practiceDataService';
import { rosterService } from './services/rosterService';
import { useTeam } from './context/TeamContext';
import { scheduleService } from './services/scheduleService';
import SurveySessionSelector from './components/surveys/SurveySessionSelector';
import {
  getTranslation,
  getRpeText,
  SUCCESS_MESSAGES
} from './constants/translations';
import "./SurveyForm.css";

const SURVEY_STORE_KEY = "practiceSurveysV1";

export default function GymSurvey() {
  const navigate = useNavigate();
  const { activeTeam } = useTeam();
  const [activeSession, setActiveSession] = useState(null);

  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [lang, setLang] = useState('he');

  const [rpe, setRpe] = useState(null);
  const [notes, setNotes] = useState('');

  const [submitted, setSubmitted] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const currentId = activeSession?.id || activeSession?.firebaseId;

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
        console.error('Failed to load remote gym survey data:', err);
        setDataError("Failed to fetch session practice data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadRemoteData();

    // Set up real-time listener for Firebase updates
    const unsubscribe = practiceDataService.subscribeToPracticeData(
      currentId,
      (practiceData) => {
        if (practiceData?.gymSurveyData) {
          // Update store with Firebase data
          setSubmitted(practiceData.gymSurveyData);
          try {
            localStorage.setItem(`gymSurvey_${currentId}`, JSON.stringify(practiceData.gymSurveyData));
          } catch (err) {
            console.error('Failed to backup gym data:', err);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [activeSession, currentId]);

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
      await practiceDataService.updateGymSurveyResponse(currentId, selectedPlayer, surveyData);

      // Then save to localStorage as backup
      const store = JSON.parse(localStorage.getItem(SURVEY_STORE_KEY) || '{}');
      store[`${currentId}_gym`] = {
        ...(store[`${currentId}_gym`] || {}),
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

      // Random success message based on language
      const messages = SUCCESS_MESSAGES[lang] || SUCCESS_MESSAGES['en'];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setSuccessMessage(randomMsg);

      setShowSuccess(true);

      console.log('✅ Gym survey saved successfully for:', selectedPlayer);
    } catch (err) {
      console.error('❌ Failed to save gym survey:', err);
      alert(getTranslation(lang, 'error'));
    }
  };

  const pendingPlayers = players.filter(p => !submitted[p.name]);

  // Reusable Slider Component (Mobile First Design)
  const RenderSlider = ({ label, value, onChange }) => {
    const hasValue = typeof value === "number";
    const displayValue = hasValue ? value : 5;

    // Dynamic Text Logic
    const dynamicText = hasValue ? getRpeText(lang, value, 'gym') : "";

    // Gradient Logic
    const getGradient = () => "linear-gradient(90deg, #4ade80 0%, #facc15 50%, #ef4444 100%)";
    const thumbPosition = ((displayValue - 1) / 9) * 100;

    return (
      <div className="mb-0 select-none touch-none" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-end mb-4">
          <label className="font-bold text-lg text-gray-800">{label}</label>
          {hasValue && (
            <span className="text-3xl font-black text-indigo-600 transition-all scale-110">
              {value}
            </span>
          )}
        </div>

        {/* Slider Track Container */}
        <div className="relative h-14 w-full flex items-center">
          {/* Background Track with Gradient */}
          <div
            className="absolute w-full h-4 rounded-full shadow-inner opacity-90"
            style={{ background: getGradient() }}
          ></div>

          {/* Invisible Range Input for Interaction */}
          <input
            type="range"
            min="1" max="10" step="1"
            value={displayValue}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />

          {/* Custom Thumb */}
          <div
            className="absolute h-10 w-10 bg-white border-4 border-indigo-600 rounded-full shadow-lg z-10 pointer-events-none transition-all flex items-center justify-center"
            style={{
              left: `${thumbPosition}%`,
              transform: `translateX(-50%) scale(${hasValue ? 1.1 : 1})`
            }}
          >
            {/* Optional micro-dot inside thumb */}
            <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
          </div>
        </div>

        {/* Dynamic Label Display Below Slider */}
        <div className="mt-3 text-center h-8 mb-6">
          {hasValue ? (
            <span className="text-lg font-bold text-gray-700 animate-in fade-in slide-in-from-top-1 duration-200 block">
              {dynamicText}
            </span>
          ) : (
            <span className="text-sm text-gray-400 font-medium italic">
              {lang === 'he' ? 'הזז את המחוון...' : 'Slide to select...'}
            </span>
          )}
        </div>
      </div>
    );
  };


  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce">
            ✓
          </div>
          <div className="text-2xl font-bold mb-4">{getTranslation(lang, 'successTitle')}</div>
          <p className="mb-6 text-center text-gray-600">{successMessage}</p>
          <button
            type="button"
            onClick={() => {
              setShowSuccess(false);
              setSelectedPlayer('');
              setRpe(null);
              setNotes('');
            }}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            {getTranslation(lang, 'nextPlayer')}
          </button>
        </div>
      </div>
    );
  }

  
  return (
    <div className="flex flex-col flex-1 p-6">
      <SurveySessionSelector onSessionSelect={setActiveSession} />
      
      {activeSession ? (
        <div className="survey-form mx-auto w-full" style={{maxWidth: "500px"}}>
          <div className="survey-wrap">
            <div className="survey-card">
              <h1 className="text-xl font-bold mb-4">Gym Survey</h1>
<form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">{getTranslation(lang, 'selectPlayer')}</label>
              <div className="relative">
                <select
                  value={selectedPlayer}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedPlayer(val);
                    const player = players.find(p => p.name === val);
                    if (player) setLang(player.preferredLanguage);

                    const existing = submitted[val];
                    if (existing) {
                      setRpe(existing.rpe);
                      setNotes(existing.notes || '');
                    } else {
                      setRpe(null);
                      setNotes('');
                    }
                  }}
                  className="w-full text-lg p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-gray-50"
                  required
                  disabled={isLoading}
                >
                  <option value="">{isLoading ? getTranslation(lang, 'loading') : getTranslation(lang, 'chooseName')}</option>
                  {!isLoading && players.map(p => (
                    <option key={p.name} value={p.name}>
                      {p.name} {submitted[p.name] ? '✓' : ''}
                    </option>
                  ))}
                </select>
                {isLoading && (
                  <div className={`absolute top-1/2 -translate-y-1/2 ${lang === 'he' ? 'left-3' : 'right-3'}`}>
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <RenderSlider label={getTranslation(lang, 'gymIntensity')} value={rpe} onChange={setRpe} />
              <div className="p-4 bg-blue-100/50 rounded-xl">
                <p className="text-sm text-blue-800 leading-relaxed">
                  {getTranslation(lang, 'gymTip')}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">{getTranslation(lang, 'notesLabel')}</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none h-32"
                placeholder={getTranslation(lang, 'notesPlaceholder')}
              />
            </div>

            <button
              type="submit"
              className={`
                    w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:-translate-y-1 active:scale-95
                    ${(!selectedPlayer || rpe === null)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30'
                }
                `}
              disabled={!selectedPlayer || rpe === null}
            >
              {getTranslation(lang, 'saveResponse')}
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
