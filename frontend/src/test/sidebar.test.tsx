import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, parseToken } from '../auth/AuthContext.js';
import { ProtectedRoute } from '../auth/ProtectedRoute.js';
import { AppShell } from '../components/AppShell.js';

function makeToken(payload: Record<string, unknown> = {}): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(
    JSON.stringify({
      userId: 'u1',
      email: 'alex@example.com',
      displayName: 'Alex Johnson',
      ...payload,
    }),
  );
  return `${header}.${body}.fakesig`;
}

function renderShellAt(path: string, authenticated = true) {
  const initialUser = authenticated ? parseToken(makeToken()) : null;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider initialUser={initialUser}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route element={<AppShell />}>
            <Route path={path} element={<div>page content</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Sidebar — brand', () => {
  it('renders the text "WellnessHub"', () => {
    renderShellAt('/dashboard');
    expect(screen.getByText('WellnessHub')).toBeTruthy();
  });
});

describe('Sidebar — user identity', () => {
  it('renders the authenticated user display name "Alex Johnson"', () => {
    renderShellAt('/dashboard');
    expect(screen.getByText('Alex Johnson')).toBeTruthy();
  });

  it('renders the authenticated user email "alex@example.com"', () => {
    renderShellAt('/dashboard');
    expect(screen.getByText('alex@example.com')).toBeTruthy();
  });
});

describe('Sidebar — navigation links', () => {
  it('renders the "📊 Dashboard" nav link pointing to /dashboard', () => {
    renderShellAt('/dashboard');
    const link = screen.getByRole('link', { name: '📊 Dashboard' });
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/dashboard');
  });

  it('renders the "👤 My Account" nav link pointing to /account', () => {
    renderShellAt('/dashboard');
    const link = screen.getByRole('link', { name: '👤 My Account' });
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/account');
  });

  it('renders the "🤝 Partners & Services" nav link pointing to /partners', () => {
    renderShellAt('/dashboard');
    const link = screen.getByRole('link', { name: '🤝 Partners & Services' });
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/partners');
  });

  it('wraps nav links in a <nav> with aria-label "Main navigation"', () => {
    renderShellAt('/dashboard');
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
  });
});

describe('Sidebar — logout', () => {
  beforeEach(() => localStorage.clear());

  it('clicking "Log out" clears the token from localStorage', async () => {
    localStorage.setItem('token', makeToken());
    renderShellAt('/dashboard');

    await act(async () => {
      screen.getByRole('button', { name: 'Log out' }).click();
    });

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('clicking "Log out" navigates to the home page "/"', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider initialUser={parseToken(makeToken())}>
          <Routes>
            <Route path="/" element={<div>home page</div>} />
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<div>dashboard content</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Log out' }).click();
    });

    expect(screen.getByText('home page')).toBeTruthy();
  });
});

describe('AppShell — authenticated routes render sidebar', () => {
  beforeEach(() => localStorage.clear());

  const authenticatedRoutes = [
    '/dashboard',
    '/devices',
    '/goals',
    '/alerts',
    '/account',
    '/partners',
  ] as const;

  for (const path of authenticatedRoutes) {
    it(`route "${path}" shows the "WellnessHub" brand in the sidebar`, () => {
      renderShellAt(path);
      expect(screen.getByText('WellnessHub')).toBeTruthy();
    });
  }
});

describe('AppShell — unauthenticated redirect', () => {
  beforeEach(() => localStorage.clear());

  it('an unauthenticated visit to "/dashboard" redirects to "/login"', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>login page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<div>dashboard</div>} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('login page')).toBeTruthy();
    expect(screen.queryByText('WellnessHub')).toBeNull();
  });
});
