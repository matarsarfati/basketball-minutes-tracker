import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTeam } from '../context/TeamContext';

export default function ProtectedRoute({ children }) {
  const { activeTeamId } = useTeam();

  if (!activeTeamId) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
