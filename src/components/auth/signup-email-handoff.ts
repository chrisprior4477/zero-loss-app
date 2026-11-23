const signupEmailKey = "zero-loss-signup-email";

export function rememberEmailForSignup(email: string, destination: string | null) {
  try {
    sessionStorage.removeItem(signupEmailKey);
    sessionStorage.removeItem("zero-loss-login-email");
    if (!email.trim()) return;
    const saved = JSON.stringify({ email: email.trim(), destination, expires: Date.now() + 300_000 });
    sessionStorage.setItem(signupEmailKey, saved);
    sessionStorage.setItem("zero-loss-login-email", saved);
  } catch { /* Both forms still accept an email directly. */ }
}

export function takeSignupEmail(destination: string | null): string | undefined {
  try {
    const saved = JSON.parse(sessionStorage.getItem(signupEmailKey) ?? "null");
    sessionStorage.removeItem(signupEmailKey);
    if (saved?.destination === destination && saved.expires >= Date.now() && typeof saved.email === "string" && saved.email.length <= 254) return saved.email;
  } catch { /* Browser storage is optional. */ }
}
