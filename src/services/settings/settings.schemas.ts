import { z } from "zod";

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const optionalNullableText = (max: number) => z.string().max(max).nullable().optional();

const optionalNullableUrl = z
  .string()
  .max(2000)
  .nullable()
  .optional()
  .refine((value) => value == null || isHttpUrl(value), {
    message: "Must be a valid http(s) URL",
  });

const optionalNullableLogo = z
  .string()
  .max(4_000_000)
  .nullable()
  .optional()
  .refine((value) => value == null || value.startsWith("data:image/") || isHttpUrl(value), {
    message: "Must be a valid logo URL or image data URL",
  });

export const SettingsUpsertSchema = z
  .object({
    business_address: optionalNullableText(500),
    contact_phone: optionalNullableText(60),
    whatsapp_phone: optionalNullableText(60),
    contact_email: z.string().email().max(320).nullable().optional(),
    facebook_url: optionalNullableUrl,
    instagram_url: optionalNullableUrl,
    tiktok_url: optionalNullableUrl,
    linkedin_url: optionalNullableUrl,
    logo_url: optionalNullableLogo,
  })
  .strict();
