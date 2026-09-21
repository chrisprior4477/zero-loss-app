export type DemoVerificationStep = "start" | "consent" | "details" | "document_front" | "document_back" | "selfie" | "submitted" | "demo_passed" | "requires_input";
export type DemoVerification = { id: string; reference: string; provider: "demo"; step: DemoVerificationStep };
export type DemoVerificationResult = { verification: DemoVerification; error?: never } | { error: string; verification?: never };
export const demoVerificationSteps: DemoVerificationStep[] = ["start", "consent", "details", "document_front", "document_back", "selfie", "submitted", "demo_passed", "requires_input"];
export function parseDemoVerification(value: unknown): DemoVerification | null {
  if (!value || typeof value !== "object") return null;
  const v = value as DemoVerification;
  return typeof v.id === "string" && /^[0-9a-f-]{36}$/i.test(v.id) && typeof v.reference === "string"
    && /^ver_[0-9a-f]+$/.test(v.reference) && v.provider === "demo" && demoVerificationSteps.includes(v.step)
    ? { id: v.id, reference: v.reference, provider: "demo", step: v.step } : null;
}
