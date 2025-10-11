import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const GymLayout = () => {
  return (
    <div>
      <nav className="navbar">
        <NavLink 
          to="/gym"
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          My Workout
        </NavLink>
        <NavLink 
          to="/gym-admin"
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Manage Library
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
};

export default GymLayout;
