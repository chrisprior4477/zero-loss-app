type PasswordUpdateError = { code?: string; status?: number; name?: string };

// Only show our own messages, never raw provider responses or credentials.
export function passwordUpdateErrorMessage(error: PasswordUpdateError): string {
  switch (error.code) {
    case "same_password":
      return "That is already your current password. Choose a different new password, or sign in with that password.";
    case "weak_password":
      return "Choose a stronger password. Try a longer, unique password that you don't use elsewhere.";
    case "session_expired":
    case "session_not_found":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
    case "reauthentication_needed":
    case "reauthentication_not_valid":
      return "Your password-change session is no longer valid. Sign in again or request a new reset link.";
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a minute before trying again.";
    default:
      if (error.status === 429) return "Too many attempts. Please wait a minute before trying again.";
      return "We couldn't confirm the password update. Try signing in with your new password before requesting another reset link.";
  }
}
