import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthContext.js';

export type DashboardMode = 'wellness' | 'fitness' | 'medical';

interface PersonaContextValue {
  dashboardMode: DashboardMode | null;
  isLoading: boolean;
  error: Error | null;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [dashboardMode, setDashboardMode] = useState<DashboardMode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    fetch('/api/profile', {
      headers: { Authorization: `Bearer ${token ?? ''}` },
      signal: controller.signal,
    })
      .then((res) => res.json() as Promise<{ dashboardMode: DashboardMode }>)
      .then((data) => {
        setDashboardMode(data.dashboardMode);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [user, token]);

  return (
    <PersonaContext.Provider value={{ dashboardMode, isLoading, error }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used inside PersonaProvider');
  return ctx;
}
