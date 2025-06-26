import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Users, Eye, EyeOff, UserPlus, UserMinus } from 'lucide-react';
import './App.css';

function App() {
  const [gameTime, setGameTime] = useState(600); // 10 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState([
    { id: 1, name: 'Player 1', number: 4, isPlaying: false, totalMinutes: 0, currentSessionStart: 0, currentRestTime: 0, hasEverPlayed: false, playingSessions: [], showRestTime: true },
    { id: 2, name: 'Player 2', number: 7, isPlaying: false, totalMinutes: 0, currentSessionStart: 0, currentRestTime: 0, hasEverPlayed: false, playingSessions: [], showRestTime: true },
    { id: 3, name: 'Player 3', number: 11, isPlaying: false, totalMinutes: 0, currentSessionStart: 0, currentRestTime: 0, hasEverPlayed: false, playingSessions: [], showRestTime: true },
    { id: 4, name: 'Player 4', number: 23, isPlaying: false, totalMinutes: 0, currentSessionStart: 0, currentRestTime: 0, hasEverPlayed: false, playingSessions: [], showRestTime: true },
    { id: 5, name: 'Player 5', number: 33, isPlaying: false, totalMinutes: 0, currentSessionStart: 0, currentRestTime: 0, hasEverPlayed: false, playingSessions: [], showRestTime: true },
  ]);
  
  // Modal states
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  const intervalRef = useRef(null);
  const realTimeIntervalRef = useRef(null);

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

  // Get current quarter
  const getCurrentQuarter = () => {
    if (gameTime > 450) return 1;
    if (gameTime > 300) return 2;
    if (gameTime > 150) return 3;
    return 4;
  };

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

  // Start/stop game timer
  const toggleGame = () => {
    const newRunningState = !isRunning;
    setIsRunning(newRunningState);
    
    // If starting the game for the first time
    if (newRunningState && !gameStarted) {
      setGameStarted(true);
    }
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
            hasEverPlayed: true,
            // Add entry session immediately when player enters
            playingSessions: [...player.playingSessions, {
              start: formatGameTime(gameTime),
              end: '', // Will be filled when player exits
              quarter: getCurrentQuarter(),
              isActive: true
            }]
          }
        : player
    ));
  };

  // Take player out of game
  const takePlayerOut = (playerId) => {
    setPlayers(players.map(player => {
      if (player.id === playerId && player.isPlaying) {
        const sessionMinutes = player.currentSessionStart - gameTime;
        // Update the last session with exit time
        const updatedSessions = [...player.playingSessions];
        const lastSessionIndex = updatedSessions.length - 1;
        if (lastSessionIndex >= 0 && updatedSessions[lastSessionIndex].isActive) {
          updatedSessions[lastSessionIndex] = {
            ...updatedSessions[lastSessionIndex],
            end: formatGameTime(gameTime),
            isActive: false
          };
        }

        return {
          ...player,
          isPlaying: false,
          totalMinutes: player.totalMinutes + sessionMinutes,
          currentSessionStart: 0,
          currentRestTime: 0, // Start rest time from 0
          playingSessions: updatedSessions
        };
      }
      return player;
    }));
  };

  // Calculate consecutive rest time
  const getConsecutiveRestTime = (player) => {
    return player.currentRestTime;
  };

  // Reset game with confirmation
  const resetGame = () => {
    if (window.confirm('Are you sure you want to reset the entire game? This will clear all data.')) {
      setGameTime(600);
      setRealTime(0);
      setIsRunning(false);
      setGameStarted(false);
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
    }
  };

  // Reset consecutive times (for half-time) with confirmation
  const resetConsecutiveTimes = () => {
    if (window.confirm('Are you sure you want to reset consecutive times? This is typically done at half-time.')) {
      setPlayers(players.map(player => {
        if (player.isPlaying) {
          // For playing players, add current session to total and restart session
          const sessionMinutes = player.currentSessionStart - gameTime;
          // Update current active session
          const updatedSessions = [...player.playingSessions];
          const lastSessionIndex = updatedSessions.length - 1;
          if (lastSessionIndex >= 0 && updatedSessions[lastSessionIndex].isActive) {
            updatedSessions[lastSessionIndex] = {
              ...updatedSessions[lastSessionIndex],
              end: formatGameTime(gameTime),
              isActive: false
            };
            // Add new session starting now
            updatedSessions.push({
              start: formatGameTime(gameTime),
              end: '',
              quarter: getCurrentQuarter(),
              isActive: true
            });
          }
          
          return {
            ...player,
            totalMinutes: player.totalMinutes + sessionMinutes,
            currentSessionStart: gameTime,
            playingSessions: updatedSessions
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
    }
  };

  // Toggle rest time visibility
  const toggleRestTimeVisibility = (playerId) => {
    setPlayers(players.map(player => 
      player.id === playerId 
        ? { ...player, showRestTime: !player.showRestTime }
        : player
    ));
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

  // Remove player
  const removePlayer = (playerId) => {
    if (window.confirm('Are you sure you want to remove this player?')) {
      setPlayers(players.filter(p => p.id !== playerId));
    }
  };

  // Get last session text for display
  const getLastSessionText = (player) => {
    if (player.playingSessions.length === 0) return '';
    
    const lastSession = player.playingSessions[player.playingSessions.length - 1];
    if (lastSession.isActive) {
      return `Q${lastSession.quarter} ${lastSession.start}-`;
    } else {
      return `Q${lastSession.quarter} ${lastSession.start}-${lastSession.end}`;
    }
  };

  // Get all sessions text for modal
  const getAllSessionsText = (player) => {
    if (player.playingSessions.length === 0) return [];
    
    return player.playingSessions.map(session => {
      if (session.isActive) {
        return `Q${session.quarter} ${session.start}-`;
      }
      return `Q${session.quarter} ${session.start}-${session.end}`;
    });
  };

  // Show session history modal
  const showPlayerHistory = (player) => {
    setSelectedPlayer(player);
    setShowSessionHistory(true);
  };

  return (
    <div className="app-container">
      <div className="max-w-6xl">
        {/* Header */}
        <div className="header">
          <Users className="header-icon" />
          <h1>Basketball Minutes Tracker</h1>
        </div>

        {/* Main Timer */}
        <div className="main-timer">
          <div className="timer-display">
            {formatGameTime(gameTime)}
          </div>
          <div className="quarter-display">Quarter {getCurrentQuarter()}</div>
          <button onClick={toggleGame} className="start-button">
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
        </div>

        {/* Control Buttons */}
        <div className="control-buttons">
          <button onClick={resetConsecutiveTimes} className="half-time-button">
            Half Time Reset
          </button>
          <button onClick={resetGame} className="reset-button">
            🔄 Reset Game
          </button>
        </div>

        {/* Players Table */}
        <div className="players-table-container">
          <table className="players-table">
            <thead className="table-header">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Status</th>
                <th>Total Time</th>
                <th>Playing Session</th>
                <th>Rest Session</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {players.map((player) => (
                <tr key={player.id} className="table-row">
                  <td className="table-cell">
                    <div className="player-number">#{player.number}</div>
                  </td>
                  <td className="table-cell">
                    <div className="player-name">{player.name}</div>
                    {getLastSessionText(player) && (
                      <div 
                        className="session-info"
                        onClick={() => showPlayerHistory(player)}
                        style={{ cursor: 'pointer' }}
                      >
                        {getLastSessionText(player)}
                      </div>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={`status-badge ${player.isPlaying ? 'status-playing' : 'status-bench'}`}>
                      {player.isPlaying ? 'Playing' : 'Bench'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="time-display time-total">
                      {formatTime(player.totalMinutes + (player.isPlaying ? player.currentSessionStart - gameTime : 0))}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className={`time-display ${player.isPlaying ? 'time-total' : 'time-playing'}`}>
                      {player.isPlaying ? formatTime(player.currentSessionStart - gameTime) : '00:00'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="rest-time-container">
                      <span className={`time-display ${player.isPlaying ? 'time-playing' : 'time-rest'}`}>
                        {player.showRestTime ? formatTime(getConsecutiveRestTime(player)) : '••:••'}
                      </span>
                      <button
                        onClick={() => toggleRestTimeVisibility(player.id)}
                        className="eye-button"
                      >
                        {player.showRestTime ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => player.isPlaying ? takePlayerOut(player.id) : putPlayerIn(player.id)}
                      className={`action-button ${player.isPlaying ? 'button-out' : 'button-in'}`}
                    >
                      {player.isPlaying ? 'Out' : 'In'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Manage Players Button */}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            onClick={() => setShowAddPlayer(true)}
            className="half-time-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <UserPlus size={16} />
            Manage Players
          </button>
        </div>

        {/* Manage Players Modal */}
        {showAddPlayer && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              width: '24rem',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
                Manage Players
              </h3>
              
              {/* Add new player section */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#dbeafe',
                borderRadius: '0.5rem'
              }}>
                <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#1e40af' }}>
                  Add New Player
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      Player Name
                    </label>
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      Number
                    </label>
                    <input
                      type="number"
                      value={newPlayerNumber}
                      onChange={(e) => setNewPlayerNumber(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Enter number"
                    />
                  </div>
                  <button
                    onClick={addPlayer}
                    style={{
                      width: '100%',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Add Player
                  </button>
                </div>
              </div>

              {/* Current players list */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#111827' }}>
                  Current Players
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '10rem', overflowY: 'auto' }}>
                  {players.map(player => (
                    <div key={player.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.375rem'
                    }}>
                      <span style={{ fontSize: '0.875rem' }}>#{player.number} {player.name}</span>
                      <button
                        onClick={() => removePlayer(player.id)}
                        style={{
                          color: '#dc2626',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.25rem'
                        }}
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddPlayer(false);
                    setNewPlayerName('');
                    setNewPlayerNumber('');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session History Modal */}
        {showSessionHistory && selectedPlayer && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              width: '24rem',
              maxWidth: '90vw'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
                Session History - {selectedPlayer.name} (#{selectedPlayer.number})
              </h3>
              <div style={{
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                maxHeight: '15rem',
                overflowY: 'auto'
              }}>
                {getAllSessionsText(selectedPlayer).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {getAllSessionsText(selectedPlayer).map((session, index) => (
                      <div key={index} style={{
                        fontSize: '0.875rem',
                        color: '#374151',
                        paddingBottom: '0.25rem',
                        borderBottom: index < getAllSessionsText(selectedPlayer).length - 1 ? '1px solid #e5e7eb' : 'none'
                      }}>
                        {session}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    textAlign: 'center',
                    padding: '1rem'
                  }}>
                    No sessions yet
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowSessionHistory(false);
                    setSelectedPlayer(null);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;