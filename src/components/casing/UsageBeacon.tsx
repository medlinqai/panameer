"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// A-E001: tells the server which app this member opened (once per app per day per tab); fire-and-forget, never blocks the page.
export function UsageBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const app = pathname.split("/")[1] || "home";
    const key = `pm-usage-${app}-${new Date().toISOString().slice(0, 10)}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    const body = JSON.stringify({ path: pathname });
    if (!navigator.sendBeacon?.("/api/usage/visit", new Blob([body], { type: "application/json" })))
      fetch("/api/usage/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, [pathname]);
  return null;
}
