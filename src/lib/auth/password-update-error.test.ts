import { expect, test } from "vitest";
import { passwordUpdateErrorMessage } from "./password-update-error";

test("same password is not misreported as an expired link or generic failure", () => {
  expect(passwordUpdateErrorMessage({ code: "same_password" })).toBe(
    "That is already your current password. Choose a different new password, or sign in with that password."
  );
});

test.each(["session_expired", "session_not_found", "refresh_token_not_found", "refresh_token_already_used", "reauthentication_needed", "reauthentication_not_valid"])("%s gives session recovery guidance", (code) => {
  expect(passwordUpdateErrorMessage({ code })).toContain("session is no longer valid");
});

test("weak password and rate limits give distinct, actionable guidance", () => {
  expect(passwordUpdateErrorMessage({ code: "weak_password" })).toContain("stronger password");
  expect(passwordUpdateErrorMessage({ code: "over_request_rate_limit" })).toContain("wait a minute");
  expect(passwordUpdateErrorMessage({ status: 429 })).toContain("wait a minute");
});

test("unknown errors do not falsely claim the password was unchanged", () => {
  expect(passwordUpdateErrorMessage({ status: 500 })).toContain("couldn't confirm");
});
