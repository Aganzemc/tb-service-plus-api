import { randomUUID } from "node:crypto";
import { supabase } from "../../configs/supabase.js";
import { buildPaginationMeta, type PaginationRequest } from "../common/pagination.js";
import {
  DEFAULT_SITE_SETTINGS,
  SETTINGS_HISTORY_PREFIX,
  SETTINGS_KEYS,
  type SettingsKey,
  type SiteSettingsHistoryEntry,
  type SiteSettingsHistoryValueMap,
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

function sanitizeHistoryValue(value: string | null) {
  if (!value) return null;

  if (value.startsWith("data:image/")) {
    return "[uploaded image data]";
  }

  return value;
}

function pickChangedValues(settings: SiteSettings, keys: SettingsKey[]): SiteSettingsHistoryValueMap {
  return keys.reduce<SiteSettingsHistoryValueMap>((acc, key) => {
    acc[key] = sanitizeHistoryValue(settings[key]);
    return acc;
  }, {});
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

async function appendSettingsHistory(options: {
  previous: SiteSettings;
  next: SiteSettings;
  changedKeys: SettingsKey[];
  actor?: {
    adminId?: string | null;
    email?: string | null;
  };
}) {
  if (options.changedKeys.length === 0) {
    return null;
  }

  const changedAt = new Date().toISOString();
  const historyEntry: SiteSettingsHistoryEntry = {
    id: `${SETTINGS_HISTORY_PREFIX}${changedAt}::${randomUUID()}`,
    changed_at: changedAt,
    changed_by_admin_id: options.actor?.adminId ?? null,
    changed_by_email: options.actor?.email ?? null,
    changed_keys: options.changedKeys,
    previous_values: pickChangedValues(options.previous, options.changedKeys),
    next_values: pickChangedValues(options.next, options.changedKeys),
  };

  const { error } = await supabase.from("settings").insert({
    key: historyEntry.id,
    value: JSON.stringify(historyEntry),
  });

  if (error) {
    throw error;
  }

  return historyEntry;
}

function isHistoryEntry(value: unknown): value is SiteSettingsHistoryEntry {
  if (!value || typeof value !== "object") return false;

  const maybe = value as Partial<SiteSettingsHistoryEntry>;

  return (
    typeof maybe.id === "string" &&
    typeof maybe.changed_at === "string" &&
    Array.isArray(maybe.changed_keys) &&
    typeof maybe.previous_values === "object" &&
    typeof maybe.next_values === "object"
  );
}

function parseHistoryRows(rows: SettingsRow[] | null | undefined) {
  return (rows ?? [])
    .map((row) => {
      if (!row.value) return null;

      try {
        const parsed = JSON.parse(row.value) as unknown;
        return isHistoryEntry(parsed) ? parsed : null;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is SiteSettingsHistoryEntry => entry !== null);
}

export async function listSiteSettingsHistory(pagination: PaginationRequest) {
  let query = supabase
    .from("settings")
    .select("key,value", { count: "exact" })
    .like("key", `${SETTINGS_HISTORY_PREFIX}%`)
    .order("key", { ascending: false });
  let currentPage = 1;
  let currentPageSize = 1;

  if (!pagination.all) {
    query = query.range(pagination.from, pagination.to);
    currentPage = pagination.page;
    currentPageSize = pagination.pageSize;
  }

  const { data, error, count } = await query;

  if (error) throw error;

  const history = parseHistoryRows(data);
  const total = pagination.all ? history.length : count ?? history.length;
  if (pagination.all) {
    currentPageSize = Math.max(1, history.length || 1);
  }

  const meta = buildPaginationMeta(total, currentPage, currentPageSize);

  return {
    history,
    ...meta,
  };
}

export async function upsertSiteSettings(
  input: SiteSettingsInput,
  actor?: {
    adminId?: string | null;
    email?: string | null;
  },
) {
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
      historyEntry: null,
    };
  }

  const previousSettings = await getSiteSettings();
  const { error } = await supabase.from("settings").upsert(entries, { onConflict: "key" });

  if (error) throw error;

  const nextSettings = await getSiteSettings();
  const changedKeys = entries
    .map((entry) => entry.key)
    .filter((key) => previousSettings[key] !== nextSettings[key]);
  const historyEntry = await appendSettingsHistory({
    previous: previousSettings,
    next: nextSettings,
    changedKeys,
    actor,
  });

  return {
    updated: entries.length,
    settings: nextSettings,
    historyEntry,
  };
}
