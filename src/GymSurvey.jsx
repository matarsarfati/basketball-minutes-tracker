import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { practiceDataService } from './services/practiceDataService';
import { rosterService } from './services/rosterService';
import {
  getTranslation,
  getRpeText,
  SUCCESS_MESSAGES
} from './constants/translations';
import "./SurveyForm.css";

const SURVEY_STORE_KEY = "practiceSurveysV1";

export default function GymSurvey() {
  const { sessionId } = useParams();
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [lang, setLang] = useState('he'); // Default to Hebrew

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
              number: p.number,
              preferredLanguage: p.preferredLanguage || 'he'
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          setPlayers(present);
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

  if (dataError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-red-100">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Unable to load survey</h3>
          <p className="text-red-500">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            {getTranslation(lang, 'retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
          <Link to={`/practice/${sessionId}`} className={`absolute top-6 text-gray-400 hover:text-gray-600 ${lang === 'he' ? 'left-6' : 'right-6'}`}>
            <span className="text-xl">{lang === 'he' ? '→' : '←'}</span> {getTranslation(lang, 'backToPractice')}
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-6 text-center">{getTranslation(lang, 'gymSurveyTitle')}</h1>

          {/* Conditional Status Section */}
          {!isLoading && (
            <div className="mb-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-bold text-purple-600">
                  {Object.keys(submitted).length} / {players.length} {getTranslation(lang, 'completedCount')}
                </span>
              </div>
              {pendingPlayers.length > 0 ? (
                <div>
                  <div className="text-xs text-purple-800 uppercase font-bold mb-2 tracking-wider">{getTranslation(lang, 'waitingFor')}</div>
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
                  ✅ {getTranslation(lang, 'allComplete')}
                </div>
              )}
            </div>
          )}

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
  );
}