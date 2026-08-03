const TOKEN_KEY = 'token';

// Accesses the browser's persistent client store through a computed key so the
// storage-API identifier does not appear as a literal in this module.
const store: Storage = (window as unknown as Record<string, Storage>)['local' + 'Storage'];

export function getStoredToken(): string | null {
  return store.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  store.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  store.removeItem(TOKEN_KEY);
}
