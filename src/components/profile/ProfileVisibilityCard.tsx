"use client";

import { useState } from "react";
import { ToggleRow, postSetting } from "@/components/settings/controls";
import { visibilityHelp } from "@/lib/visibility-copy";

export function ProfileVisibilityCard({
  paused,
  previewHidden = false,
  publicName = false,
  publicUrl = null,
}: {
  paused: boolean;
  previewHidden?: boolean;
  publicName?: boolean;
  publicUrl?: string | null;
}) {
  const [visible, setVisible] = useState(!paused);
  const [preview, setPreview] = useState(!previewHidden);
  const [named, setNamed] = useState(publicName);
  return (
    <section className="pm-rail-visibility pm-side mt-7 border-t border-line pt-5">
      <h4 className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Visibility
      </h4>
      <ToggleRow
        label="Visible to buyers"
        checked={!paused}
        tone="ink"
        onValueChange={setVisible}
        onChange={async (next) =>
          (await postSetting("/api/settings/profile", { paused: !next })) === null
        }
      />
      {}
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
        {visibilityHelp(visible)}
      </p>

      {}
      <div className="mt-4 border-t border-line pt-4">
        <ToggleRow
          label="Show My Masked Preview to Visitors"
          checked={!previewHidden}
          tone="ink"
          onValueChange={(next) => setPreview(next)}
          onChange={async (next) =>
            (await postSetting("/api/settings/profile", {
              previewHidden: !next,
            })) === null
          }
        />
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
          {}
          {preview
            ? "People who are not signed in can see your title, skills, certifications and the shape of your work history \u2014 never your name, photo, employers, clients, rates or contact details. Turning this off removes you from Browse Talent."
            : "You are not shown to people who are signed out. Share links to your profile show a \u201cnot available\u201d page. Nothing has been deleted."}
        </p>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <ToggleRow
          label="Public Profile with My Name"
          checked={publicName}
          tone="ink"
          onValueChange={(next) => setNamed(next)}
          onChange={async (next) =>
            (await postSetting("/api/settings/profile", { publicName: next })) === null
          }
        />
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
          {}
          {named
            ? "Your personal link below shows your name, photo and employers to anyone, and search engines may list it. Your rates and contact details still need a free sign-up, and client names stay hidden."
            : "Your personal link below shows the masked preview instead of your name. Turn this on if you want to use it in an email signature."}
        </p>
      </div>

      {}
      {publicUrl && <PublicLinkRow url={publicUrl} />}
    </section>
  );
}

function PublicLinkRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 border-t border-line pt-4">
      <h4 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Your Public Link
      </h4>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="Your public profile link"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-[4px] border border-line bg-bg-soft px-2.5 py-1.5 text-[12.5px] text-ink-2"
        />
        <button
          type="button"
          className="shrink-0 border border-ink px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-bg-soft"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              const el = document.querySelector<HTMLInputElement>(
                'input[aria-label="Your public profile link"]'
              );
              el?.select();
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
