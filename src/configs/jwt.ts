import { SignJWT, jwtVerify } from "jose";
import { env } from "./env.js";

const issuer = env.JWT_ISSUER;
const audience = env.JWT_AUDIENCE;
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const accessTtlSeconds = Number(env.JWT_ACCESS_TTL_SECONDS || 900);

export type AccessTokenPayload = {
  sub: string;
  role?: string | null;
  email?: string | null;
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
