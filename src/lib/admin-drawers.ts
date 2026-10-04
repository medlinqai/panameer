import { ADMIN_NAV, type NavGroup } from "@/lib/nav";

export type DrawerKey = "transactions" | "configuration";

export const DRAWER_GROUPS: Record<DrawerKey, readonly string[]> = {
  transactions: ["Transaction Data"],
  configuration: ["Configuration Data", "Support Data"],
};

export function drawerGroups(key: DrawerKey): NavGroup[] {
  return DRAWER_GROUPS[key]
    .map((title) => ADMIN_NAV.find((g) => g.title === title))
    .filter((g): g is NavGroup => !!g);
}
