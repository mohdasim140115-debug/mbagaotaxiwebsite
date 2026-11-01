import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "../db/client";
import {
  DEFAULT_SETTINGS,
  PRIVATE_SETTING_KEYS,
  settingsSchema,
  type PublicSettings,
  type SiteSettings,
} from "@/lib/cms/settings-def";

export const CMS_TAG = "cms";

/** Full settings (server-only, includes private keys). Not cached: used by admin and enquiry handling. */
export async function getAllSettings(): Promise<SiteSettings> {
  const rows = await db.select().from(schema.siteSettings);
  const raw: Record<string, unknown> = {};
  for (const r of rows) raw[r.key] = r.value;
  const parsed = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...raw });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  "use cache";
  cacheTag(CMS_TAG);
  cacheLife("max");
  const all = await getAllSettings();
  const copy: Record<string, unknown> = { ...all };
  for (const k of PRIVATE_SETTING_KEYS) delete copy[k];
  return copy as PublicSettings;
}

export async function saveSettings(values: SiteSettings, userId: number) {
  const entries = Object.entries(values) as [keyof SiteSettings, unknown][];
  await db.transaction(async (tx) => {
    for (const [key, value] of entries) {
      const isPublic = !(PRIVATE_SETTING_KEYS as readonly string[]).includes(key);
      await tx
        .insert(schema.siteSettings)
        .values({ key, value, isPublic, updatedBy: userId })
        .onDuplicateKeyUpdate({ set: { value, isPublic, updatedBy: userId } });
    }
  });
}
