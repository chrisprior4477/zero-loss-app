/** A lost reply can follow a committed reset. Release the UI and let it check
 * the saved result without replaying the write. */
export async function waitForDemoResetReply<T>(request: () => Promise<T>, unconfirmed: T): Promise<T> {
  if (!navigator.onLine) return unconfirmed;
  let interrupt!: () => void;
  const interrupted = new Promise<T>(resolve => { interrupt = () => resolve(unconfirmed); });
  const timer = window.setTimeout(interrupt, 15_000);
  window.addEventListener("offline", interrupt);
  try {
    return await Promise.race([request(), interrupted]);
  } catch {
    return unconfirmed;
  } finally {
    window.clearTimeout(timer);
    window.removeEventListener("offline", interrupt);
  }
}
