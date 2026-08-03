import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, parseToken, useAuth } from '../auth/AuthContext.js';
import { ProtectedRoute } from '../auth/ProtectedRoute.js';
import type { ReactElement } from 'react';

// Minimal JWT with sub/email/name — not a real signature, just a parseable token
function makeToken(payload: Record<string, unknown> = {}): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(
    JSON.stringify({ userId: 'u1', email: 'a@b.com', displayName: 'Alex', ...payload }),
  );
  return `${header}.${body}.fakesig`;
}

function renderWithRouter(
  ui: ReactElement,
  {
    initialEntries = ['/'],
    authenticated = false,
  }: { initialEntries?: string[]; authenticated?: boolean } = {},
) {
  const initialUser = authenticated ? parseToken(makeToken()) : null;
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider initialUser={initialUser}>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects an unauthenticated visit to "/dashboard" to "/login"', () => {
    renderWithRouter(
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>dashboard</div>} />
        </Route>
      </Routes>,
      { initialEntries: ['/dashboard'] },
    );

    expect(screen.getByText('login page')).toBeTruthy();
    expect(screen.queryByText('dashboard')).toBeNull();
  });

  it('redirects an unauthenticated visit to "/devices" to "/login"', () => {
    renderWithRouter(
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/devices" element={<div>devices</div>} />
        </Route>
      </Routes>,
      { initialEntries: ['/devices'] },
    );

    expect(screen.getByText('login page')).toBeTruthy();
    expect(screen.queryByText('devices')).toBeNull();
  });

  it('renders the protected route for an authenticated user without redirect', () => {
    renderWithRouter(
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>dashboard</div>} />
        </Route>
      </Routes>,
      { initialEntries: ['/dashboard'], authenticated: true },
    );

    expect(screen.getByText('dashboard')).toBeTruthy();
    expect(screen.queryByText('login page')).toBeNull();
  });
});

describe('AuthContext — login', () => {
  beforeEach(() => localStorage.clear());

  function LoginConsumer() {
    const { login, user } = useAuth();
    return (
      <>
        <button onClick={() => login(makeToken())}>log in</button>
        <span data-testid="user">{user ? user.email : 'none'}</span>
      </>
    );
  }

  it('login() with a valid token exposes the decoded email "a@b.com" in context', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/" element={<LoginConsumer />} />
      </Routes>,
    );

    expect(screen.getByTestId('user').textContent).toBe('none');

    await act(async () => {
      screen.getByText('log in').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('a@b.com');
  });

  it('login() persists the token to localStorage under key "token"', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/" element={<LoginConsumer />} />
      </Routes>,
    );

    const token = makeToken();
    await act(async () => {
      screen.getByText('log in').click();
    });

    expect(localStorage.getItem('token')).not.toBeNull();
    // token stored is the one passed to login; verify it decodes to the same email
    const stored = localStorage.getItem('token')!;
    expect(JSON.parse(atob(stored.split('.')[1])).email).toBe('a@b.com');
    void token;
  });
});

describe('AuthContext — logout', () => {
  beforeEach(() => localStorage.clear());

  function LogoutConsumer() {
    const { logout, user } = useAuth();
    return (
      <>
        <button onClick={() => logout()}>log out</button>
        <span data-testid="user">{user ? user.email : 'none'}</span>
      </>
    );
  }

  it('logout() clears the user from context', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/" element={<LogoutConsumer />} />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>,
      { authenticated: true },
    );

    expect(screen.getByTestId('user').textContent).toBe('a@b.com');

    await act(async () => {
      screen.getByText('log out').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('logout() removes the token from localStorage', async () => {
    localStorage.setItem('token', makeToken());
    renderWithRouter(
      <Routes>
        <Route path="/" element={<LogoutConsumer />} />
      </Routes>,
      { authenticated: true },
    );

    await act(async () => {
      screen.getByText('log out').click();
    });

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('logout() navigates to "/" (public homepage)', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/" element={<div>home page</div>} />
        <Route path="/dashboard" element={<LogoutConsumer />} />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>,
      { initialEntries: ['/dashboard'], authenticated: true },
    );

    expect(screen.getByText('log out')).toBeTruthy();

    await act(async () => {
      screen.getByText('log out').click();
    });

    expect(screen.getByText('home page')).toBeTruthy();
  });
});
