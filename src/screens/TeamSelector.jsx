import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeam } from '../context/TeamContext';

export default function TeamSelector() {
  const navigate = useNavigate();
  const { teams, addTeam, updateTeam, deleteTeam, activeTeamId, setActiveTeamId } = useTeam();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({ name: '', shortName: '', color: '#3b82f6', banner: '' });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');

  useEffect(() => {
    if (activeTeamId) {
      navigate(`/team/${activeTeamId}/dashboard`);
    }
  }, [activeTeamId, navigate]);

  const handleSelectTeam = (teamId) => {
    setActiveTeamId(teamId);
    navigate(`/team/${teamId}/dashboard`);
  };

  const openAddModal = () => {
    setEditingTeam(null);
    setFormData({ name: '', shortName: '', color: '#3b82f6', banner: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (e, team) => {
    e.stopPropagation();
    setEditingTeam(team.id);
    setFormData({ name: team.name, shortName: team.shortName, color: team.color, banner: team.banner || '' });
    setIsModalOpen(true);
  };

  const saveTeam = (e) => {
    e.preventDefault();
    if (editingTeam) {
      updateTeam(editingTeam, formData);
    } else {
      addTeam(formData);
    }
    setIsModalOpen(false);
  };

  const openDeleteModal = (e, team) => {
    e.stopPropagation();
    setDeleteTarget(team);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setDeleteCode(code);
    setUserInputCode('');
  };

  const confirmDelete = () => {
    if (userInputCode === deleteCode && deleteTarget) {
      deleteTeam(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-10 text-slate-800">Select a Team</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teams.map(team => (
            <div
              key={team.id}
              onClick={() => handleSelectTeam(team.id)}
              className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden cursor-pointer hover:shadow-xl transition transform hover:-translate-y-1 relative flex flex-col"
            >
              {team.banner ? (
                <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${team.banner})` }}></div>
              ) : (
                <div className="h-32 w-full flex items-center justify-center text-4xl font-black text-white" style={{ backgroundColor: team.color }}>
                  {team.shortName || (team.name ? team.name.substring(0, 3) : '')}
                </div>
              )}

              <div className="p-5 flex justify-between items-center bg-white flex-1">
                <h2 className="text-xl font-bold text-slate-800">{team.name}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveTeamId(team.id); navigate(`/team/${team.id}/roster`); }}
                    className="p-2 text-slate-400 hover:text-green-600 rounded-full hover:bg-slate-100" title="Manage Roster">
                    👥
                  </button>
                  <button onClick={(e) => openEditModal(e, team)} className="p-2 text-slate-400 hover:text-blue-600 rounded-full hover:bg-slate-100" title="Edit Team">
                    ✏️
                  </button>
                  <button onClick={(e) => openDeleteModal(e, team)} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-slate-100">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div
            onClick={openAddModal}
            className="bg-white rounded-xl shadow border-2 border-dashed border-slate-300 overflow-hidden cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition flex flex-col items-center justify-center min-h-[14rem]"
          >
            <div className="text-5xl text-slate-400 mb-2">+</div>
            <h2 className="text-xl font-bold text-slate-500">Add New Team</h2>
          </div>

          <div
            onClick={() => {
              addTeam({ name: 'Maccabi Demo FC', shortName: 'MDF', color: '#fbbf24', banner: '', isMock: true });
            }}
            className="bg-white rounded-xl shadow border-2 border-dashed border-amber-300 overflow-hidden cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition flex flex-col items-center justify-center min-h-[14rem]"
          >
            <div className="text-5xl text-amber-400 mb-2">✨</div>
            <h2 className="text-xl font-bold text-amber-600">Create Mock Team</h2>
            <p className="text-xs text-amber-500 mt-2 text-center px-4">Instantly setup a sandbox environment</p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold mb-4">{editingTeam ? 'Edit Team' : 'Add New Team'}</h2>
            <form onSubmit={saveTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Team Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border p-2 rounded" placeholder="e.g. U16 Select" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Short Name</label>
                  <input required type="text" maxLength={4} value={formData.shortName} onChange={e => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })} className="w-full border p-2 rounded" placeholder="U16" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Accent Color</label>
                  <input type="color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-full border h-10 p-1 rounded" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Banner Image URL (Optional)</label>
                <input type="text" value={formData.banner} onChange={e => setFormData({ ...formData, banner: e.target.value })} className="w-full border p-2 rounded" placeholder="https://..." />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded font-semibold hover:bg-gray-100">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Delete {deleteTarget.name}?</h2>
            <p className="mb-4 text-gray-700 text-sm">
              This action strictly deletes the team from your layout. To confirm deletion, please type the 4-digit code below:
            </p>
            <div className="bg-red-100 p-3 text-center text-red-800 font-mono font-bold tracking-widest text-2xl rounded mb-4">
              {deleteCode}
            </div>
            <input
              type="text"
              placeholder="TYPE CODE TO CONFIRM"
              value={userInputCode}
              onChange={e => setUserInputCode(e.target.value)}
              className="w-full border p-2 rounded mb-4 text-center tracking-widest font-mono"
              maxLength={4}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border rounded font-semibold hover:bg-gray-100">Cancel</button>
              <button
                onClick={confirmDelete}
                disabled={userInputCode !== deleteCode}
                className="px-4 py-2 bg-red-600 text-white rounded font-semibold disabled:bg-red-300 disabled:cursor-not-allowed transition"
              >
                Delete Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
