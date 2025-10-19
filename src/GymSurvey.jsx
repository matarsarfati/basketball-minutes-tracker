import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const SURVEY_STORE_KEY = "practiceSurveysV1";

const safeParse = (key, defaultValue) => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

function GymSurvey() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [players, setPlayers] = useState([]);
  const [responses, setResponses] = useState({});
  const [currentRPE, setCurrentRPE] = useState(5);

  useEffect(() => {
    const players = safeParse(`gymSurveyPlayers_${sessionId}`, []);
    setPlayers(players);

    // Load existing responses
    const allSurveys = safeParse(SURVEY_STORE_KEY, {});
    const existingResponses = allSurveys[`${sessionId}_gym`] || {};
    setResponses(existingResponses);
  }, [sessionId]);

  const handleNext = () => {
    const player = players[currentPlayerIndex];
    if (!player) return;

    const updatedResponses = {
      ...responses,
      [player.name]: {
        rpe: currentRPE
      }
    };

    // Save to localStorage
    const allSurveys = safeParse(SURVEY_STORE_KEY, {});
    localStorage.setItem(
      SURVEY_STORE_KEY,
      JSON.stringify({
        ...allSurveys,
        [`${sessionId}_gym`]: updatedResponses
      })
    );

    setResponses(updatedResponses);

    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setCurrentRPE(5); // Reset RPE for next player
    } else {
      navigate(`/practice/${sessionId}`);
    }
  };

  const player = players[currentPlayerIndex];
  if (!player) return null;

  const existingResponse = responses[player.name];
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Gym Session Feedback
          </h1>
          
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-medium text-gray-900">
                {player.name}
              </span>
              <span className="text-sm text-gray-500">
                {currentPlayerIndex + 1} of {players.length}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-purple-500 rounded-full transition-all"
                style={{
                  width: `${((currentPlayerIndex + 1) / players.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <label className="block text-lg font-medium text-gray-900 mb-4">
                Session Intensity (RPE)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={currentRPE}
                onChange={(e) => setCurrentRPE(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Very Easy (1)</span>
                <span>Very Hard (10)</span>
              </div>
              <div className="text-center text-2xl font-bold text-purple-600 mt-2">
                {currentRPE}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleNext}
              className="w-full py-3 px-4 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
            >
              {currentPlayerIndex < players.length - 1 ? "Next Player" : "Finish"}
            </button>
          </div>

          {existingResponse && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              Previous response: RPE {existingResponse.rpe}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default GymSurvey;
