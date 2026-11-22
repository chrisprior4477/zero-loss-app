const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function readWalletReset(key: string) {
  try {
    const value = sessionStorage.getItem(key);
    return value && uuid.test(value) ? value : null;
  } catch { return null; }
}

export function saveWalletReset(key: string, request: string | null) {
  try {
    if (request) sessionStorage.setItem(key, request);
    else sessionStorage.removeItem(key);
  } catch { /* In-memory recovery still works. */ }
}
