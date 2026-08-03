import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { GoalsPage } from './pages/GoalsPage';
import { AlertsPage } from './pages/AlertsPage';
import { ProfilePrivacyPage } from './pages/ProfilePrivacyPage';
import { PartnersPage } from './pages/PartnersPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/devices" element={<DevicesPage />} />
      <Route path="/goals" element={<GoalsPage />} />
      <Route path="/alerts" element={<AlertsPage />} />
      <Route path="/account" element={<ProfilePrivacyPage />} />
      <Route path="/partners" element={<PartnersPage />} />
    </Routes>
  );
}
