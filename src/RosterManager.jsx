import React, { useState, useEffect } from 'react';
import { rosterService } from './services/rosterService';

const ROSTER_KEY = 'teamRoster';

const POSITIONS = ['Guard', 'Forward', 'Center'];

export default function RosterManager() {
  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    number: '',
    position: POSITIONS[0],
    active: true
  });

  // Load players from Firebase on mount
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const firebasePlayers = await rosterService.getPlayers();
        setPlayers(firebasePlayers);
      } catch (error) {
        console.error('Failed to load from Firebase:', error);
        // Fall back to localStorage
        const stored = localStorage.getItem(ROSTER_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPlayers(Array.isArray(parsed) ? parsed : []);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadPlayers();
  }, []);

  // Sync to localStorage as backup
  useEffect(() => {
    if (!players.length) return;
    localStorage.setItem(ROSTER_KEY, JSON.stringify(players));
  }, [players]);

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.name || !newPlayer.number) return;

    try {
      const firebaseId = await rosterService.addPlayer(newPlayer);
      setPlayers(prev => [...prev, { ...newPlayer, firebaseId }]);
      setNewPlayer({
        name: '',
        number: '',
        position: POSITIONS[0],
        active: true
      });
    } catch (error) {
      console.error('Failed to add player to Firebase:', error);
      alert('Failed to save player. Please try again.');
    }
  };

  const handleUpdatePlayer = async (playerId, updates) => {
    try {
      const player = players.find(p => p.id === playerId);
      if (!player?.firebaseId) throw new Error('No Firebase ID found');

      await rosterService.updatePlayer(player.firebaseId, updates);
      setPlayers(prev => 
        prev.map(p => p.id === playerId ? { ...p, ...updates } : p)
      );
    } catch (error) {
      console.error('Failed to update player in Firebase:', error);
      alert('Failed to update player. Please try again.');
    }
  };

  const handleRemovePlayer = async (playerId) => {
    try {
      const player = players.find(p => p.id === playerId);
      if (!player?.firebaseId) throw new Error('No Firebase ID found');

      await rosterService.deletePlayer(player.firebaseId);
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    } catch (error) {
      console.error('Failed to delete player from Firebase:', error);
      alert('Failed to delete player. Please try again.');
    }
  };

  const handleEditPlayer = (player) => {
    setNewPlayer({
      name: player.name,
      number: player.number,
      position: player.position || POSITIONS[0],
      active: player.active !== false
    });
    setEditingId(player.id);
    setShowForm(true);
    setError('');
  };

  if (isLoading) {
    return <div>Loading roster...</div>;
  }

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
