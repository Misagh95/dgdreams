import { createHmac, timingSafeEqual } from "crypto";

/**
 * Resolved lazily, per call, never at module load.
 *
 * `next build` evaluates route modules with NODE_ENV=production just to collect
 * page data. Reading the secret at import time therefore aborted the whole
 * production build whenever SESSION_SECRET was not already exported, so the
 * site could not deploy at all. Evaluating it here means a build never needs
 * the key, while actually minting or checking a token still refuses to run
 * without one — which is the property that matters for security.
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is not set. Add it to .env.local and to the deployment environment."
    );
  }
  // Dev-only fallback: never used when NODE_ENV === "production".
  return "dgdreams-dev-secret-change-in-production";
}

export interface SessionPayload {
  address: string;
  iat: number;
  exp: number;
}

export function createSessionToken(
  address: string,
  ttlMs = 7 * 24 * 60 * 60 * 1000
): string {
  const SECRET = getSecret();
  const payload: SessionPayload = {
    address,
    iat: Date.now(),
    exp: Date.now() + ttlMs,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  // Resolved per call rather than at import; see getSecret().
  let expected: string;
  try {
    expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  } catch {
    // No secret configured: refuse rather than fall back to a guessable key.
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    if (
      !payload.address ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getAddressFromToken(request: Request): string | null {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  return verifySessionToken(token)?.address ?? null;
}
