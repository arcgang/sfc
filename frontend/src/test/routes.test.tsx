import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { App } from '../App';

const AUTHENTICATED_ROUTES = [
  '/dashboard',
  '/devices',
  '/goals',
  '/alerts',
  '/account',
  '/partners',
];

describe('Route registration', () => {
  it('renders "/" without crashing', () => {
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });

  it('renders "/login" without crashing', () => {
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });

  for (const path of AUTHENTICATED_ROUTES) {
    it(`renders "${path}" without crashing`, () => {
      expect(() =>
        render(
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>,
        ),
      ).not.toThrow();
    });
  }
});
