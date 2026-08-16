import React, { createContext, useContext, useState, useEffect } from 'react';
import { teamService } from '../services/teamService';
import { useToast } from './ToastContext';

const defaultTeams = [
  { id: 'u16', name: 'U16 Team', shortName: 'U16', color: '#1d4ed8', banner: '' },
  { id: 'u18', name: 'U18 Team', shortName: 'U18', color: '#15803d', banner: '' },
  { id: 'senior', name: 'Senior Team', shortName: 'SNR', color: '#7e22ce', banner: '' }
];

const TeamContext = createContext();

export const TeamProvider = ({ children }) => {
  const [teams, setTeams] = useState([]);
  const toast = useToast();

  const [activeTeamId, setActiveTeamId] = useState(() => {
    return localStorage.getItem('activeTeamId') || null;
  });

  useEffect(() => {
    const initTeams = async () => {
      try {
        const fetchedTeams = await teamService.getTeams();
        if (fetchedTeams.length === 0) {
          // seed defaults
          const seedPromises = defaultTeams.map(t => teamService.addTeam(t));
          await Promise.all(seedPromises);
          const newFetched = await teamService.getTeams();
          setTeams(newFetched);
        } else {
          setTeams(fetchedTeams);
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    };
    initTeams();
  }, []);

  useEffect(() => {
    if (activeTeamId) {
      localStorage.setItem('activeTeamId', activeTeamId);
    } else {
      localStorage.removeItem('activeTeamId');
    }
  }, [activeTeamId]);

  const addTeam = async (team) => {
    const dismiss = toast?.saving('Saving team to Cloud...');
    try {
      const newId = await teamService.addTeam(team);
      setTeams(prev => [...prev, { ...team, id: newId }]);
      if (dismiss) dismiss();
      if (toast) toast.success('Team saved successfully');
    } catch (err) {
      console.error(err);
      if (dismiss) dismiss();
      if (toast) toast.error('Failed to save team');
    }
  };

  const updateTeam = async (id, updated) => {
    const dismiss = toast?.saving('Updating team...');
    try {
      await teamService.updateTeam(id, updated);
      setTeams(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
      if (dismiss) dismiss();
      if (toast) toast.success('Team updated');
    } catch (err) {
      console.error(err);
      if (dismiss) dismiss();
      if (toast) toast.error('Failed to update team');
    }
  };

  const deleteTeam = async (id) => {
    const dismiss = toast?.saving('Deleting team and all data...');
    try {
      await teamService.deleteTeam(id);
      setTeams(prev => prev.filter(t => t.id !== id));
      if (activeTeamId === id) setActiveTeamId(null);
      if (dismiss) dismiss();
      if (toast) toast.success('Team deleted globally');
    } catch (err) {
      console.error(err);
      if (dismiss) dismiss();
      if (toast) toast.error('Failed to delete team');
    }
  };

  const activeTeam = teams.find(t => t.id === activeTeamId) || null;

  return (
    <TeamContext.Provider value={{
      teams, addTeam, updateTeam, deleteTeam,
      activeTeamId, setActiveTeamId, activeTeam
    }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
