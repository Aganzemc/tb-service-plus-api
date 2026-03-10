export const SETTINGS_KEYS = [
  "business_address",
  "contact_phone",
  "whatsapp_phone",
  "contact_email",
  "facebook_url",
  "instagram_url",
  "tiktok_url",
  "linkedin_url",
  "logo_url",
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export type SiteSettings = Record<SettingsKey, string | null>;

export type SiteSettingsInput = Partial<SiteSettings>;

export type SiteSettingsHistoryValueMap = Partial<Record<SettingsKey, string | null>>;

export type SiteSettingsHistoryEntry = {
  id: string;
  changed_at: string;
  changed_by_admin_id: string | null;
  changed_by_email: string | null;
  changed_keys: SettingsKey[];
  previous_values: SiteSettingsHistoryValueMap;
  next_values: SiteSettingsHistoryValueMap;
};

export const SETTINGS_HISTORY_PREFIX = "settings_history::";

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  business_address: null,
  contact_phone: null,
  whatsapp_phone: null,
  contact_email: null,
  facebook_url: null,
  instagram_url: null,
  tiktok_url: null,
  linkedin_url: null,
  logo_url: null,
};
