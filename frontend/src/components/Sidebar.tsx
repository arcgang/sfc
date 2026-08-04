import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import './Sidebar.css';

export function Sidebar() {
  const { user, logout } = useAuth();

  const avatarInitial = user?.displayName?.charAt(0).toUpperCase() ?? '?';

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-initial" aria-hidden="true">W</span>
        WellnessHub
      </div>

      {user && (
        <div className="sidebar__user">
          <span className="sidebar__avatar" aria-hidden="true">{avatarInitial}</span>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{user.displayName}</span>
            <span className="sidebar__user-email">{user.email}</span>
          </div>
        </div>
      )}

      <nav className="sidebar__nav" aria-label="Main navigation">
        <ul className="sidebar__nav-list" role="list">
          <li>
            <NavLink className="sidebar__nav-link" to="/dashboard">
              📊 Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink className="sidebar__nav-link" to="/account">
              👤 My Account
            </NavLink>
          </li>
          <li>
            <NavLink className="sidebar__nav-link" to="/partners">
              🤝 Partners &amp; Services
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="sidebar__footer">
        <button className="sidebar__logout" type="button" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
