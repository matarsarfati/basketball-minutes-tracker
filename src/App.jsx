import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/navigation/NavBar';
import GymPage from './pages/GymPage'; // Correct import path

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100">
        <NavBar />
        <Routes>
          <Route path="/" element={<GymPage />} />
          <Route path="/gym" element={<GymPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
