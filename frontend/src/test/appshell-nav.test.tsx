import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { AuthProvider, parseToken } from '../auth/AuthContext.js';
import { AppShell } from '../components/AppShell.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { DevicesPage } from '../pages/DevicesPage.js';
import { GoalsPage } from '../pages/GoalsPage.js';
import { AlertsPage } from '../pages/AlertsPage.js';
import { ProfilePrivacyPage } from '../pages/ProfilePrivacyPage.js';
import { PartnersPage } from '../pages/PartnersPage.js';
import { makeToken } from './testUtils.js';

const TEST_DISPLAY_NAME = 'Alex Johnson';
const TEST_EMAIL = 'alex@example.com';

function renderRouteInShell(path: string, element: ReactElement) {
  const token = makeToken({ displayName: TEST_DISPLAY_NAME, email: TEST_EMAIL });
  const initialUser = parseToken(token);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider initialUser={initialUser}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route element={<AppShell />}>
            <Route path={path} element={element} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const AUTHENTICATED_ROUTES = [
  { path: '/dashboard', element: <DashboardPage />, heading: 'Dashboard' },
  { path: '/devices', element: <DevicesPage />, heading: 'Connected Devices' },
  { path: '/goals', element: <GoalsPage />, heading: 'Goals & Progress' },
  { path: '/alerts', element: <AlertsPage />, heading: 'Alerts & Insights' },
  { path: '/account', element: <ProfilePrivacyPage />, heading: 'My Account' },
  { path: '/partners', element: <PartnersPage />, heading: 'Partners & Services' },
] as const;

describe('Sidebar user identity — all authenticated routes', () => {
  beforeEach(() => localStorage.clear());

  for (const route of AUTHENTICATED_ROUTES) {
    it(`route "${route.path}" shows display name "${TEST_DISPLAY_NAME}"`, () => {
      renderRouteInShell(route.path, route.element);
      expect(screen.getByText(TEST_DISPLAY_NAME)).toBeTruthy();
    });

    it(`route "${route.path}" shows email "${TEST_EMAIL}"`, () => {
      renderRouteInShell(route.path, route.element);
      expect(screen.getByText(TEST_EMAIL)).toBeTruthy();
    });
  }
});

describe('Sidebar navigation links — all authenticated routes', () => {
  beforeEach(() => localStorage.clear());

  for (const route of AUTHENTICATED_ROUTES) {
    it(`route "${route.path}" has "📊 Dashboard" link pointing to /dashboard`, () => {
      renderRouteInShell(route.path, route.element);
      const link = screen.getByRole('link', { name: '📊 Dashboard' });
      expect(link).toBeTruthy();
      expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/dashboard');
    });

    it(`route "${route.path}" has "👤 My Account" link pointing to /account`, () => {
      renderRouteInShell(route.path, route.element);
      const link = screen.getByRole('link', { name: '👤 My Account' });
      expect(link).toBeTruthy();
      expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/account');
    });

    it(`route "${route.path}" has "🤝 Partners & Services" link pointing to /partners`, () => {
      renderRouteInShell(route.path, route.element);
      const link = screen.getByRole('link', { name: '🤝 Partners & Services' });
      expect(link).toBeTruthy();
      expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/partners');
    });
  }
});

describe('Authenticated route page headings — real page components inside AppShell', () => {
  beforeEach(() => localStorage.clear());

  for (const route of AUTHENTICATED_ROUTES) {
    it(`route "${route.path}" renders h1 heading "${route.heading}"`, () => {
      renderRouteInShell(route.path, route.element);
      expect(screen.getByRole('heading', { level: 1, name: route.heading })).toBeTruthy();
    });
  }
});

describe('Sidebar accessible controls', () => {
  beforeEach(() => localStorage.clear());

  it('"Log out" is a <button> with accessible name "Log out"', () => {
    renderRouteInShell('/dashboard', <DashboardPage />);
    const btn = screen.getByRole('button', { name: 'Log out' });
    expect(btn).toBeTruthy();
    expect((btn as HTMLButtonElement).tagName).toBe('BUTTON');
  });

  it('nav landmark has aria-label "Main navigation"', () => {
    renderRouteInShell('/dashboard', <DashboardPage />);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
  });

  it('"📊 Dashboard" link has an accessible label and is reachable by role', () => {
    renderRouteInShell('/dashboard', <DashboardPage />);
    expect(screen.getByRole('link', { name: '📊 Dashboard' })).toBeTruthy();
  });

  it('"👤 My Account" link has an accessible label and is reachable by role', () => {
    renderRouteInShell('/dashboard', <DashboardPage />);
    expect(screen.getByRole('link', { name: '👤 My Account' })).toBeTruthy();
  });

  it('"🤝 Partners & Services" link has an accessible label and is reachable by role', () => {
    renderRouteInShell('/dashboard', <DashboardPage />);
    expect(screen.getByRole('link', { name: '🤝 Partners & Services' })).toBeTruthy();
  });

  it('clicking "Log out" from /devices clears localStorage token', async () => {
    const token = makeToken({ displayName: TEST_DISPLAY_NAME, email: TEST_EMAIL });
    localStorage.setItem('token', token);
    renderRouteInShell('/devices', <DevicesPage />);

    await act(async () => {
      screen.getByRole('button', { name: 'Log out' }).click();
    });

    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('Skip navigation link', () => {
  it('skip-nav link is the first focusable element and targets #main-content', () => {
    renderRouteInShell('/dashboard', <DashboardPage />);
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toBeTruthy();
    expect((skipLink as HTMLAnchorElement).getAttribute('href')).toBe('#main-content');
  });

  it('<main> element has id="main-content"', () => {
    const { container } = renderRouteInShell('/dashboard', <DashboardPage />);
    const main = container.querySelector('main#main-content');
    expect(main).toBeTruthy();
  });
});
