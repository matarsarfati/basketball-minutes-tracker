// Start/stop game timer
const toggleGame = () => {
  const newRunningState = !isRunning;
  setIsRunning(newRunningState);
  
  // If starting the game for the first time
  if (newRunningState && !gameStarted) {
    setGameStarted(true);
    setRealTime(0);
    // Start rest time for all players not currently playing - they start resting NOW
    setPlayers(players.map(player => ({
      ...player,
      restSessionStart: !player.isPlaying ? 0 : 0, // Everyone starts from realTime 0
      hasEverPlayed: player.isPlaying ? true : player.hasEverPlayed
    })));
  }
};import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, UserPlus, UserMinus, Users, Eye, EyeOff } from 'lucide-react';

const BasketballMinutesTracker = () => {
const [gameTime, setGameTime] = useState(600); // Game time in seconds (starts at 10:00)
const [isRunning, setIsRunning] = useState(false);
const [gameStarted, setGameStarted] = useState(false); // Track if game has ever started
const [realTime, setRealTime] = useState(0); // Real time counter for rest sessions
const [players, setPlayers] = useState([
  { id: 1, name: 'Player 1', number: 4, isPlaying: false, totalMinutes: 0, currentSessionStart: 0, currentRestTime: 0, hasEverPlayed: false, playingSessions: [], showRestTime: true },
  { id: 2, name: 'Player 2', number: 7, isPlaying: false, totalMinutes: 0, currentSessionStart: 0, currentRestTime: 0, hasEverPlayed: false, playingSessions: [], showRestTime: true },
  { id: 3, name: 'Player 3', number: 11, isPlaying: false, totalMinutes: 0, currentSessionStart: 0, currentRestTime: 0, hasEverPlayed: false, playingSessions: [], showRestTime: true },
  { id: 4, name: 'Player 4', number: 23, isPlaying: false, totalMinutes: 0, currentSessionStart: 0, currentRestTime: 0, hasEverPlayed: false, playingSessions: [], showRestTime: true },
  { id: 5, name: 'Player 5', number: 33, isPlaying: false, totalMinutes: 0, currentSessionStart: 0, currentRestTime: 0, hasEverPlayed: false, playingSessions: [], showRestTime: true },
]);
const [newPlayerName, setNewPlayerName] = useState('');
const [newPlayerNumber, setNewPlayerNumber] = useState('');
const [showAddPlayer, setShowAddPlayer] = useState(false);
const [showSessionHistory, setShowSessionHistory] = useState(false);
const [selectedPlayer, setSelectedPlayer] = useState(null);

const intervalRef = useRef(null);
const realTimeIntervalRef = useRef(null);

// Main game timer (counting down) - for official game time
useEffect(() => {
  if (isRunning && gameStarted) {
    intervalRef.current = setInterval(() => {
      setGameTime(prev => Math.max(0, prev - 1));
    }, 1000);
  } else {
    clearInterval(intervalRef.current);
  }

  return () => clearInterval(intervalRef.current);
}, [isRunning, gameStarted]);

// Real time timer - runs continuously once game started (for rest sessions)
useEffect(() => {
  if (gameStarted) {
    realTimeIntervalRef.current = setInterval(() => {
      setRealTime(prev => prev + 1);
      // Update rest time for all players who are resting
      setPlayers(prevPlayers => 
        prevPlayers.map(player => 
          (!player.isPlaying && gameStarted) 
            ? { ...player, currentRestTime: player.currentRestTime + 1 }
            : player
        )
      );
    }, 1000);
  } else {
    clearInterval(realTimeIntervalRef.current);
  }

  return () => clearInterval(realTimeIntervalRef.current);
}, [gameStarted]);

// Get current quarter
const getCurrentQuarter = () => {
  if (gameTime > 450) return 1; // 7:30 - 10:00
  if (gameTime > 300) return 2; // 5:00 - 7:30
  if (gameTime > 150) return 3; // 2:30 - 5:00
  return 4; // 0:00 - 2:30
};

// Format time for display
const formatGameTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Format time for sessions (MM:SS) - works with positive seconds
const formatTime = (seconds) => {
  const absSeconds = Math.abs(seconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Start/stop game timer
const toggleGame = () => {
  const newRunningState = !isRunning;
  setIsRunning(newRunningState);
  
  // If starting the game for the first time
  if (newRunningState && !gameStarted) {
    setGameStarted(true);
    setRealTime(0);
    // Initialize rest session for all players not playing - start from realTime 0
    setPlayers(players.map(player => ({
      ...player,
      restSessionStart: !player.isPlaying ? 0 : 0,
      hasEverPlayed: player.isPlaying ? true : player.hasEverPlayed
    })));
  }
};

// Reset game
const resetGame = () => {
  setIsRunning(false);
  setGameStarted(false);
  setGameTime(600);
  setRealTime(0);
  setPlayers(players.map(player => ({
    ...player,
    isPlaying: false,
    totalMinutes: 0,
    currentSessionStart: 0,
    currentRestTime: 0,
    hasEverPlayed: false,
    playingSessions: [],
    showRestTime: true
  })));
};

// Reset consecutive times (for half-time)
const resetConsecutiveTimes = () => {
  setPlayers(players.map(player => {
    if (player.isPlaying) {
      // For playing players, add current session to total and restart session
      const sessionMinutes = player.currentSessionStart - gameTime;
      return {
        ...player,
        totalMinutes: player.totalMinutes + sessionMinutes,
        currentSessionStart: gameTime
      };
    } else if (player.hasEverPlayed) {
      // For resting players, reset rest time
      return {
        ...player,
        currentRestTime: 0
      };
    }
    return player;
  }));
};

// Put player in game
const putPlayerIn = (playerId) => {
  setPlayers(players.map(player => 
    player.id === playerId 
      ? { 
          ...player, 
          isPlaying: true, 
          currentSessionStart: gameTime,
          currentRestTime: 0, // Reset rest time to 0
          hasEverPlayed: true
        }
      : player
  ));
};

// Take player out of game
const takePlayerOut = (playerId) => {
  setPlayers(players.map(player => {
    if (player.id === playerId && player.isPlaying) {
      const sessionMinutes = player.currentSessionStart - gameTime;
      const newSession = {
        start: formatGameTime(player.currentSessionStart),
        end: formatGameTime(gameTime),
        quarter: getCurrentQuarter()
      };
      return {
        ...player,
        isPlaying: false,
        totalMinutes: player.totalMinutes + sessionMinutes,
        currentSessionStart: 0,
        restSessionStart: gameStarted ? gameTime : 0, // Only start rest time if game has started
        playingSessions: [...player.playingSessions, newSession]
      };
    }
    return player;
  }));
};

// Add new player
const addPlayer = () => {
  if (newPlayerName.trim() && newPlayerNumber.trim()) {
    const newPlayer = {
      id: Date.now(),
      name: newPlayerName.trim(),
      number: parseInt(newPlayerNumber),
      isPlaying: false,
      totalMinutes: 0,
      currentSessionStart: 0,
      currentRestTime: 0,
      hasEverPlayed: false,
      playingSessions: [],
      showRestTime: true
    };
    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
    setNewPlayerNumber('');
    setShowAddPlayer(false);
  }
};

// Toggle rest time visibility for specific player
const togglePlayerRestTime = (playerId) => {
  setPlayers(players.map(player => 
    player.id === playerId 
      ? { ...player, showRestTime: !player.showRestTime }
      : player
  ));
};

// Calculate current total minutes (including current session)
const getCurrentTotalMinutes = (player) => {
  let total = player.totalMinutes;
  if (player.isPlaying) {
    total += (player.currentSessionStart - gameTime);
  }
  return total;
};

// Calculate consecutive playing time
const getConsecutivePlayingTime = (player) => {
  if (!player.isPlaying) return 0;
  return player.currentSessionStart - gameTime;
};

// Calculate consecutive rest time - SUPER SIMPLE!
const getConsecutiveRestTime = (player) => {
  return player.currentRestTime;
};

// Get playing sessions text - only last session
const getLastSessionText = (player) => {
  if (player.isPlaying) {
    return `${formatGameTime(gameTime)}- Q${getCurrentQuarter()}`;
  }
  
  if (player.playingSessions.length === 0) return '';
  
  const lastSession = player.playingSessions[player.playingSessions.length - 1];
  return `${lastSession.end}-${lastSession.start} Q${lastSession.quarter}`;
};

// Get all playing sessions for modal
const getAllSessionsText = (player) => {
  const sessions = [...player.playingSessions];
  
  // Add current session if playing
  if (player.isPlaying) {
    sessions.push({ 
      start: formatGameTime(player.currentSessionStart),
      end: formatGameTime(gameTime),
      quarter: getCurrentQuarter(),
      isCurrent: true
    });
  }
  
  if (sessions.length === 0) return [];
  
  return sessions.map(session => {
    if (session.isCurrent) {
      return `${session.end}- Q${session.quarter}`;
    }
    return `${session.end}-${session.start} Q${session.quarter}`;
  });
};

// Show session history modal
const showPlayerHistory = (player) => {
  setSelectedPlayer(player);
  setShowSessionHistory(true);
};

const playingPlayers = players.filter(p => p.isPlaying);

return (
  <div className="min-h-screen bg-gradient-to-br from-orange-100 to-blue-100 p-4">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-2xl p-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8 flex items-center justify-center gap-3">
          <Users className="w-8 h-8 text-orange-600" />
          Basketball Minutes Tracker
        </h1>

        {/* Main Timer */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 mb-8 text-white">
          <div className="text-center">
            <div className="text-6xl font-mono font-bold mb-2">
              {formatGameTime(gameTime)}
            </div>
            <div className="text-xl font-semibold mb-4">
              Quarter {getCurrentQuarter()}
            </div>
            <div className="flex justify-center gap-4">
              <button
                onClick={toggleGame}
                className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-gray-100 transition-colors"
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isRunning ? 'Pause' : 'Start'}
              </button>
            </div>
          </div>
        </div>

        {/* Reset buttons - moved far from main controls */}
        <div className="mb-8 flex justify-end gap-3">
          <button
            onClick={resetConsecutiveTimes}
            className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium hover:bg-blue-200 transition-colors"
          >
            Half Time Reset
          </button>
          <button
            onClick={resetGame}
            className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium flex items-center gap-1 hover:bg-red-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Game
          </button>
        </div>

        {/* Players Table */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Time</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Playing Session</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rest Session</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {players.map(player => (
                <tr key={player.id} className={player.isPlaying ? 'bg-green-50' : 'bg-white'}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-lg font-bold text-gray-900">#{player.number}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{player.name}</div>
                    {getLastSessionText(player) && (
                      <button
                        onClick={() => showPlayerHistory(player)}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1 cursor-pointer"
                      >
                        {getLastSessionText(player)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      player.isPlaying 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {player.isPlaying ? 'Playing' : 'Bench'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="text-lg font-bold text-gray-900 font-mono">
                      {formatTime(getCurrentTotalMinutes(player))}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className={`text-lg font-bold font-mono ${player.isPlaying ? 'text-green-600' : 'text-gray-400'}`}>
                      {player.isPlaying ? formatTime(getConsecutivePlayingTime(player)) : '00:00'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {player.showRestTime ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className={`text-lg font-bold font-mono ${!player.isPlaying && gameStarted ? 'text-red-600' : 'text-gray-400'}`}>
                          {!player.isPlaying && gameStarted ? formatTime(getConsecutiveRestTime(player)) : '00:00'}
                        </div>
                        <button
                          onClick={() => togglePlayerRestTime(player.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => togglePlayerRestTime(player.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      {player.isPlaying ? (
                        <button
                          onClick={() => takePlayerOut(player.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Out
                        </button>
                      ) : (
                        <button
                          onClick={() => putPlayerIn(player.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          In
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Player Button */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAddPlayer(true)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
          >
            <UserPlus className="w-4 h-4" />
            Manage Players
          </button>
        </div>

        {/* Manage Players Modal */}
        {showAddPlayer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Manage Players</h3>
              
              {/* Add new player section */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-3 text-blue-800">Add New Player</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Player Name</label>
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number</label>
                    <input
                      type="number"
                      value={newPlayerNumber}
                      onChange={(e) => setNewPlayerNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter number"
                    />
                  </div>
                  <button
                    onClick={addPlayer}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add Player
                  </button>
                </div>
              </div>

              {/* Current players list */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-gray-800">Current Players</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {players.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">#{player.number} {player.name}</span>
                      <button
                        onClick={() => setPlayers(players.filter(p => p.id !== player.id))}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowAddPlayer(false);
                    setNewPlayerName('');
                    setNewPlayerNumber('');
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session History Modal */}
        {showSessionHistory && selectedPlayer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
              <h3 className="text-lg font-bold mb-4 text-gray-800">
                Session History - {selectedPlayer.name} (#{selectedPlayer.number})
              </h3>
              <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                {getAllSessionsText(selectedPlayer).length > 0 ? (
                  <div className="space-y-2">
                    {getAllSessionsText(selectedPlayer).map((session, index) => (
                      <div key={index} className="text-sm text-gray-700 py-1 border-b border-gray-200 last:border-b-0">
                        {session}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No sessions yet
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowSessionHistory(false);
                    setSelectedPlayer(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default BasketballMinutesTracker;