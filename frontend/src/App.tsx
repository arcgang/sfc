import { Routes, Route, Outlet } from 'react-router-dom';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignUpPage } from './pages/SignUpPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { DevicesPage } from './pages/DevicesPage.js';
import { GoalsPage } from './pages/GoalsPage.js';
import { AlertsPage } from './pages/AlertsPage.js';
import { ProfilePrivacyPage } from './pages/ProfilePrivacyPage.js';
import { PartnersPage } from './pages/PartnersPage.js';
import { ProtectedRoute } from './auth/ProtectedRoute.js';
import { AppShell } from './components/AppShell.js';
import { PersonaProvider } from './persona/PersonaContext.js';

function PersonaLayout() {
  return (
    <PersonaProvider>
      <Outlet />
    </PersonaProvider>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<PersonaLayout />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/account" element={<ProfilePrivacyPage />} />
            <Route path="/partners" element={<PartnersPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
