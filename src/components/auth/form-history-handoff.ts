const key = "zeroLossAuthFormReturn";
type FormKind = "login" | "signup";
type FormValues = { email: string; firstName?: string; lastName?: string };
const drafts = new Map<FormKind, { token: string; expires: number; values: FormValues }>();

export function rememberAuthForm(kind: FormKind, values: FormValues) {
  const token = crypto.randomUUID();
  drafts.set(kind, { token, values, expires: Date.now() + 300_000 });
  history.replaceState({ ...history.state, [key]: { kind, token, href: location.href } }, "");
}

export function takeAuthForm(kind: FormKind) {
  const marker = history.state?.[key];
  const draft = drafts.get(kind);
  if (marker?.kind !== kind || marker.href !== location.href || !draft || draft.token !== marker.token) return null;
  drafts.delete(kind);
  return draft.expires >= Date.now() ? draft.values : null;
}
