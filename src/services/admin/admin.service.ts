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

export async function verifyAdminPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
