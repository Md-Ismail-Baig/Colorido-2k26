/**
 * Registration email verification — token + link plumbing.
 *
 * Verification links look like:
 *   /registration/verify?id=<registration uuid>&exp=<epochSeconds>&token=<hex>
 *
 * The token is HMAC-SHA256 over `<id>:<exp>` with a key derived from
 * SUPABASE_SERVICE_ROLE_KEY plus a fixed domain-separation prefix, so no new
 * secret is stored anywhere: the service key never leaves the server (same
 * trust model as the admin client) and a leaked link expires on its own.
 * `exp` travels in the URL but is covered by the HMAC, so it cannot be
 * extended by an attacker.
 *
 * If SUPABASE_SERVICE_ROLE_KEY is unset, token issuance/verification no-ops —
 * matching the email layer's graceful degradation (dependency guide §27).
 */

import { createHmac, timingSafeEqual } from "crypto";

const KEY_DOMAIN = "colorido-2k26:registration-email-verify:v1";

/** Verification links stay valid for 48 hours. */
export const VERIFY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signingKey(): Buffer | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createHmac("sha256", serviceKey).update(KEY_DOMAIN).digest();
}

function computeToken(registrationId: string, expEpochSeconds: number): string {
  const key = signingKey()!;
  return createHmac("sha256", key)
    .update(`${registrationId}:${expEpochSeconds}`)
    .digest("hex");
}

export interface IssuedToken {
  token: string;
  /** Epoch seconds — travels in the URL as `exp`. */
  exp: number;
  expiresAt: Date;
}

/**
 * Mint a verification token for a registration id.
 * Returns null when the signing key is unavailable (email disabled).
 */
export function issueVerificationToken(
  registrationId: string,
): IssuedToken | null {
  if (!signingKey() || !UUID_RE.test(registrationId)) return null;
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
  const exp = Math.floor(expiresAt.getTime() / 1000);
  return { token: computeToken(registrationId, exp), exp, expiresAt };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "malformed" | "expired" | "invalid" };

/**
 * Check an id/exp/token triple from a verification URL. Strict input shapes,
 * exact expiry check, and a constant-time comparison — the URL is attacker
 * controllable, so nothing about it is trusted.
 */
export function verifyVerificationToken(
  registrationId: string,
  exp: string,
  token: string,
): VerifyResult {
  if (
    !UUID_RE.test(registrationId) ||
    !/^\d{1,12}$/.test(exp) ||
    !/^[0-9a-f]{64}$/.test(token)
  ) {
    return { ok: false, reason: "malformed" };
  }

  const expEpoch = Number(exp);
  if (expEpoch * 1000 <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const expected = Buffer.from(computeToken(registrationId, expEpoch), "hex");
  const received = Buffer.from(token, "hex");
  if (!timingSafeEqual(expected, received)) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true };
}

/** Build the absolute verification URL for emails. */
export function verificationLink(
  appUrl: string,
  registrationId: string,
  issued: IssuedToken,
): string {
  return `${appUrl}/registration/verify?id=${registrationId}&exp=${issued.exp}&token=${issued.token}`;
}
