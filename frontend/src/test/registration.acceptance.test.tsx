import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext.js';
import { SignUpPage } from '../pages/SignUpPage.js';

// Minimal parseable JWT matching AuthContext.parseToken expectations
function makeRegistrationToken(email = 'new@example.com', userId = 'user-abc-123'): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ userId, email, displayName: 'New User', sub: userId }));
  return `${header}.${body}.fakesig`;
}

function renderSignUpWithOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/onboarding" element={<div>onboarding page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Registration flow — frontend acceptance criteria', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // AC1: Sign-up form collects full name (required), email (required, email format), and password (required, min 8 chars)
  describe('AC1 — sign-up form renders all required fields', () => {
    it('renders a labelled "Full Name" input field', () => {
      renderSignUpWithOnboarding();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    it('renders a labelled "Email address" input field', () => {
      renderSignUpWithOnboarding();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it('renders a labelled "Password" input field', () => {
      renderSignUpWithOnboarding();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });
  });

  // AC2: Submitting valid data calls POST /api/v1/auth/session mode=register; on 201 advances user to onboarding profile screen
  describe('AC2 — valid submission calls POST /api/v1/auth/session mode=register and navigates to /onboarding', () => {
    it('calls fetch with POST to /api/v1/auth/session with mode="register", fullName, email, and password', async () => {
      const token = makeRegistrationToken();
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ token, userId: 'user-abc-123' }),
      } as Response);

      const user = userEvent.setup();
      renderSignUpWithOnboarding();

      await user.type(screen.getByLabelText(/full name/i), 'Acceptance User');
      await user.type(screen.getByLabelText(/email address/i), 'new@example.com');
      await user.type(screen.getByLabelText(/password/i), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/auth/session');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body.mode).toBe('register');
      expect(body.fullName).toBe('Acceptance User');
      expect(body.email).toBe('new@example.com');
      expect(body.password).toBe('SecurePass1');
    });

    it('navigates to /onboarding after a successful HTTP 201 response', async () => {
      const token = makeRegistrationToken();
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ token, userId: 'user-abc-123' }),
      } as Response);

      const user = userEvent.setup();
      renderSignUpWithOnboarding();

      await user.type(screen.getByLabelText(/full name/i), 'Acceptance User');
      await user.type(screen.getByLabelText(/email address/i), 'new@example.com');
      await user.type(screen.getByLabelText(/password/i), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText('onboarding page')).toBeInTheDocument();
      });
    });
  });

  // AC3: Duplicate email shows a clear error without revealing other account details
  describe('AC3 — duplicate email (HTTP 409) shows a generic error without revealing account details', () => {
    it('displays a server error message on HTTP 409', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ code: 'REGISTRATION_FAILED', message: 'Registration could not be completed.' }),
      } as Response);

      const user = userEvent.setup();
      renderSignUpWithOnboarding();

      await user.type(screen.getByLabelText(/full name/i), 'Existing User');
      await user.type(screen.getByLabelText(/email address/i), 'duplicate@example.com');
      await user.type(screen.getByLabelText(/password/i), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      const alert = await screen.findByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('does not display text revealing that the email is already registered on HTTP 409', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ code: 'REGISTRATION_FAILED', message: 'Registration could not be completed.' }),
      } as Response);

      const user = userEvent.setup();
      renderSignUpWithOnboarding();

      await user.type(screen.getByLabelText(/full name/i), 'Existing User');
      await user.type(screen.getByLabelText(/email address/i), 'duplicate@example.com');
      await user.type(screen.getByLabelText(/password/i), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).not.toMatch(/already|registered|exists|taken|in use/i);
      expect(alert.textContent).not.toContain('duplicate@example.com');
    });

    it('does not navigate to /onboarding on HTTP 409', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ code: 'REGISTRATION_FAILED', message: 'Registration could not be completed.' }),
      } as Response);

      const user = userEvent.setup();
      renderSignUpWithOnboarding();

      await user.type(screen.getByLabelText(/full name/i), 'Existing User');
      await user.type(screen.getByLabelText(/email address/i), 'duplicate@example.com');
      await user.type(screen.getByLabelText(/password/i), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      await screen.findByRole('alert');
      expect(screen.queryByText('onboarding page')).not.toBeInTheDocument();
    });
  });

  // AC4: Password < 8 chars shows field-level validation error before submission
  describe('AC4 — password "1234567" (7 chars) shows a field-level error and does not submit', () => {
    it('shows "Password must be at least 8 characters." field error for password "1234567"', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const user = userEvent.setup();
      renderSignUpWithOnboarding();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), '1234567');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('does not navigate to /onboarding when password "1234567" is submitted', async () => {
      vi.spyOn(globalThis, 'fetch');
      const user = userEvent.setup();
      renderSignUpWithOnboarding();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), '1234567');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      expect(screen.queryByText('onboarding page')).not.toBeInTheDocument();
    });
  });

  // AC5: Required empty fields rejected with field-specific messages
  describe('AC5 — empty required fields produce individual field-specific error messages', () => {
    it('shows "Full name is required." when Full Name is empty and does not submit', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const user = userEvent.setup();
      renderSignUpWithOnboarding();

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      expect(screen.getByText('Full name is required.')).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('shows "A valid email address is required." when Email is empty and does not submit', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const user = userEvent.setup();
      renderSignUpWithOnboarding();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/password/i), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      expect(screen.getByText('A valid email address is required.')).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('shows "Password must be at least 8 characters." when Password is empty and does not submit', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const user = userEvent.setup();
      renderSignUpWithOnboarding();

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('shows separate field errors for all three empty fields simultaneously', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const user = userEvent.setup();
      renderSignUpWithOnboarding();

      await user.click(screen.getByRole('button', { name: /sign up/i }));

      expect(screen.getByText('Full name is required.')).toBeInTheDocument();
      expect(screen.getByText('A valid email address is required.')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
