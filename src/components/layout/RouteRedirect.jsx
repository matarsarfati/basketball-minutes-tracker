import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTeam } from '../../context/TeamContext';

export default function RouteRedirect() {
  const { activeTeamId } = useTeam();
  const location = useLocation();

  if (!activeTeamId) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/team/${activeTeamId}${location.pathname}`} replace />;
}
