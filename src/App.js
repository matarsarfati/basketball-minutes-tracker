import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Users, Eye, EyeOff, UserPlus, UserMinus } from 'lucide-react';
import './App.css';

function App() {
  const [gameTime, setGameTime] = useState(2400); // 40 minutes total (4 quarters × 10 minutes)
  const [currentQuarter, setCurrentQuarter] = useState(1); // Track current quarter separately
  const [isQuarterBreak, setIsQuarterBreak] = useState(false); // Track if we're between quarters
  const [realTime, setRealTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1); // New state for game speed
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

  // Format time for quarter display (shows 10:00 per quarter, resets each quarter)
  const formatQuarterTime = (totalSeconds) => {
    const quarterLength = 600; // 10 minutes per quarter
    const timeInCurrentQuarter = totalSeconds % quarterLength;
    // Show countdown from 10:00 to 00:00
    const timeRemaining = timeInCurrentQuarter === 0 ? 600 : timeInCurrentQuarter;
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format time for sessions (MM:SS) - works with positive seconds
  const formatTime = (seconds) => {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format time for display (regular MM:SS format)
  const formatGameTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current quarter and update quarter state
  const getCurrentQuarter = () => {
    const quarterLength = 600; // 10 minutes per quarter
    const timeElapsed = 2400 - gameTime;
    const newQuarter = Math.floor(timeElapsed / quarterLength) + 1;
    
    // Update quarter state if it changed
    if (newQuarter !== currentQuarter && newQuarter <= 4) {
      setCurrentQuarter(newQuarter);
    }
    
    return Math.min(newQuarter, 4);
  };

  // Main game timer (counting down) - with quarter breaks and half-time logic
  useEffect(() => {
    if (isRunning && gameStarted) {
      intervalRef.current = setInterval(() => {
        setGameTime(prev => {
          const newTime = Math.max(0, prev - gameSpeed);
          
          // Check if quarter ended (when time reaches a multiple of 600 seconds remaining)
          const quarterLength = 600;
          const timeInCurrentQuarter = newTime % quarterLength;
          
          // If we just hit the end of a quarter (timeInCurrentQuarter becomes 0 and we're not at game end)
          if (timeInCurrentQuarter === 0 && newTime > 0) {
            const newQuarter = getCurrentQuarter() + 1;
            
            // Check if this is half-time (end of Q2, going to Q3)
            if (newQuarter === 3) {
              // Half-time logic
              setPlayers(prevPlayers => 
                prevPlayers.map(player => ({
                  ...player,
                  currentRestTime: 0, // Reset all rest times at half-time
                  // If player is currently playing, end their session and start new one
                  ...(player.isPlaying ? {
                    playingSessions: player.playingSessions.map((session, index) => 
                      index === player.playingSessions.length - 1 && session.isActive
                        ? { ...session, end: formatQuarterTime(newTime), isActive: false }
                        : session
                    ).concat([{
                      start: '10:00', // Will start at beginning of Q3
                      end: '',
                      quarter: 3,
                      isActive: true
                    }])
                  } : {})
                }))
              );
            }
            
            // Auto-pause at end of any quarter
            setIsRunning(false);
            setGameSpeed(1); // Reset speed
            setIsQuarterBreak(true);
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, gameStarted, gameSpeed]);

  // Real time timer - runs continuously once game started (for rest sessions) - pauses during quarter breaks and half-time
  useEffect(() => {
    if (gameStarted && !isQuarterBreak) {
      realTimeIntervalRef.current = setInterval(() => {
        setRealTime(prev => prev + 1);
        // Update rest time for all players who are resting - only if not in quarter break
        const currentQ = getCurrentQuarter();
        const isHalfTime = currentQ === 3 && gameTime <= 1800 && gameTime > 1200; // Between Q2 and Q3
        
        if (!isHalfTime) {
          setPlayers(prevPlayers => 
            prevPlayers.map(player => 
              (!player.isPlaying && gameStarted) 
                ? { ...player, currentRestTime: player.currentRestTime + gameSpeed }
                : player
            )
          );
        }
      }, 1000);
    } else {
      clearInterval(realTimeIntervalRef.current);
    }

    return () => clearInterval(realTimeIntervalRef.current);
  }, [gameStarted, gameSpeed, isQuarterBreak]);

  // Start/stop game timer
  const toggleGame = () => {
    const newRunningState = !isRunning;
    setIsRunning(newRunningState);
    
    // Reset speed to 1x when starting or stopping
    setGameSpeed(1);
    
    // Clear quarter break state when starting
    if (newRunningState) {
      setIsQuarterBreak(false);
    }
    
    // If starting the game for the first time
    if (newRunningState && !gameStarted) {
      setGameStarted(true);
    }
  };

  // Change game speed
  const changeGameSpeed = (speed) => {
    setGameSpeed(speed);
  };

  // Put player in game
  const putPlayerIn = (playerId) => {
    setPlayers(players.map(player => 
      player.id === playerId 
        ? { 
            ...player, 
            isPlaying: true, 
            currentSessionStart: gameTime,
            currentRestTime: 0,
            hasEverPlayed: true,
            playingSessions: [...player.playingSessions, {
              start: formatQuarterTime(gameTime),
              end: '',
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
        const updatedSessions = [...player.playingSessions];
        const lastSessionIndex = updatedSessions.length - 1;
        if (lastSessionIndex >= 0 && updatedSessions[lastSessionIndex].isActive) {
          updatedSessions[lastSessionIndex] = {
            ...updatedSessions[lastSessionIndex],
            end: formatQuarterTime(gameTime),
            isActive: false
          };
        }

        return {
          ...player,
          isPlaying: false,
          totalMinutes: player.totalMinutes + sessionMinutes,
          currentSessionStart: 0,
          currentRestTime: 0,
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
      setGameTime(2400);
      setCurrentQuarter(1);
      setRealTime(0);
      setIsRunning(false);
      setGameStarted(false);
      setGameSpeed(1); // Reset speed to normal
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

  // Remove the resetConsecutiveTimes function since it's no longer needed

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

  // Get last session text for display - simple version showing only entry/exit info
  const getLastSessionText = (player) => {
    if (player.playingSessions.length === 0) return '';
    
    const lastSession = player.playingSessions[player.playingSessions.length - 1];
    if (lastSession.isActive) {
      // Show entry time only
      return `Q${lastSession.quarter} ${lastSession.start}-`;
    } else {
      // Show entry and exit
      return `Q${lastSession.quarter} ${lastSession.start}-${lastSession.end}`;
    }
  };

  // Get all sessions text for modal - simple version
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
            {formatQuarterTime(gameTime)}
          </div>
          <div className="quarter-display">
            Quarter {getCurrentQuarter()}
            {isQuarterBreak && (
              <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', opacity: 0.9 }}>
                {getCurrentQuarter() === 3 && gameTime === 1800 ? 'Half Time' : 'Break'}
              </div>
            )}
          </div>
          
          {/* Speed Control */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            marginBottom: '1rem',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Speed:</span>
            {[1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => changeGameSpeed(speed)}
                style={{
                  backgroundColor: gameSpeed === speed ? '#dc2626' : 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '0.375rem',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {speed}x
              </button>
            ))}
          </div>

          <button onClick={toggleGame} className="start-button">
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
        </div>

        {/* Control Buttons */}
        <div className="control-buttons">
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