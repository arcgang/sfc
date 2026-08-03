import '@testing-library/jest-dom';

// The test runner's jsdom instance has a non-functional localStorage when
// --localstorage-file is provided without a valid path. Replace it with a
// simple in-memory store so AuthContext's localStorage calls work in tests.
class InMemoryStorage implements Storage {
  private store: Record<string, string> = {};
  get length() { return Object.keys(this.store).length; }
  key(index: number) { return Object.keys(this.store)[index] ?? null; }
  getItem(key: string) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
  [name: string]: unknown;
}

Object.defineProperty(window, 'localStorage', {
  value: new InMemoryStorage(),
  writable: true,
  configurable: true,
});
