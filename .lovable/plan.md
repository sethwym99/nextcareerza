# Require Email Verification on Signup

Right now anyone can sign up with any email address and immediately get an account — there's no proof they own the inbox. We'll require users to verify their email before the account becomes usable.

## Approach

Use Supabase's built-in email confirmation flow (already wired to your custom `notify.nextcareer.one` sender via the auth webhook and `SignupEmail` template).

## Changes

1. **Disable auto-confirm** in auth settings so new signups start unconfirmed and receive the verification email.

2. **Update signup flow** in `src/routes/auth.tsx`:
   - After `supabase.auth.signUp`, detect the "unconfirmed" state (session will be `null`).
   - Instead of navigating to `/dashboard`, show a "Check your email to verify your account" screen with the email address and a "Resend email" button (calls `supabase.auth.resend`).
   - Do not sign the user in until they click the link.

3. **Handle the verification callback**:
   - The signup email's confirmation link already points to `/dashboard`. Keep that — once clicked, Supabase sets the session and the authenticated layout takes over.
   - Add a small toast on first authenticated load if arriving from verification (optional polish).

4. **Google sign-in stays unchanged** — Google already provides a verified email, so no extra step needed there.

5. **Existing unverified accounts**: any accounts already created with unverified emails will simply be asked to verify next time they try to sign in (Supabase blocks sign-in for unconfirmed users once auto-confirm is off). We won't mass-delete them.

## Technical notes

- Tool: `supabase--configure_auth` with `auto_confirm_email: false`.
- The `SignupEmail` template and `/lovable/email/auth/webhook` route are already in place, so verification emails will send through your existing branded flow.
- No database migration needed.

## Out of scope

- OTP/code-based verification (6-digit code instead of link). The magic-link flow is already set up and more reliable on mobile; switching to OTP would require a new template + verification UI. Let me know if you'd prefer that instead.
