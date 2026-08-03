export function makeToken(payload: Record<string, unknown> = {}): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(
    JSON.stringify({ userId: 'u1', email: 'a@b.com', displayName: 'Alex', ...payload }),
  );
  return `${header}.${body}.fakesig`;
}
