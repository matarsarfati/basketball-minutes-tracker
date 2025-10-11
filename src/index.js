import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import SchedulePlanner from './SchedulePlanner';
import SurveyForm from './SurveyForm';
import GymLayout from './components/layout/GymLayout';
import GymPage from './pages/GymPage';
import './index.css';

const PracticeLive = lazy(() => import('./PracticeLive'));

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/schedule",
    element: <SchedulePlanner />,
  },
  {
    path: "/practice/:sessionId",
    element: (
      <Suspense fallback={<div>Loading…</div>}>
        <PracticeLive />
      </Suspense>
    ),
  },
  {
    path: "/survey/:sessionId",
    element: <SurveyForm />,
  },
  {
    element: <GymLayout />,
    children: [
      {
        path: "/gym",
        element: <GymPage />,
      }
    ],
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
