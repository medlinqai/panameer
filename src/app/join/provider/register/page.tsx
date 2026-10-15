"use client";

import { useRouter } from "next/navigation";
import { SellerRegistration } from "@/components/onboarding/SellerRegistration";

// SO-E003: Who Is Selling? · Company · Locations · Review. Finish → the dashboard (SO-E004), as buyers.
export default function SellerRegisterPage() {
  const router = useRouter();
  return <SellerRegistration onDone={() => router.push("/dashboard")} onLeave={() => router.push("/dashboard")} />;
}
