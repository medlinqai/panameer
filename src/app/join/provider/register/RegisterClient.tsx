"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SellerRegistration } from "@/components/onboarding/SellerRegistration";

// Résumé · Seller · Company · Locations · Review. Finish → the dashboard. `preview` = the profile as buyers see it (server-rendered).
export function RegisterClient({ preview }: { preview: ReactNode }) {
  const router = useRouter();
  return <SellerRegistration preview={preview} onRefresh={() => router.refresh()} onDone={() => router.push("/dashboard")} onLeave={() => router.push("/dashboard")} />;
}
