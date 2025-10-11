import NavBar from '../navigation/NavBar';
import { Outlet } from 'react-router-dom';

export default function GymLayout() {
  return (
    <div>
      <NavBar />
      <Outlet />
    </div>
  );
}
