import { supabase } from "../../configs/supabase.js";
import {
  DEFAULT_SITE_SETTINGS,
  SETTINGS_KEYS,
  type SettingsKey,
  type SiteSettings,
  type SiteSettingsInput,
} from "./settings.types.js";

type SettingsRow = {
  key: string;
  value: string | null;
};

function isSettingsKey(value: string): value is SettingsKey {
  return SETTINGS_KEYS.includes(value as SettingsKey);
}

function normalizeSettingValue(value: string | null | undefined) {
  if (value == null) return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function mapSettingsRows(rows: SettingsRow[] | null | undefined): SiteSettings {
  const settings: SiteSettings = { ...DEFAULT_SITE_SETTINGS };

  for (const row of rows ?? []) {
    if (!isSettingsKey(row.key)) continue;
    settings[row.key] = normalizeSettingValue(row.value);
  }

  return settings;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from("settings").select("key,value").in("key", [...SETTINGS_KEYS]);

  if (error) throw error;

  return mapSettingsRows(data);
}

export async function upsertSiteSettings(input: SiteSettingsInput) {
  const entries = (Object.entries(input) as [SettingsKey, string | null | undefined][])
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      value: normalizeSettingValue(value),
    }));

  if (entries.length === 0) {
    return {
      updated: 0,
      settings: await getSiteSettings(),
    };
  }

  const { error } = await supabase.from("settings").upsert(entries, { onConflict: "key" });

  if (error) throw error;

  return {
    updated: entries.length,
    settings: await getSiteSettings(),
  };
}
