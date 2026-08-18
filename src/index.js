import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App';
import SchedulePlanner from './SchedulePlanner';
import SurveyForm from './SurveyForm';
import GymLayout from './components/layout/GymLayout';
import TeamLayout from './components/layout/TeamLayout';
import RouteRedirect from './components/layout/RouteRedirect';
import GymPage from './pages/GymPage';
import './index.css';
import GymSurvey from './GymSurvey';

import WellnessDashboard from './WellnessDashboard';
import WellnessForm from './WellnessForm';
import RPEWeeklyReport from './RPEWeeklyReport';
import { TeamProvider } from './context/TeamContext';
import { ToastProvider } from './context/ToastContext';
import TeamSelector from './screens/TeamSelector';
import TeamDashboard from './screens/TeamDashboard';
import RosterManager from './RosterManager';
import ProtectedRoute from './components/ProtectedRoute';

const PracticeLive = lazy(() => import('./PracticeLive'));
const MeetingProtocol = lazy(() => import('./MeetingProtocol'));
const CombinedSurvey = lazy(() => import('./CombinedSurvey'));
const TestsAndAssessments = lazy(() => import('./screens/TestsAndAssessments'));

const legacyRoutes = ['dashboard', 'roster', 'minutes', 'schedule', 'tests', 'wellness', 'wellness/survey', 'rpe-report', 'gym'].map(path => ({
  path: `/${path}`,
  element: <RouteRedirect />
}));

const router = createBrowserRouter([
  {
    path: "/",
    element: <TeamSelector />,
  },
  ...legacyRoutes,
  {
    path: "/team/:teamId",
    element: (
      <ProtectedRoute>
        <TeamLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard", element: <TeamDashboard /> },
      { path: "roster", element: <RosterManager /> },
      { path: "minutes", element: <App /> },
      { path: "schedule", element: <SchedulePlanner /> },
      {
        path: "tests",
        element: (
          <Suspense fallback={<div>Loading…</div>}>
            <TestsAndAssessments />
          </Suspense>
        )
      },
      { path: "wellness", element: <WellnessDashboard /> },
      { path: "wellness/survey", element: <WellnessForm /> },
      { path: "rpe-report", element: <RPEWeeklyReport /> },
      {
        element: <GymLayout />,
        children: [
          { path: "gym", element: <GymPage /> }
        ]
      },
      {
        path: "practice/:sessionId",
        element: (
          <Suspense fallback={<div>Loading…</div>}>
            <PracticeLive />
          </Suspense>
        )
      },
      {
        path: "meeting/:sessionId",
        element: (
          <Suspense fallback={<div>Loading…</div>}>
            <MeetingProtocol />
          </Suspense>
        )
      },
      { path: "surveys/court/:sessionId?", element: <SurveyForm /> },
      { path: "surveys/gym/:sessionId?", element: <GymSurvey /> },
      { path: "surveys/wellness/:sessionId?", element: <WellnessForm /> },
      {
        path: "surveys/combined/:sessionId?",
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <CombinedSurvey />
          </Suspense>
        )
      }
    ]
  }
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ToastProvider>
      <TeamProvider>
        <RouterProvider router={router} />
      </TeamProvider>
    </ToastProvider>
  </React.StrictMode>
);
