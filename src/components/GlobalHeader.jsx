import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTeam } from '../context/TeamContext';

export default function GlobalHeader() {
  const { activeTeam, setActiveTeamId } = useTeam();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAllTeams = () => {
    setActiveTeamId(null);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-md w-full">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {location.pathname !== '/dashboard' ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-sm font-semibold transition flex items-center gap-2"
            >
              ← Active Team Dashboard
            </button>
          ) : (
            <span className="px-3 py-1.5 text-slate-400 text-sm font-semibold flex items-center gap-2">
              ✓ Dashboard
            </span>
          )}
        </div>

        {activeTeam && (
           <div className="hidden md:flex items-center gap-3 font-bold text-lg">
              {activeTeam.banner ? (
                 <img src={activeTeam.banner} alt="Banner" className="w-8 h-8 rounded-full object-cover border-2 border-white" />
              ) : (
                 <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white" style={{ backgroundColor: activeTeam.color }}>
                    {activeTeam.shortName || activeTeam.name.substring(0, 2).toUpperCase()}
                 </div>
              )}
              {activeTeam.name}
           </div>
        )}

        <button
          onClick={handleAllTeams}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-bold transition flex items-center gap-2"
        >
          🏠 All Teams
        </button>
      </div>
    </header>
  );
}
