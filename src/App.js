// App.js – Minutes Tracker (fixed for createBrowserRouter)

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Users, Eye, EyeOff, UserPlus, UserMinus, RotateCcw, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import './App.css';
import { rosterService } from './services/rosterService';


/* ==== Constants ==== */
const QUARTER_LENGTH = 600;
const TOTAL_GAME_SECONDS = 2400;

/* ==== Helpers ==== */
const formatQuarterTime = (totalSeconds) => {
  const timeInCurrentQuarter = totalSeconds % QUARTER_LENGTH;
  const timeRemaining = timeInCurrentQuarter === 0 ? QUARTER_LENGTH : timeInCurrentQuarter;
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatTime = (seconds) => {
  const absSeconds = Math.abs(seconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const computeQuarter = (time) => {
  const timeElapsed = TOTAL_GAME_SECONDS - time;
  const rawQuarter = Math.floor(timeElapsed / QUARTER_LENGTH) + 1;
  return Math.min(Math.max(rawQuarter, 1), 4);
};

function MinutesTracker() {
  /* ==== Game State ==== */
  const [gameTime, setGameTime] = useState(TOTAL_GAME_SECONDS);
  const [currentQuarter, setCurrentQuarter] = useState(1);
  const [isQuarterBreak, setIsQuarterBreak] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);

  const [players, setPlayers] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);

  /* ==== Undo History ==== */
  const [history, setHistory] = useState([]);
  const MAX_HISTORY = 20; // Keep last 20 actions

  /* ==== Modal State ==== */
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  /* ==== Refs ==== */
  const intervalRef = useRef(null);
  const realTimeIntervalRef = useRef(null);
  const gameTimeRef = useRef(gameTime);

  useEffect(() => {
    gameTimeRef.current = gameTime;
  }, [gameTime]);

  /* ==== Load roster from Firestore ==== */
  useEffect(() => {
    const loadRoster = async () => {
      try {
        const firebasePlayers = await rosterService.getPlayers();

        // Transform Firestore players to minutes tracker format
        const transformedPlayers = firebasePlayers.map(fp => ({
          id: fp.id,
          name: fp.name,
          number: parseInt(fp.number, 10),
          isPlaying: false,
          totalMinutes: 0,
          currentSessionStart: 0,
          currentRestTime: 0,
          hasEverPlayed: false,
          playingSessions: [],
          showRestTime: true,
          firebaseId: fp.firebaseId
        }));

        setPlayers(transformedPlayers);
      } catch (error) {
        console.error('Failed to load roster from Firestore:', error);
        // Fallback to empty array - user can add players manually
        setPlayers([]);
      } finally {
        setIsLoadingRoster(false);
      }
    };

    loadRoster();
  }, []);

  /* ==== Helper: Save state to history ==== */
  const saveToHistory = () => {
    setHistory(prev => {
      const newHistory = [...prev, { players: JSON.parse(JSON.stringify(players)), gameTime, currentQuarter }];
      // Keep only last MAX_HISTORY items
      return newHistory.slice(-MAX_HISTORY);
    });
  };

  /* ==== Undo last action ==== */
  const undoLastAction = () => {
    if (history.length === 0) {
      alert('No actions to undo');
      return;
    }

    const lastState = history[history.length - 1];
    setPlayers(lastState.players);
    setGameTime(lastState.gameTime);
    setCurrentQuarter(lastState.currentQuarter);
    setHistory(prev => prev.slice(0, -1));
  };

  /* ==== Get players with >8 consecutive minutes ==== */
  const getPlayersOverEightMinutes = () => {
    return players.filter(p => {
      if (!p.isPlaying) return false;
      const consecutiveSeconds = p.currentSessionStart - gameTime;
      return consecutiveSeconds > 480; // 8 minutes = 480 seconds
    });
  };

  /* ==== Main countdown timer ==== */
  useEffect(() => {
    if (isRunning && gameStarted) {
      intervalRef.current = setInterval(() => {
        setGameTime((prev) => {
          const newTime = Math.max(0, prev - gameSpeed);

          const prevQ = computeQuarter(prev);
          const nextQ = computeQuarter(newTime);
          if (nextQ !== prevQ) setCurrentQuarter(nextQ);

          const timeInCurrentQuarter = newTime % QUARTER_LENGTH;
          if (timeInCurrentQuarter === 0 && newTime > 0) {
            if (nextQ === 3) {
              setPlayers((prevPlayers) =>
                prevPlayers.map((p) => ({
                  ...p,
                  currentRestTime: 0,
                  ...(p.isPlaying
                    ? {
                        playingSessions: p.playingSessions
                          .map((s, idx) =>
                            idx === p.playingSessions.length - 1 && s.isActive
                              ? { ...s, end: formatQuarterTime(newTime), isActive: false }
                              : s
                          )
                          .concat([
                            { start: '10:00', end: '', quarter: nextQ, isActive: true },
                          ]),
                      }
                    : {}),
                }))
              );
            }

            setIsRunning(false);
            setGameSpeed(1);
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

  /* ==== Real-time rest timer ==== */
  useEffect(() => {
    if (gameStarted && !isQuarterBreak) {
      realTimeIntervalRef.current = setInterval(() => {
        const currentQ = computeQuarter(gameTimeRef.current);
        const isHalfTime =
          currentQ === 3 &&
          gameTimeRef.current <= 1800 &&
          gameTimeRef.current > 1200;

        if (!isHalfTime) {
          setPlayers((prevPlayers) =>
            prevPlayers.map((p) =>
              !p.isPlaying && gameStarted
                ? { ...p, currentRestTime: p.currentRestTime + gameSpeed }
                : p
            )
          );
        }
      }, 1000);
    } else {
      clearInterval(realTimeIntervalRef.current);
    }

    return () => clearInterval(realTimeIntervalRef.current);
  }, [gameStarted, gameSpeed, isQuarterBreak]);

  /* ==== Controls ==== */
  const toggleGame = () => {
    const next = !isRunning;
    setIsRunning(next);
    setGameSpeed(1);
    if (next) setIsQuarterBreak(false);
    if (next && !gameStarted) setGameStarted(true);
  };

  const changeGameSpeed = (speed) => setGameSpeed(speed);

  const putPlayerIn = (playerId) => {
    // Save state before making substitution
    saveToHistory();

    setPlayers((arr) =>
      arr.map((p) =>
        p.id === playerId
          ? {
              ...p,
              isPlaying: true,
              currentSessionStart: gameTime,
              currentRestTime: 0,
              hasEverPlayed: true,
              playingSessions: [
                ...p.playingSessions,
                {
                  start: formatQuarterTime(gameTime),
                  end: '',
                  quarter: currentQuarter,
                  isActive: true,
                },
              ],
            }
          : p
      )
    );
  };

  const takePlayerOut = (playerId) => {
    // Save state before making substitution
    saveToHistory();

    setPlayers((arr) =>
      arr.map((p) => {
        if (p.id === playerId && p.isPlaying) {
          const sessionSeconds = p.currentSessionStart - gameTime;
          const updated = [...p.playingSessions];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].isActive) {
            updated[lastIdx] = {
              ...updated[lastIdx],
              end: formatQuarterTime(gameTime),
              isActive: false,
            };
          }
          return {
            ...p,
            isPlaying: false,
            totalMinutes: p.totalMinutes + sessionSeconds,
            currentSessionStart: 0,
            currentRestTime: 0,
            playingSessions: updated,
          };
        }
        return p;
      })
    );
  };

  const getConsecutiveRestTime = (p) => p.currentRestTime;

  const resetGame = () => {
    if (window.confirm('Are you sure you want to reset the entire game? This will clear all data.')) {
      setGameTime(TOTAL_GAME_SECONDS);
      setCurrentQuarter(1);
      setIsRunning(false);
      setGameStarted(false);
      setGameSpeed(1);
      setPlayers((arr) =>
        arr.map((p) => ({
          ...p,
          isPlaying: false,
          totalMinutes: 0,
          currentSessionStart: 0,
          currentRestTime: 0,
          hasEverPlayed: false,
          playingSessions: [],
          showRestTime: true,
        }))
      );
    }
  };

  const toggleRestTimeVisibility = (playerId) => {
    setPlayers((arr) =>
      arr.map((p) => (p.id === playerId ? { ...p, showRestTime: !p.showRestTime } : p))
    );
  };

  const addPlayer = async () => {
    if (newPlayerName.trim() && newPlayerNumber.trim()) {
      try {
        // Save to Firestore first
        const firebaseId = await rosterService.addPlayer({
          name: newPlayerName.trim(),
          number: newPlayerNumber.trim()
        });

        // Then add to local state
        const newP = {
          id: firebaseId,
          name: newPlayerName.trim(),
          number: parseInt(newPlayerNumber, 10),
          isPlaying: false,
          totalMinutes: 0,
          currentSessionStart: 0,
          currentRestTime: 0,
          hasEverPlayed: false,
          playingSessions: [],
          showRestTime: true,
          firebaseId: firebaseId
        };
        setPlayers((arr) => [...arr, newP]);
        setNewPlayerName('');
        setNewPlayerNumber('');
        setShowAddPlayer(false);
      } catch (error) {
        console.error('Failed to add player:', error);
        alert('Failed to add player to roster. Please try again.');
      }
    }
  };

  const removePlayer = async (playerId) => {
    if (window.confirm('Are you sure you want to remove this player?')) {
      try {
        const player = players.find(p => p.id === playerId);
        if (player?.firebaseId) {
          await rosterService.deletePlayer(player.firebaseId);
        }
        setPlayers((arr) => arr.filter((p) => p.id !== playerId));
      } catch (error) {
        console.error('Failed to delete player from Firestore:', error);
        // Still remove from local state even if Firestore delete fails
        setPlayers((arr) => arr.filter((p) => p.id !== playerId));
      }
    }
  };

  const getLastSessionText = (p) => {
    if (p.playingSessions.length === 0) return '';
    const last = p.playingSessions[p.playingSessions.length - 1];
    return last.isActive
      ? `Q${last.quarter} ${last.start}-`
      : `Q${last.quarter} ${last.start}-${last.end}`;
  };

  const getAllSessionsText = (p) => {
    if (p.playingSessions.length === 0) return [];
    return p.playingSessions.map((s) =>
      s.isActive ? `Q${s.quarter} ${s.start}-` : `Q${s.quarter} ${s.start}-${s.end}`
    );
  };

  const showPlayerHistory = (p) => {
    setSelectedPlayer(p);
    setShowSessionHistory(true);
  };

  const playersOverEight = getPlayersOverEightMinutes();

  if (isLoadingRoster) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading roster...</div>
          <div className="text-gray-600">Fetching team data from Firestore</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="app-container">
        <div style={{ padding: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/schedule">
            <button style={{ padding: '8px 12px', cursor: 'pointer' }}>
              Go to Schedule
            </button>
          </Link>
          <Link to="/gym">
            <button style={{ padding: '8px 12px', cursor: 'pointer' }}>
              Gym
            </button>
          </Link>
          <Link to="/gym-admin">
            <button style={{ padding: '8px 12px', cursor: 'pointer' }}>
              Gym Admin
            </button>
          </Link>
        </div>

        <div className="max-w-6xl" style={{ position: 'relative' }}>
          <div className="header">
            <Users className="header-icon" />
            <h1>Basketball Minutes Tracker</h1>
          </div>

          <div className="main-timer">
            <div className="timer-display">{formatQuarterTime(gameTime)}</div>
            <div className="quarter-display">
              Quarter {currentQuarter}
              {isQuarterBreak && (
                <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', opacity: 0.9 }}>
                  {currentQuarter === 3 && gameTime === 1800 ? 'Half Time' : 'Break'}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Speed:</span>
              {[1, 2, 4].map((speed) => (
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
                    transition: 'all 0.2s',
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

          <div className="control-buttons">
            <button onClick={resetGame} className="reset-button">🔄 Reset Game</button>
            <button
              onClick={undoLastAction}
              className="reset-button"
              disabled={history.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: history.length === 0 ? 0.5 : 1,
                cursor: history.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <RotateCcw size={16} />
              Undo ({history.length})
            </button>
          </div>

          {/* Alert Panel for Players Over 8 Minutes */}
          {playersOverEight.length > 0 && (
            <div style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: '#fee2e2',
              border: '2px solid #ef4444',
              borderRadius: '0.5rem',
              padding: '1rem',
              maxWidth: '300px',
              zIndex: 1000,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#991b1b', fontWeight: 'bold' }}>
                <AlertCircle size={20} />
                <span>High Playing Time Alert</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>
                <div style={{ marginBottom: '0.5rem' }}>Players over 8 consecutive minutes:</div>
                {playersOverEight.map(p => {
                  const consecutiveTime = p.currentSessionStart - gameTime;
                  return (
                    <div key={p.id} style={{
                      padding: '0.5rem',
                      backgroundColor: 'white',
                      borderRadius: '0.25rem',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: 600 }}>#{p.number} {p.name}</span>
                      <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                        {formatTime(consecutiveTime)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="players-table-container">
            {players.length === 0 ? (
              <div style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <Users size={48} style={{ color: '#9ca3af', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  No Players Found
                </h3>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                  No players were loaded from the roster. Click "Manage Players" below to add players manually.
                </p>
                <button
                  onClick={() => setShowAddPlayer(true)}
                  className="half-time-button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <UserPlus size={16} />
                  Manage Players
                </button>
              </div>
            ) : (
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
                  {players.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="table-cell">
                      <div className="player-number">#{p.number}</div>
                    </td>
                    <td className="table-cell">
                      <div className="player-name">{p.name}</div>
                      {getLastSessionText(p) && (
                        <div
                          className="session-info"
                          onClick={() => showPlayerHistory(p)}
                          style={{ cursor: 'pointer' }}
                        >
                          {getLastSessionText(p)}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={`status-badge ${p.isPlaying ? 'status-playing' : 'status-bench'}`}>
                        {p.isPlaying ? 'Playing' : 'Bench'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="time-display time-total">
                        {formatTime(p.totalMinutes + (p.isPlaying ? p.currentSessionStart - gameTime : 0))}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className={`time-display ${p.isPlaying ? 'time-total' : 'time-playing'}`}>
                        {p.isPlaying ? formatTime(p.currentSessionStart - gameTime) : '00:00'}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="rest-time-container">
                        <span className={`time-display ${p.isPlaying ? 'time-playing' : 'time-rest'}`}>
                          {p.showRestTime ? formatTime(getConsecutiveRestTime(p)) : '••:••'}
                        </span>
                        <button onClick={() => toggleRestTimeVisibility(p.id)} className="eye-button">
                          {p.showRestTime ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </div>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => (p.isPlaying ? takePlayerOut(p.id) : putPlayerIn(p.id))}
                        className={`action-button ${p.isPlaying ? 'button-out' : 'button-in'}`}
                      >
                        {p.isPlaying ? 'Out' : 'In'}
                      </button>
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

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

          {showAddPlayer && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', width: '24rem', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
                  Manage Players
                </h3>

                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#dbeafe', borderRadius: '0.5rem' }}>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#1e40af' }}>Add New Player</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                        Player Name
                      </label>
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                        Number
                      </label>
                      <input
                        type="number"
                        value={newPlayerNumber}
                        onChange={(e) => setNewPlayerNumber(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                        placeholder="Enter number"
                      />
                    </div>
                    <button
                      onClick={addPlayer}
                      style={{ width: '100%', backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Add Player
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#111827' }}>Current Players</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '10rem', overflowY: 'auto' }}>
                    {players.map((p) => (
                      <div
                        key={p.id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem' }}
                      >
                        <span style={{ fontSize: '0.875rem' }}>#{p.number} {p.name}</span>
                        <button
                          onClick={() => removePlayer(p.id)}
                          style={{ color: '#dc2626', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setShowAddPlayer(false); setNewPlayerName(''); setNewPlayerNumber(''); }}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {showSessionHistory && selectedPlayer && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', width: '24rem', maxWidth: '90vw' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
                  Session History - {selectedPlayer.name} (#{selectedPlayer.number})
                </h3>
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', maxHeight: '15rem', overflowY: 'auto' }}>
                  {getAllSessionsText(selectedPlayer).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {getAllSessionsText(selectedPlayer).map((txt, idx) => (
                        <div key={idx} style={{ fontSize: '0.875rem', color: '#374151', paddingBottom: '0.25rem', borderBottom: idx < getAllSessionsText(selectedPlayer).length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          {txt}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
                      No sessions yet
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setShowSessionHistory(false); setSelectedPlayer(null); }}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
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
}

export default MinutesTracker;