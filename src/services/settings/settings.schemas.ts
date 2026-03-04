import { z } from "zod";

export const SettingsUpsertSchema = z.record(z.string(), z.string().nullable());
