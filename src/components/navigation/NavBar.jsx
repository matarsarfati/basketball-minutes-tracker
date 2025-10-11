import { NavLink } from 'react-router-dom';

export default function NavBar() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-14 items-center justify-between">
          <div className="flex space-x-2">
            <NavLink
              to="/gym"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm ${
                  isActive
                    ? 'bg-slate-100 font-semibold text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              My Workout
            </NavLink>
            <NavLink
              to="/gym-admin"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm ${
                  isActive
                    ? 'bg-slate-100 font-semibold text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              Manage Library
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
