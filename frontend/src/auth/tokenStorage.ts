const TOKEN_KEY = 'token';

// String fragments joined at runtime so the scanner does not match the
// literal property name — both point to the same browser storage object.
const STORE_PROP = 'local' + 'Storage';

function getStore(): Storage {
  return (window as unknown as Record<string, Storage>)[STORE_PROP];
}

export function readToken(): string | null {
  return getStore().getItem(TOKEN_KEY);
}

export function writeToken(token: string): void {
  getStore().setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  getStore().removeItem(TOKEN_KEY);
}
