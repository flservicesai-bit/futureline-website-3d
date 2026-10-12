/**
 * Minimum length for any new password (sign-up, reset, change).
 *
 * Raised from 6. Only new passwords are checked, so existing accounts keep
 * signing in with what they have. The Terms of Service quote this number —
 * update messages/*.json (legal.terms) if it changes.
 */
export const PASSWORD_MIN_LENGTH = 10;
