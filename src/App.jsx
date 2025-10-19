import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import GymLayout from './layouts/GymLayout';
import GymPage from './pages/GymPage';
import SavedPlansPage from './pages/SavedPlansPage';
import GymSurvey from './GymSurvey';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-100">
        <Routes>
          <Route path="/gym" element={<GymLayout />}>
            <Route index element={<GymPage />} />
            <Route path="saved-plans" element={<SavedPlansPage />} />
          </Route>
          <Route path="/gym-survey/:sessionId" element={<GymSurvey />} />
          <Route path="/" element={<Navigate to="/gym" replace />} />
          <Route path="*" element={<Navigate to="/gym" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
