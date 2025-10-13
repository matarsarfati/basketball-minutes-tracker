import React, { useState, useEffect } from 'react';

const ROSTER_KEY = "teamRosterV1";
const ATTENDANCE_KEY = "practiceAttendanceV1";
const SURVEY_KEY = "practiceSurveysV1";

export default function RosterManager() {
  const [players, setPlayers] = useState(() => {
    try {
      const stored = localStorage.getItem(ROSTER_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) 
        ? parsed.map(p => typeof p === 'string' 
            ? { id: crypto.randomUUID(), name: p, number: '', dateAdded: new Date().toISOString() }
            : p)
        : [];
    } catch {
      return [];
    }
  });

  const [newPlayer, setNewPlayer] = useState({ name: '', number: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(ROSTER_KEY, JSON.stringify(players));
    } catch (err) {
      console.error('Failed to save roster:', err);
    }
  }, [players]);

  const handleAddPlayer = (e) => {
    e.preventDefault();
    const name = newPlayer.name.trim();
    const number = newPlayer.number.trim();

    if (!name) {
      setError('Please enter a player name');
      return;
    }

    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setError('A player with this name already exists');
      return;
    }

    setPlayers(prev => [...prev, {
      id: crypto.randomUUID(),
      name,
      number,
      dateAdded: new Date().toISOString()
    }]);
    setNewPlayer({ name: '', number: '' });
    setError('');
    setShowForm(false);
  };

  const cleanupPlayerData = (playerId) => {
    // Clean up attendance records
    try {
      const storedAttendance = localStorage.getItem(ATTENDANCE_KEY);
      if (storedAttendance) {
        const attendance = JSON.parse(storedAttendance);
        const cleanedAttendance = Object.fromEntries(
          Object.entries(attendance).map(([sessionId, records]) => [
            sessionId,
            records.filter(record => record.playerId !== playerId)
          ])
        );
        localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(cleanedAttendance));
      }
    } catch (err) {
      console.error('Failed to clean attendance:', err);
    }

    // Clean up survey responses
    try {
      const storedSurveys = localStorage.getItem(SURVEY_KEY);
      if (storedSurveys) {
        const surveys = JSON.parse(storedSurveys);
        const cleanedSurveys = Object.fromEntries(
          Object.entries(surveys).map(([sessionId, responses]) => [
            sessionId,
            responses.filter(response => response.playerId !== playerId)
          ])
        );
        localStorage.setItem(SURVEY_KEY, JSON.stringify(cleanedSurveys));
      }
    } catch (err) {
      console.error('Failed to clean surveys:', err);
    }
  };

  const handleRemovePlayer = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const confirmMessage = 
      `Are you sure you want to remove ${player.name} (#${player.number})?\n\n` +
      'This will permanently delete:\n' +
      '- Player from roster\n' +
      '- All attendance records\n' +
      '- All survey responses';

    if (!window.confirm(confirmMessage)) return;

    cleanupPlayerData(playerId);
    setPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const handleEditPlayer = (player) => {
    setEditingId(player.id);
    setNewPlayer({ name: player.name, number: player.number });
    setShowForm(true);
  };

  const handleUpdatePlayer = (e) => {
    e.preventDefault();
    const name = newPlayer.name.trim();
    const number = newPlayer.number.trim();

    if (!name) {
      setError('Please enter a player name');
      return;
    }

    if (players.some(p => p.name.toLowerCase() === name.toLowerCase() && p.id !== editingId)) {
      setError('A player with this name already exists');
      return;
    }

    setPlayers(prev => prev.map(p => 
      p.id === editingId 
        ? { ...p, name, number }
        : p
    ));
    setNewPlayer({ name: '', number: '' });
    setEditingId(null);
    setError('');
    setShowForm(false);
  };

  return (
    <div className="roster-manager">
      <div className="roster-header">
        <h2 className="roster-title">Team Roster Management</h2>
        <button 
          onClick={() => setShowForm(prev => !prev)} 
          className="roster-btn roster-btn-primary"
        >
          {showForm ? 'Cancel' : 'Add New Player'}
        </button>
      </div>

      {(showForm || editingId) && (
        <form onSubmit={editingId ? handleUpdatePlayer : handleAddPlayer} className="roster-form">
          <div className="roster-form-grid">
            <div className="roster-form-field">
              <label htmlFor="playerName" className="roster-label">Player Name *</label>
              <input
                id="playerName"
                type="text"
                value={newPlayer.name}
                onChange={e => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter player name"
                className="roster-input"
                required
              />
            </div>
            <div className="roster-form-field">
              <label htmlFor="playerNumber" className="roster-label">Jersey Number *</label>
              <input
                id="playerNumber"
                type="text"
                value={newPlayer.number}
                onChange={e => setNewPlayer(prev => ({ ...prev, number: e.target.value }))}
                placeholder="##"
                className="roster-input"
                required
                pattern="[0-9]*"
              />
            </div>
            <div className="roster-form-actions">
              <button type="submit" className="roster-btn roster-btn-primary">
                {editingId ? 'Save Changes' : 'Add Player'}
              </button>
              {error && <div className="roster-error">{error}</div>}
            </div>
          </div>
        </form>
      )}

      <div className="roster-table-container">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Number</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <tr key={player.id}>
                <td>{player.name}</td>
                <td>{player.number}</td>
                <td>
                  <div className="roster-actions">
                    <button
                      onClick={() => handleEditPlayer(player)}
                      className="roster-btn roster-btn-secondary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="roster-btn roster-btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={3} className="roster-empty">
                  No players added yet. Add your first player to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
