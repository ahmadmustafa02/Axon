import type { AuthError } from "@supabase/supabase-js";

export function authErrorUserMessage(error: AuthError): string {
  const raw = error.message ?? "";
  const msg = raw.toLowerCase();
  const code = error.code?.toLowerCase() ?? "";

  if (
    code === "over_email_send_rate_limit" ||
    /email.*rate\s*limit|rate\s*limit.*email/i.test(raw)
  ) {
    return "Too many emails were sent to this address. Wait a few minutes and try again, or sign in if you already have an account.";
  }

  if (
    error.status === 429 ||
    msg.includes("rate limit") ||
    code.includes("rate_limit")
  ) {
    return "Too many attempts right now. Please wait a few minutes and try again.";
  }

  return raw || "Something went wrong. Please try again.";
}
