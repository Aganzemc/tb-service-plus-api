import bcrypt from "bcryptjs";
import { supabase } from "../../configs/supabase.js";
import { normalizeEmail } from "../crypto.js";
import type { AdminRow } from "./admin.types.js";

export async function findAdminByEmail(email: string) {
  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  if (error) throw error;
  return (data as AdminRow | null) ?? null;
}

export async function findAdminById(id: string) {
  const { data, error } = await supabase.from("admins").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as AdminRow | null) ?? null;
}

export async function verifyAdminPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function hashAdminPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function createAdmin(params: { email: string; password: string; role: string }) {
  const password_hash = await hashAdminPassword(params.password);

  const { data, error } = await supabase
    .from("admins")
    .insert({
      email: normalizeEmail(params.email),
      password_hash,
      role: params.role,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as AdminRow;
}

export async function updateAdmin(
  id: string,
  patch: { email?: string; password?: string; role?: string }
) {
  const update: any = {};
  if (patch.email !== undefined) update.email = normalizeEmail(patch.email);
  if (patch.role !== undefined) update.role = patch.role;
  if (patch.password !== undefined) update.password_hash = await hashAdminPassword(patch.password);

  const { data, error } = await supabase.from("admins").update(update).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return (data as AdminRow | null) ?? null;
}
