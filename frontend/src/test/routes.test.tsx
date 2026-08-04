import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { App } from '../App.js';
import { AuthProvider } from '../auth/AuthContext.js';

const AUTHENTICATED_ROUTES = [
  '/dashboard',
  '/devices',
  '/goals',
  '/alerts',
  '/account',
  '/partners',
];

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Route registration', () => {
  it('renders "/" without crashing', () => {
    expect(() => renderApp('/')).not.toThrow();
  });

  it('renders "/login" without crashing', () => {
    expect(() => renderApp('/login')).not.toThrow();
  });

  it('renders "/signup" without crashing', () => {
    expect(() => renderApp('/signup')).not.toThrow();
  });

  for (const path of AUTHENTICATED_ROUTES) {
    it(`renders "${path}" without crashing (unauthenticated → /login redirect)`, () => {
      expect(() => renderApp(path)).not.toThrow();
    });
  }
});
