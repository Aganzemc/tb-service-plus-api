import { supabase } from "../../configs/supabase.js";
import { env } from "../../configs/env.js";
import { sha256, nowIso } from "../crypto.js";

export type AdminSessionRow = {
  id: string;
  admin_id: string;
  refresh_token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  replaced_by_hash: string | null;
  created_at: string;
};

function isoPlusSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function hashRefreshToken(refreshToken: string) {
  return sha256(refreshToken);
}

export async function createAdminSession(params: { adminId: string; sid: string; refreshToken: string }) {
  const refresh_token_hash = hashRefreshToken(params.refreshToken);
  const expires_at = isoPlusSeconds(env.JWT_REFRESH_TTL_SECONDS);

  const { data, error } = await supabase
    .from("admin_sessions")
    .insert({
      id: params.sid,
      admin_id: params.adminId,
      refresh_token_hash,
      expires_at,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as AdminSessionRow;
}

export async function findValidAdminSession(params: { sid: string; adminId: string }) {
  const { data, error } = await supabase.from("admin_sessions").select("*").eq("id", params.sid).maybeSingle();
  if (error) throw error;
  const row = (data as AdminSessionRow | null) ?? null;
  if (!row) return null;
  if (row.admin_id !== params.adminId) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  return row;
}

export async function revokeAdminSessionByHash(refreshTokenHash: string) {
  const { error } = await supabase
    .from("admin_sessions")
    .update({ revoked_at: nowIso() })
    .eq("refresh_token_hash", refreshTokenHash)
    .is("revoked_at", null);

  if (error) throw error;
}

export async function rotateAdminSession(params: {
  currentSid: string;
  adminId: string;
  currentRefreshToken: string;
  nextSid: string;
  nextRefreshToken: string;
}) {
  const current = await findValidAdminSession({ sid: params.currentSid, adminId: params.adminId });
  if (!current) return null;

  const currentHash = hashRefreshToken(params.currentRefreshToken);
  if (current.refresh_token_hash !== currentHash) return null;

  const nextHash = hashRefreshToken(params.nextRefreshToken);

  const { error: updErr } = await supabase
    .from("admin_sessions")
    .update({ revoked_at: nowIso(), replaced_by_hash: nextHash })
    .eq("id", current.id)
    .is("revoked_at", null);
  if (updErr) throw updErr;

  const created = await createAdminSession({ adminId: params.adminId, sid: params.nextSid, refreshToken: params.nextRefreshToken });
  return created;
}
