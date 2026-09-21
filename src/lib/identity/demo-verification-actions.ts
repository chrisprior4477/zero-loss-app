"use server";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { demoVerificationSteps, parseDemoVerification, type DemoVerificationResult, type DemoVerificationStep } from "./demo-verification";

async function runVerification(rpc: string, parameters: Record<string, string>): Promise<DemoVerificationResult> {
  if (!isPreviewDataEnvironment()) return { error: "Demo verification is not enabled in this environment." };
  try {
    const db = await createClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user?.email_confirmed_at) return { error: "Sign in again to continue verification." };
    const { data, error: failure } = await db.rpc(rpc, parameters);
    if (failure) return { error: failure.code === "P0001" ? failure.message : "We couldn’t save this step. Reopen the check to resume safely." };
    const verification = parseDemoVerification(data);
    return verification ? { verification } : { error: "We couldn’t confirm verification status. Reopen the check to resume." };
  } catch { return { error: "Connection interrupted. Retry this step; your saved progress will not be duplicated." }; }
}
export async function beginDemoVerification(rewardId: string): Promise<DemoVerificationResult> {
  if (!/^[0-9a-f-]{36}$/i.test(rewardId)) return { error: "This prize reference is invalid." };
  return runVerification("begin_demo_identity_verification", { p_reward_id: rewardId });
}
export async function advanceDemoVerification(id: string, step: DemoVerificationStep): Promise<DemoVerificationResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !demoVerificationSteps.includes(step) || step === "start") return { error: "This verification step is invalid." };
  // Only fixture identifiers cross this boundary, never user-supplied identity data.
  return runVerification("advance_demo_identity_verification", { p_verification_id: id, p_step: step, p_fixture: "sample-adult-v1" });
}
export async function restartDemoVerification(rewardId: string): Promise<DemoVerificationResult> {
  if (!/^[0-9a-f-]{36}$/i.test(rewardId)) return { error: "This prize reference is invalid." };
  return runVerification("restart_demo_identity_verification", { p_reward_id: rewardId });
}
