/** Turns Supabase's technical sign-in messages into plain words for staff. Unknown messages pass through. */
const RULES: [RegExp, string][] = [
  [/invalid or has expired|otp_expired|token has expired|already (been )?used/i, 'This email link has expired or was already used. Ask your admin to send a new invite, or use "Forgot password?" below.'],
  [/provider is not enabled|unsupported provider|provider_disabled/i, "This sign-in method isn't turned on yet. Ask your admin."],
  [/signups? (not allowed|are disabled|is disabled)|signup_disabled/i, 'New accounts are closed right now. Ask your admin to invite you.'],
  [/rate limit|too many requests|over_email_send_rate_limit|after \d+ seconds/i, 'Too many emails were requested. Wait a few minutes and try again.'],
  [/invalid login credentials/i, 'Wrong email or password.'],
  [/email not confirmed/i, 'Please confirm your email first. Open the link we sent you, then sign in.'],
  [/user already registered|already been registered/i, 'This email already has an account. Sign in instead, or use "Forgot password?".'],
  [/password should be at least|weak password|password is too/i, 'Choose a stronger password (at least 8 characters).'],
  [/failed to fetch|networkerror|network request failed|load failed/i, 'No internet connection. Try again when you are online.'],
  [/access_denied|denied|cancel/i, 'That sign-in did not finish. Try again, or ask your admin for help.'],
]

export function friendlyAuthError(message: string | null | undefined): string {
  const m = (message ?? '').trim()
  if (!m) return 'Something went wrong. Please try again.'
  return RULES.find(([re]) => re.test(m))?.[1] ?? m
}
