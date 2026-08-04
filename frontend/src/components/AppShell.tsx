import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import './AppShell.css';

export function AppShell() {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-nav">Skip to main content</a>
      <Sidebar />
      <main className="app-shell__main" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
