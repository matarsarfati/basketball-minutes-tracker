import React, { useState, useEffect } from 'react';
import { rosterService } from './services/rosterService';
import { useTeam } from './context/TeamContext';
import { testService } from './services/testService';
import { useToast } from './context/ToastContext';

// Basic constants
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

export default function RosterManager() {
  const { activeTeam } = useTeam();
  const toast = useToast();
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Selected Player Card
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [activeCardTab, setActiveCardTab] = useState('medical');
  const [playerTestResults, setPlayerTestResults] = useState([]);
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Form State
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    age: '',
    height: '',
    number: '',
    position: POSITIONS[0],
    pastInjuries: '',
    ongoingInjuries: '',
    active: true,
    preferredLanguage: 'he',
    gender: 'male' // Added based on requirements
  });

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const firebasePlayers = await rosterService.getPlayers();
        setPlayers(firebasePlayers);
      } catch (err) {
        console.error('Failed to load roster', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlayers();
  }, [activeTeam]);

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const dismiss = toast?.saving('Adding player to roster...');
    try {
      const firebaseId = await rosterService.addPlayer(newPlayer, activeTeam?.id);
      setPlayers(prev => [...prev, { ...newPlayer, id: firebaseId, firebaseId }]);
      resetForm();
      if (dismiss) dismiss();
      if (toast) toast.success('Player added');
    } catch (error) {
      console.error('Failed to add player', error);
      if (dismiss) dismiss();
      if (toast) toast.error('Failed to add player.');
    }
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    const dismiss = toast?.saving('Updating player...');
    try {
      if (!editingId) return;
      const player = players.find(p => p.id === editingId);
      await rosterService.updatePlayer(player.firebaseId, newPlayer);
      setPlayers(prev => prev.map(p => p.id === editingId ? { ...p, ...newPlayer } : p));

      // Update selected player card if it's currently open
      if (selectedPlayer && selectedPlayer.id === editingId) {
        setSelectedPlayer({ ...selectedPlayer, ...newPlayer });
      }

      resetForm();
      if (dismiss) dismiss();
      if (toast) toast.success('Player updated');
    } catch (error) {
      console.error('Failed to update player', error);
      if (dismiss) dismiss();
      if (toast) toast.error('Failed to update player.');
    }
  };

  const resetForm = () => {
    setNewPlayer({
      name: '',
      age: '',
      height: '',
      number: '',
      position: POSITIONS[0],
      pastInjuries: '',
      ongoingInjuries: '',
      active: true,
      preferredLanguage: 'he',
      gender: 'male'
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleRemovePlayer = async (playerId) => {
    if (!window.confirm("Are you sure you want to permanently delete this player?")) return;
    const dismiss = toast?.saving('Deleting player and associated records...');
    try {
      const player = players.find(p => p.id === playerId);
      if (player?.firebaseId) await rosterService.deletePlayer(player.firebaseId, activeTeam?.id);
      setPlayers(prev => prev.filter(p => p.id !== playerId));
      setSelectedPlayer(null);
      if (dismiss) dismiss();
      if (toast) toast.success('Player deleted successfully');
    } catch (error) {
      console.error('Failed to delete player', error);
      if (dismiss) dismiss();
      if (toast) toast.error('Failed to delete player.');
    }
  };

  const handleEditClick = (e, player) => {
    e.stopPropagation(); // prevent opening card
    setNewPlayer({
      name: player.name || '',
      age: player.age || '',
      height: player.height || '',
      number: player.number || '',
      position: player.position || POSITIONS[0],
      pastInjuries: player.pastInjuries || '',
      ongoingInjuries: player.ongoingInjuries || '',
      active: player.active !== false,
      preferredLanguage: player.preferredLanguage || 'he',
      gender: player.gender || 'male'
    });
    setEditingId(player.id);
    setShowForm(true);
  };

  const openPlayerCard = async (player) => {
    setSelectedPlayer(player);
    setActiveCardTab('medical');
    setPlayerTestResults([]);
    try {
      const results = await testService.getTestResultsByPlayer(player.id, activeTeam?.id);
      setPlayerTestResults(results);
    } catch (e) {
      console.error('Failed to fetch test results', e);
    }
  };

  const generateRosterMockData = async () => {
    if (!window.confirm("Generate 12 mock players?")) return;
    const dismiss = toast?.saving('Generating mock roster...');
    try {
      const mockPlayers = [
        { name: 'Omri Casspi', position: 'SF', age: 34, height: '206cm', number: 18, active: true },
        { name: 'Deni Avdija', position: 'SF', age: 22, height: '206cm', number: 8, active: true },
        { name: 'Tamir Blatt', position: 'PG', age: 26, height: '184cm', number: 6, active: true },
        { name: 'Roman Sorkin', position: 'C', age: 27, height: '208cm', number: 9, active: true },
        { name: 'Yovel Zoosman', position: 'SG', age: 25, height: '201cm', number: 50, active: true },
        { name: 'Yam Madar', position: 'PG', age: 22, height: '190cm', number: 41, active: true },
        { name: 'Rafi Menco', position: 'SF', age: 29, height: '198cm', number: 21, active: true, ongoingInjuries: 'Sprained Ankle' },
        { name: 'Tomer Ginat', position: 'PF', age: 28, height: '203cm', number: 4, active: true },
        { name: 'Nimrod Levi', position: 'PF', age: 28, height: '208cm', number: 12, active: true },
        { name: 'Idan Zalmanson', position: 'C', age: 28, height: '206cm', number: 14, active: true },
        { name: 'Gal Mekel', position: 'PG', age: 35, height: '192cm', number: 99, active: true, pastInjuries: 'Knee Surgery (2020)' },
        { name: 'Jake Cohen', position: 'PF', age: 32, height: '210cm', number: 15, active: true },
      ];
      const newlyAdded = [];
      for (const p of mockPlayers) {
        const firebaseId = await rosterService.addPlayer({ ...p, gender: 'male', preferredLanguage: 'he', pastInjuries: p.pastInjuries || '', ongoingInjuries: p.ongoingInjuries || '' }, activeTeam?.id);
        newlyAdded.push({ ...p, id: firebaseId, firebaseId, gender: 'male' });
      }
      setPlayers(prev => [...prev, ...newlyAdded]);
      if (dismiss) dismiss();
      if (toast) toast.success('Mock roster generated');
    } catch (e) {
      if (dismiss) dismiss();
      if (toast) toast.error('Failed to generate mock roster');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading roster...</div>;

  if (selectedPlayer) {
    const filteredSidebarPlayers = players.filter(p => p.name.toLowerCase().includes(sidebarSearch.toLowerCase()));

    return (
      <div className="flex h-[calc(100vh-64px)] bg-slate-50 w-full">
        {/* Left Sidebar */}
        <div className="w-72 bg-white border-r shadow-sm overflow-y-auto flex-shrink-0 flex flex-col hidden md:flex">
          <div className="p-4 border-b space-y-3 sticky top-0 bg-white z-10">
            <button onClick={() => setSelectedPlayer(null)} className="text-gray-500 hover:text-blue-600 text-sm font-bold flex items-center gap-2 transition-colors">
              &larr; Back to Roster Overview
            </button>
            <h2 className="font-bold text-xl text-slate-800">Team Roster</h2>
            <input
              type="text"
              placeholder="Search player..."
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSidebarPlayers.map(p => (
              <button
                key={p.id}
                onClick={() => openPlayerCard(p)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${p.id === selectedPlayer.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${p.id === selectedPlayer.id ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'}`}>
                  {p.number}
                </div>
                <div className="truncate">
                  <div className="font-bold text-sm truncate">{p.name}</div>
                  <div className={`text-xs ${p.id === selectedPlayer.id ? 'text-blue-100' : 'text-gray-500'}`}>{p.position}</div>
                </div>
              </button>
            ))}
            {filteredSidebarPlayers.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-500">No players found</div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 relative">
          <div className="absolute top-4 left-4 md:hidden">
            <button onClick={() => setSelectedPlayer(null)} className="px-3 py-1.5 bg-white border shadow-sm rounded-lg text-sm font-bold text-gray-600 flex items-center gap-1">
              &larr; Back
            </button>
          </div>
          <div className="max-w-6xl mx-auto p-6 lg:p-10 pt-16 md:pt-10">

            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-600 p-8 rounded-2xl text-white flex justify-between items-start shadow-lg mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <span className="text-[12rem] leading-none font-black">{selectedPlayer.number}</span>
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 w-full">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl font-black shadow-inner backdrop-blur-sm border-2 border-white/30">
                  {selectedPlayer.number}
                </div>
                <div className="flex-1">
                  <div className="text-blue-200 font-bold tracking-widest text-sm mb-1 uppercase bg-white/10 inline-block px-3 py-1 rounded-full">{selectedPlayer.position}</div>
                  <h2 className="text-4xl lg:text-5xl font-black mb-3">{selectedPlayer.name}</h2>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-blue-100">
                    <span className="flex items-center gap-1"><span className="opacity-70">Age:</span> {selectedPlayer.age || 'N/A'}</span>
                    <span className="flex items-center gap-1"><span className="opacity-70">Height:</span> {selectedPlayer.height || 'N/A'}</span>
                    <span className="flex items-center gap-1 capitalize"><span className="opacity-70">Gender:</span> {selectedPlayer.gender || 'male'}</span>
                  </div>
                </div>
                <div className="flex gap-3 md:flex-col md:self-end mt-4 md:mt-0">
                  <button
                    onClick={(e) => {
                      setSelectedPlayer(null);
                      handleEditClick(e, selectedPlayer);
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors shadow"
                  >
                    Edit Details
                  </button>
                  <button onClick={() => handleRemovePlayer(selectedPlayer.id)} className="px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors shadow">
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-2 border-b-2 border-gray-200 mb-8">
              <button
                onClick={() => setActiveCardTab('medical')}
                className={`py-3 px-6 text-sm font-bold transition-all border-b-4 -mb-[2px] ${activeCardTab === 'medical' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Medical Profile
              </button>
              <button
                onClick={() => setActiveCardTab('tests')}
                className={`py-3 px-6 text-sm font-bold transition-all border-b-4 -mb-[2px] ${activeCardTab === 'tests' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Athletic Testing
              </button>
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in-up">
              {activeCardTab === 'medical' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-3">Ongoing Injuries</h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[4rem] text-slate-700 font-medium whitespace-pre-wrap">
                      {selectedPlayer.ongoingInjuries || <span className="text-gray-400 italic">None reported. Healthy.</span>}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-3">Past Injuries</h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[4rem] text-slate-700 font-medium whitespace-pre-wrap">
                      {selectedPlayer.pastInjuries || <span className="text-gray-400 italic">No historical injuries reported.</span>}
                    </div>
                  </div>
                </div>
              )}

              {activeCardTab === 'tests' && (
                <div>
                  {playerTestResults.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 bg-white border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <span className="font-bold text-lg">No test results found</span>
                      <span className="text-sm mt-1 max-w-sm">When this athlete completes assessments, their metrics will appear here.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.from(new Set(playerTestResults.map(t => t.testName))).map(testName => {
                        const history = playerTestResults.filter(t => t.testName === testName).sort((a, b) => new Date(b.date) - new Date(a.date));
                        const latest = history[0];
                        const is1RM = testName.toLowerCase().includes('1rm');
                        const isBeep = testName.toLowerCase().includes('beep');

                        return (
                          <div key={testName} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 group-hover:bg-indigo-500 transition-colors"></div>
                            <div className="pl-2">
                              <div className="flex justify-between items-start mb-4">
                                <h3 className="font-black text-slate-800 text-lg leading-tight w-2/3">{testName}</h3>
                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{latest.date}</span>
                              </div>
                              <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-5xl font-black text-blue-600 tracking-tighter">{latest.result}</span>
                                <span className="text-base font-bold text-gray-400 uppercase">{latest.unit}</span>
                              </div>

                              {isBeep && latest.vo2max && (
                                <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                                  <div className="text-xs font-bold text-blue-800/60 uppercase tracking-wider mb-1">Estimated VO2max</div>
                                  <div className="text-xl font-black text-blue-900">{latest.vo2max} <span className="text-sm font-semibold opacity-60">ml/kg/min</span></div>
                                </div>
                              )}

                              {is1RM && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Target Percentages</div>
                                  <div className="grid grid-cols-4 gap-2 text-center">
                                    {[
                                      { p: 100, r: 1 }, { p: 95, r: 2 }, { p: 93, r: 3 }, { p: 90, r: 4 },
                                      { p: 87, r: 5 }, { p: 85, r: 6 }, { p: 83, r: 7 }, { p: 80, r: 8 },
                                      { p: 77, r: 9 }, { p: 75, r: 10 }, { p: 70, r: 11 }, { p: 67, r: 12 }
                                    ].map(item => (
                                      <div key={item.r} className="bg-slate-50 rounded-lg border border-slate-200 p-2 shadow-sm flex flex-col justify-center">
                                        <div className="text-[11px] text-gray-500 font-bold mb-1">{item.r}RM</div>
                                        <div className="text-sm font-black text-slate-800">{(latest.result * (item.p / 100)).toFixed(0)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Roster Management</h1>
          <div className="flex gap-3">
            {activeTeam?.isMock && players.length < 5 && (
              <button
                onClick={generateRosterMockData}
                className="px-4 py-2 bg-amber-100 border border-amber-300 text-amber-800 rounded font-bold hover:bg-amber-200 transition-colors shadow-sm"
              >
                ✨ Generate Mock Data
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-sm transition-colors"
            >
              {showForm ? 'Cancel' : '+ Add Player'}
            </button>
          </div>
        </header>

        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-md border mb-8">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Player' : 'New Player'}</h2>
            <form onSubmit={editingId ? handleUpdatePlayer : handleAddPlayer}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Full Name (שם מלא)*</label>
                  <input required type="text" className="w-full border p-2 rounded" value={newPlayer.name} onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Jersey Number (מספר גופייה)*</label>
                  <input required type="number" className="w-full border p-2 rounded" value={newPlayer.number} onChange={e => setNewPlayer({ ...newPlayer, number: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Age (גיל)</label>
                  <input type="text" className="w-full border p-2 rounded" value={newPlayer.age} onChange={e => setNewPlayer({ ...newPlayer, age: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Height (גובה)</label>
                  <input type="text" className="w-full border p-2 rounded" value={newPlayer.height} onChange={e => setNewPlayer({ ...newPlayer, height: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Position (עמדה)</label>
                  <select className="w-full border p-2 rounded" value={newPlayer.position} onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })}>
                    {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Gender (מגדר)</label>
                  <select className="w-full border p-2 rounded" value={newPlayer.gender} onChange={e => setNewPlayer({ ...newPlayer, gender: e.target.value })}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Preferred Language</label>
                  <select className="w-full border p-2 rounded" value={newPlayer.preferredLanguage} onChange={e => setNewPlayer({ ...newPlayer, preferredLanguage: e.target.value })}>
                    <option value="he">Hebrew (עברית)</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">Past Injuries (פציעות עבר)</label>
                  <textarea className="w-full border p-2 rounded" rows="2" value={newPlayer.pastInjuries} onChange={e => setNewPlayer({ ...newPlayer, pastInjuries: e.target.value })}></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">Ongoing Injuries (פציעות קיימות)</label>
                  <textarea className="w-full border p-2 rounded" rows="2" value={newPlayer.ongoingInjuries} onChange={e => setNewPlayer({ ...newPlayer, ongoingInjuries: e.target.value })}></textarea>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded font-semibold hover:bg-gray-100">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700">
                  {editingId ? 'Save Changes' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Players Roster Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {players.map(player => (
            <div
              key={player.id}
              onClick={() => openPlayerCard(player)}
              className="bg-white p-5 rounded-xl shadow cursor-pointer hover:shadow-lg transition relative flex items-center border"
            >
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-700 mr-4 shrink-0">
                {player.number}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{player.name}</h3>
                <p className="text-sm text-gray-500">{player.position} {player.height && `• ${player.height}`}</p>
                {player.ongoingInjuries && (
                  <div className="mt-1 text-xs text-red-600 font-bold bg-red-100 inline-block px-2 py-0.5 rounded">
                    Injured
                  </div>
                )}
              </div>
              <button
                onClick={(e) => handleEditClick(e, player)}
                className="absolute top-2 right-2 text-gray-400 hover:text-blue-500 p-1"
                title="Edit"
              >
                ✏️
              </button>
            </div>
          ))}
          {players.length === 0 && !showForm && (
            <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed rounded-xl bg-white">
              No players found. Add members to your roster to get started.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
