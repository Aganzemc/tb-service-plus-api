import { SignJWT, jwtVerify } from "jose";
import { env } from "./env.js";

const issuer = env.JWT_ISSUER;
const audience = env.JWT_AUDIENCE;
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const accessTtlSeconds = Number(env.JWT_ACCESS_TTL_SECONDS || 900);

const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
const refreshTtlSeconds = Number(env.JWT_REFRESH_TTL_SECONDS || 60 * 60 * 24 * 7);

export type AccessTokenPayload = {
  sub: string;
  role?: string | null;
  email?: string | null;
};

export type RefreshTokenPayload = {
  sub: string;
  sid: string;
};

export async function signAccessToken(payload: AccessTokenPayload) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    userId: payload.sub ?? null,
    role: payload.role ?? null,
    email: payload.email ?? null,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + accessTtlSeconds)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, accessSecret, {
    issuer,
    audience,
  });
  return payload;
}

export async function signRefreshToken(payload: RefreshTokenPayload) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sid: payload.sid })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + refreshTtlSeconds)
    .sign(refreshSecret);
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, refreshSecret, {
    issuer,
    audience,
  });
  return payload;
}
