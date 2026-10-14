import { cache } from "react";
import { prisma } from "@/lib/prisma";

// GT-E001: platform switches (Admin › Settings). A missing row = the default.
export const SETTINGS = {
  taxonomy_v2: { label: "Global Taxonomy (v2)", help: "Off = today's screens exactly. On = the seller skills step asks How you work · What you know · In which system, and Shop › Services filters by them.", default: false },
} as const;
export type SettingKey = keyof typeof SETTINGS;

export async function getSetting(key: SettingKey): Promise<boolean> {
  // Local walks only (never in production): TAXONOMY_V2_FORCE=1 tests the "on" paths without flipping the shared switch.
  if (key === "taxonomy_v2" && process.env.TAXONOMY_V2_FORCE === "1" && process.env.NODE_ENV !== "production") return true;
  const row = await prisma.platformSetting.findUnique({ where: { key } }).catch(() => null);
  return typeof row?.value === "boolean" ? row.value : SETTINGS[key].default;
}

export async function setSetting(key: SettingKey, value: boolean, userId: string | null) {
  await prisma.platformSetting.upsert({ where: { key }, create: { key, value, updated_by: userId }, update: { value, updated_by: userId } });
}

/** GT-E001: is the Global Taxonomy on? Every new screen/path checks this; off = today's app. */
export const taxonomyV2 = cache(() => getSetting("taxonomy_v2"));
