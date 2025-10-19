import { NavLink, Outlet } from 'react-router-dom';

export default function GymLayout() {
  return (
    <div className="gym-layout">
      <nav className="navbar bg-white shadow-sm mb-4">
        <div className="container mx-auto px-4">
          <div className="flex space-x-4">
            <NavLink 
              to="/gym"
              className={({ isActive }) => 
                `nav-link px-3 py-2 rounded-md ${
                  isActive ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
              end
            >
              My Workout
            </NavLink>
            <NavLink 
              to="/gym/saved-plans"
              className={({ isActive }) => 
                `nav-link px-3 py-2 rounded-md ${
                  isActive ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              📁 Saved Plans
            </NavLink>
            <NavLink 
              to="/gym-admin"
              className={({ isActive }) => 
                `nav-link px-3 py-2 rounded-md ${
                  isActive ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              Manage Library
            </NavLink>
          </div>
        </div>
      </nav>
      <div className="container mx-auto px-4">
        <Outlet />
      </div>
    </div>
  );
}
