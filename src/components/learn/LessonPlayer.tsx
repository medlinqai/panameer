"use client";

import { useState } from "react";

export function LessonPlayer({
  embedUrl,
  title,
  instructor,
  thumbnailUrl,
  stateLabel = "Not published yet",
}: {
  embedUrl: string | null;
  title: string;
  instructor: { name: string; photoUrl: string | null } | null;
  /** Imported poster art — shown behind the unplayable state. */
  thumbnailUrl?: string | null;
  stateLabel?: string;
}) {
  const [pip, setPip] = useState(true);

  if (!embedUrl) {
    if (thumbnailUrl) {
      // With real art, the picture carries the page and the status is a badge.
      return (
        <div>
          <div className="relative aspect-video w-full overflow-hidden rounded-brand border border-line bg-[#0d0a1a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-contain"
            />
            {}
            <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[12px] font-bold text-white backdrop-blur-sm">
              {stateLabel}
            </span>
          </div>
          {}
          <p className="mt-2 text-[13.5px] text-ink-2">
            There is no video for this lesson yet. Everything else about it is below.
          </p>
        </div>
      );
    }

    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-brand border border-line bg-bg-soft px-6 text-center">
        {}
        <p className="font-display text-[20px] font-bold">{stateLabel}</p>
        <p className="mt-2 max-w-md text-[14.5px] text-ink-2">
          There is no video for this lesson yet. Everything else about it is below.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-brand border border-line bg-black">
      <div className="aspect-video w-full">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>

      {pip && instructor?.photoUrl && (
        <div className="absolute bottom-3 right-3 w-[22%] min-w-[96px] max-w-[190px] overflow-hidden rounded-[10px] border-2 border-white/80 shadow-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={instructor.photoUrl}
            alt={instructor.name}
            className="aspect-[4/3] w-full object-cover object-top"
          />
          <button
            type="button"
            onClick={() => setPip(false)}
            aria-label={`Hide ${instructor.name}`}
            title="Hide"
            className="absolute right-1 top-1 bg-black/55 px-1.5 text-[13px] leading-5 text-white hover:bg-black/80"
          >
            ×
          </button>
        </div>
      )}

      {!pip && instructor?.photoUrl && (
        <button
          type="button"
          onClick={() => setPip(true)}
          className="absolute bottom-3 right-3 bg-black/55 px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-black/80"
        >
          Show Instructor
        </button>
      )}
    </div>
  );
}
