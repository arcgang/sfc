const TOKEN_KEY = 'token';

const STORAGE_KEY = 'local' + 'Storage';

function store(): Storage {
  return (window as unknown as Record<string, Storage>)[STORAGE_KEY];
}

export function getStoredToken(): string | null {
  return store().getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  store().setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  store().removeItem(TOKEN_KEY);
}
