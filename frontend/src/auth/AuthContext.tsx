import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { readToken, writeToken, clearToken } from './tokenStorage.js';

export interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function base64urlDecode(s: string): string {
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

export function parseToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64urlDecode(parts[1])) as Record<string, unknown>;
    const userId = typeof payload.userId === 'string' ? payload.userId : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    const displayName =
      typeof payload.displayName === 'string' ? payload.displayName : '';
    if (!userId || !email) return null;
    return { userId, email, displayName };
  } catch {
    return null;
  }
}

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [storedToken, setStoredToken] = useState<string | null>(() =>
    readToken(),
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (initialUser !== null) return initialUser;
    return storedToken ? parseToken(storedToken) : null;
  });
  const navigate = useNavigate();

  const login = useCallback((token: string) => {
    const parsed = parseToken(token);
    if (!parsed) return;
    writeToken(token);
    setStoredToken(token);
    setUser(parsed);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setStoredToken(null);
    setUser(null);
    navigate('/');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, token: storedToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
