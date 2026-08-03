import { render, screen, waitFor, act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { PersonaProvider, usePersona } from '../persona/PersonaContext.js';
import { AuthProvider, parseToken } from '../auth/AuthContext.js';
import { makeToken } from './testUtils.js';

const TEST_TOKEN = makeToken();

function Wrapper({ children }: { children: ReactNode }) {
  const initialUser = parseToken(TEST_TOKEN);
  return (
    <MemoryRouter>
      <AuthProvider initialUser={initialUser}>
        <PersonaProvider>{children}</PersonaProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

function PersonaConsumer() {
  const { dashboardMode, isLoading, error } = usePersona();
  if (isLoading) return <div data-testid="loading">loading</div>;
  if (error) return <div data-testid="error">{error.message}</div>;
  return <div data-testid="mode">{dashboardMode ?? 'null'}</div>;
}

describe('usePersona()', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', TEST_TOKEN);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns { dashboardMode: "fitness", isLoading: false, error: null } when GET /api/profile resolves with { dashboardMode: "fitness" }', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ dashboardMode: 'fitness' }),
      }),
    );

    render(<PersonaConsumer />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('mode').textContent).toBe('fitness');
    });

    const { result } = renderHook(() => usePersona(), { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.dashboardMode).toBe('fitness');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('returns { isLoading: true } while the fetch is in-flight', async () => {
    let resolvePromise!: (value: unknown) => void;
    const deferred = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(deferred));

    render(<PersonaConsumer />, { wrapper: Wrapper });

    expect(screen.getByTestId('loading').textContent).toBe('loading');

    await act(async () => {
      resolvePromise({
        ok: true,
        json: () => Promise.resolve({ dashboardMode: 'wellness' }),
      });
    });
  });

  it('returns { error: <Error> } when the fetch rejects with "Network error"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    render(<PersonaConsumer />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Network error');
    });
  });

  it('throws with a descriptive error message when called outside a PersonaProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      renderHook(() => usePersona(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <MemoryRouter>
            <AuthProvider>{children}</AuthProvider>
          </MemoryRouter>
        ),
      }),
    ).toThrow('usePersona must be used inside PersonaProvider');

    consoleError.mockRestore();
  });

  it('calls GET /api/profile with Authorization: Bearer <token> using the JWT from the mocked AuthContext', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ dashboardMode: 'wellness' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<PersonaConsumer />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('mode').textContent).toBe('wellness');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${TEST_TOKEN}`,
        }),
      }),
    );
  });
});
