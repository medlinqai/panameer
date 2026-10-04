"use client";

import { useRouter } from "next/navigation";
import { AiPassPanel } from "@/components/onboarding/AiPassPanel";
import { ResumeImportAction } from "@/components/onboarding/ResumeImportAction";

export function OwnerAiPass() {
  const router = useRouter();
  return (
    <AiPassPanel
      compact
      heading="No work history on your profile yet"
      reasons={[
        "If you uploaded a résumé, our reader may have missed a layout it couldn't follow. We can have another go at it.",
      ]}
      onUpload={() => router.push("/join/provider?step=tell_us&return=review")}
      onManual={() => router.push("/join/provider?step=tell_us&return=review")}
      onApplied={() => router.refresh()}
    />
  );
}

export function OwnerResumeImport() {
  const router = useRouter();
  return <ResumeImportAction onApplied={() => router.refresh()} />;
}

export function OwnerResumeRerun() {
  const router = useRouter();
  return (
    <ResumeImportAction
      label="Update from my résumé"
      showContext
      onApplied={() => router.refresh()}
    />
  );
}
