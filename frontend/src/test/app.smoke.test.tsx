import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { App } from '../App.js';
import { AuthProvider } from '../auth/AuthContext.js';

describe('App root smoke test', () => {
  it('mounts without crashing when rendered at "/"', () => {
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
