import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rosterService } from './services/rosterService';
import { wellnessService } from './services/wellnessService';

const SCORE_RANGES = {
  sleep: {
    good: (score) => score >= 7,
    moderate: (score) => score >= 5,
    // below 5 is concerning
  },
  fatigue: {
    good: (score) => score <= 4,
    moderate: (score) => score <= 6,
    // above 6 is concerning
  },
  soreness: {
    good: (score) => score <= 4,
    moderate: (score) => score <= 6,
    // above 6 is concerning
  }
};

const getScoreColor = (type, score) => {
  if (SCORE_RANGES[type].good(score)) return '#10b981'; // green
  if (SCORE_RANGES[type].moderate(score)) return '#f59e0b'; // yellow
  return '#ef4444'; // red
};

const WellnessEmoji = ({ type, score }) => {
  const emojis = {
    sleep: ["😴", "😪", "🥱", "😑", "😐", "🙂", "😊", "😁", "😄", "🤩"],
    fatigue: ["😌", "🙂", "😐", "😕", "😟", "😓", "😰", "😫", "😵", "💀"],
    soreness: ["💪", "😊", "🙂", "😐", "😕", "😣", "😖", "😩", "😫", "🤕"]
  };
  
  return <span>{emojis[type][score - 1] || '❓'}</span>;
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  });
};

export default function WellnessDashboard() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [wellnessData, setWellnessData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [playersList, todayData] = await Promise.all([
          rosterService.getPlayers(),
          wellnessService.getTodayWellness()
        ]);
        setPlayers(playersList || []);
        setWellnessData(todayData);
      } catch (error) {
        console.error('Failed to load wellness data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const averages = wellnessData?.averages || { sleep: 0, fatigue: 0, soreness: 0 };
  const responses = wellnessData?.responses || {};
  const completedCount = Object.keys(responses).length;
  const totalPlayers = players.length;
  const pendingPlayers = players.filter(p => !responses[p.name]);

  if (isLoading) {
    return <div className="p-4">Loading wellness data...</div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate('/schedule')}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back to Schedule
        </button>
        <button
          onClick={() => navigate('/wellness/survey')}
          className="px-4 py-2 bg-[#14b8a6] text-white rounded-lg hover:bg-[#0d9488] flex items-center gap-2"
        >
          📋 Open Player Survey
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-2">💪 Daily Wellness Dashboard</h1>
      <p className="text-lg text-gray-600 mb-6">
        {new Date().toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Team Sleep Quality</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            {averages.sleep.toFixed(1)}/10
            <WellnessEmoji type="sleep" score={Math.round(averages.sleep)} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Team Fatigue Level</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            {averages.fatigue.toFixed(1)}/10
            <WellnessEmoji type="fatigue" score={Math.round(averages.fatigue)} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Team Muscle Soreness</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            {averages.soreness.toFixed(1)}/10
            <WellnessEmoji type="soreness" score={Math.round(averages.soreness)} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <h2 className="font-bold">Today's Responses ({completedCount} of {totalPlayers} players)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-gray-50">
                <th className="p-4">Player</th>
                <th className="p-4">Sleep</th>
                <th className="p-4">Fatigue</th>
                <th className="p-4">Soreness</th>
                <th className="p-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {players
                .filter(player => responses[player.name])
                .map(player => {
                  const response = responses[player.name];
                  return (
                    <tr key={player.name} className="border-t">
                      <td className="p-4">
                        {player.name}
                        {player.number && <span className="text-gray-500 ml-2">#{player.number}</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span style={{ color: getScoreColor('sleep', response.sleep) }}>
                            {response.sleep}/10
                          </span>
                          <WellnessEmoji type="sleep" score={response.sleep} />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span style={{ color: getScoreColor('fatigue', response.fatigue) }}>
                            {response.fatigue}/10
                          </span>
                          <WellnessEmoji type="fatigue" score={response.fatigue} />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span style={{ color: getScoreColor('soreness', response.soreness) }}>
                            {response.soreness}/10
                          </span>
                          <WellnessEmoji type="soreness" score={response.soreness} />
                        </div>
                      </td>
                      <td className="p-4 text-gray-500">
                        {formatTime(response.timestamp)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {pendingPlayers.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-bold">Pending Responses ({pendingPlayers.length} players)</h2>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pendingPlayers.map(player => (
              <div key={player.name} className="flex items-center gap-2">
                <span>⏳</span>
                <span>{player.name}</span>
                {player.number && <span className="text-gray-500">#{player.number}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
