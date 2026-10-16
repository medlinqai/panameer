"use client";

import { useState } from "react";
import { Field, TextInput } from "@/components/onboarding/controls";
import { PhoneField } from "@/components/onboarding/PhoneField";
import { Avatar } from "@/components/Avatar";
import { PhotoCropModal } from "@/components/onboarding/PhotoCropModal";
import { isPhoneComplete } from "@/lib/phone";

// "Who Is Buying?" / "Who Is Selling?" (SO-E003): one set of fields for both sides — name, title, photo, phone.
export type PersonValues = { firstName: string; lastName: string; title: string; photoUrl: string | null; phone: string };

// Sellers skip Title here — it comes from the résumé in Get Found (asked there if the résumé has none).
export const personComplete = (v: PersonValues, phoneCountry: string | null, { title = true }: { title?: boolean } = {}) =>
  !!v.firstName.trim() && !!v.lastName.trim() && !!v.photoUrl && (!title || !!v.title.trim()) && isPhoneComplete(v.phone, phoneCountry);

export function PersonFields({
  values,
  onChange,
  phoneCountry,
  onPhoneCountry,
  titleHint,
  titlePlaceholder,
  photoLine,
  showTitle = true,
}: {
  values: PersonValues;
  onChange: (patch: Partial<PersonValues>) => void;
  phoneCountry: string | null;
  onPhoneCountry: (c: string | null) => void;
  titleHint: string;
  titlePlaceholder: string;
  photoLine: string;
  showTitle?: boolean;
}) {
  const [photoModal, setPhotoModal] = useState(false);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First Name *">
          <TextInput value={values.firstName} onChange={(e) => onChange({ firstName: e.target.value })} autoComplete="given-name" />
        </Field>
        <Field label="Last Name *">
          <TextInput value={values.lastName} onChange={(e) => onChange({ lastName: e.target.value })} autoComplete="family-name" />
        </Field>
      </div>
      {showTitle && (
        <Field label="Title *" hint={titleHint}>
          <TextInput value={values.title} onChange={(e) => onChange({ title: e.target.value })} placeholder={titlePlaceholder} autoComplete="organization-title" />
        </Field>
      )}
      <div className="flex flex-col items-center gap-5 border border-line p-6 sm:flex-row sm:items-center sm:text-left">
        <Avatar firstName={values.firstName} lastName={values.lastName} photoUrl={values.photoUrl} size={96} />
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-ink">Your Photo *</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{photoLine}</p>
          <button type="button" onClick={() => setPhotoModal(true)} className="mt-3 border border-ink bg-surface px-4 py-2 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-hover">
            {values.photoUrl ? "Change Photo" : "Add a Photo"}
          </button>
        </div>
      </div>
      <div className="grid gap-3">
        <PhoneField value={values.phone} onChange={(next) => onChange({ phone: next })} country={phoneCountry} onCountryChange={onPhoneCountry} />
      </div>
      {/* `onUploaded` fires only after /api/profile/photo has saved it. */}
      <PhotoCropModal open={photoModal} onClose={() => setPhotoModal(false)} onUploaded={(photoUrl) => onChange({ photoUrl })} />
    </>
  );
}
