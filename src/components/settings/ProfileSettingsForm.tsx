"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Card,
  Input,
  SaveBar,
  Select,
  ToggleRow,
  postSetting,
} from "@/components/settings/controls";

/**
 * Profile Settings (J2.4 WS-H / E015).
 *
 * NO EXPERIENCE-LEVEL PICKER (Confirm #1) and no competitor taxonomy
 * (Confirm #2) — see the page comment. The de-branding also removes "power
 * Upwork" from the AI-preference copy, which is a sentence that would have gone
 * out under Panameer's name recommending somebody else's product.
 */
type Settings = {
  paused: boolean;
  completeness: number;
  projectPreference: "ANY" | "SHORT_TERM" | "LONG_TERM" | "CONTRACT_TO_HIRE" | null;
  earningsPrivate: boolean;
  aiTrainingOptIn: boolean;
  linkedGithub: string | null;
  linkedStackoverflow: string | null;
  roles: string[];
  categories: { id: string; skill: string; role: string | null; domain: string | null }[];
};

const PREFERENCES = [
  { value: "ANY", label: "No preference" },
  { value: "SHORT_TERM", label: "Short-term projects (under 3 months)" },
  { value: "LONG_TERM", label: "Long-term engagements (3 months or more)" },
  { value: "CONTRACT_TO_HIRE", label: "Contract-to-hire" },
];

export function ProfileSettingsForm({
  settings,
  isPlus,
}: {
  settings: Settings;
  isPlus: boolean;
}) {
  const [pref, setPref] = useState(settings.projectPreference ?? "ANY");
  const [github, setGithub] = useState(settings.linkedGithub ?? "");
  const [stack, setStack] = useState(settings.linkedStackoverflow ?? "");

  return (
    <div className="space-y-4">
      <Card
        title="Visibility"
        description="Whether buyers can find you in the marketplace. Pausing hides your profile without deleting anything — your work history, packages and skills are exactly where you left them."
      >
        <ToggleRow
          label="Visible to buyers"
          hint={`Your profile is ${settings.completeness}% complete. Completeness is what earns visibility; this switch is how you turn it off deliberately.`}
          checked={!settings.paused}
          onChange={async (next) =>
            (await postSetting("/api/settings/profile", { paused: !next })) === null
          }
        />
      </Card>

      <Card
        title="Project Preference"
        description="What kind of work you'd rather take. Shown to buyers and used for matching — it never stops you bidding on anything."
      >
        <div className="max-w-md">
          <Select
            label="I'm looking for"
            value={pref}
            onChange={(e) => setPref(e.target.value as Settings["projectPreference"] & string)}
          >
            {PREFERENCES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <SaveBar
          onSave={() =>
            postSetting("/api/settings/profile", { projectPreference: pref })
          }
        />
      </Card>

      <Card
        title="Earnings Privacy"
        description="Hide what you've earned on Panameer from buyers browsing your profile. Your ratings and work history stay visible either way."
      >
        <ToggleRow
          label="Hide my earnings from buyers"
          hint="Buyers still see your rate range — this is about totals earned, not what you charge."
          checked={settings.earningsPrivate}
          disabled={!isPlus}
          disabledReason={
            isPlus ? undefined : "Included with Provider Plus."
          }
          onChange={async (next) =>
            (await postSetting("/api/settings/profile", { earningsPrivate: next })) ===
            null
          }
        />
        {!isPlus && (
          <p className="mt-3 text-[13px] text-ink-2">
            <Link
              href="/settings/membership"
              className="font-semibold text-magenta hover:underline"
            >
              See what Plus includes
            </Link>
          </p>
        )}
      </Card>

      <Card
        title="Categories"
        description="The Panameer service catalog entries you're listed under — Role → Domain → Skill. These are what buyers filter on."
      >
        {settings.categories.length === 0 ? (
          <p className="text-[14px] text-ink-2">
            You haven&apos;t picked any skills yet.
          </p>
        ) : (
          <>
            {settings.roles.length > 0 && (
              <p className="mb-3 text-[13.5px] text-ink-2">
                Roles: <b className="text-ink">{settings.roles.join(", ")}</b>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {settings.categories.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full border border-line px-3 py-1 text-[13.5px]"
                  title={[c.role, c.domain].filter(Boolean).join(" · ")}
                >
                  {c.skill}
                </span>
              ))}
            </div>
          </>
        )}
        <p className="mt-4 text-[13px] text-ink-2">
          {/*
            One editor for one dataset. The wizard's skills step filters by the
            roles you claimed and enforces the cap; a second picker here would
            have to reimplement both, and would eventually disagree.
          */}
          <Link
            href="/join/provider?step=skills&return=review"
            className="font-semibold text-magenta hover:underline"
          >
            Change your roles and skills
          </Link>
        </p>
      </Card>

      <Card
        title="Linked Accounts"
        description="Public profiles that back up what you say you can do. Usernames only — Panameer never asks for access to your repositories."
      >
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <Input
            label="GitHub"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
            placeholder="octocat"
            maxLength={200}
          />
          <Input
            label="Stack Overflow"
            value={stack}
            onChange={(e) => setStack(e.target.value)}
            placeholder="12345678"
            maxLength={200}
          />
        </div>
        <SaveBar
          onSave={() =>
            postSetting("/api/settings/profile", {
              linkedGithub: github || null,
              linkedStackoverflow: stack || null,
            })
          }
        />
      </Card>

      <Card
        title="AI Data Training"
        description="Panameer's AI reads your résumé to build your profile and writes the tests in Learn. This is about something different: whether your content may also be used to improve those models."
      >
        <ToggleRow
          label="Let Panameer use my profile content to improve its AI"
          hint="Off unless you turn it on. Turning it off later stops future use; it can't unlearn what a past model already saw, and pretending otherwise would be a lie."
          checked={settings.aiTrainingOptIn}
          onChange={async (next) =>
            (await postSetting("/api/settings/profile", { aiTrainingOptIn: next })) ===
            null
          }
        />
      </Card>
    </div>
  );
}
