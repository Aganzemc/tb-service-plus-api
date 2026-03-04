import crypto from "crypto";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function nowIso() {
  return new Date().toISOString();
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
