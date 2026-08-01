"use client";

import { useState } from "react";

/**
 * The lesson video, with the instructor picture-in-picture (WS3; design ref
 * Learn-lesson-page-design.png).
 *
 * The PIP is the teaching format, not decoration: these lessons are a screen
 * recording of Oracle Cloud with the consultant talking over it, and the design
 * shows their face inset bottom-right. Where the recording ALREADY has the
 * instructor composited in — which is how the design's own example was shot —
 * a second floating head would be a duplicate, so the inset is dismissible and
 * remembers nothing: it costs one click and never fights the video.
 *
 * NO VIDEO IS THE COMMON CASE TODAY. Every lesson in the catalog is currently
 * without a `vimeo_ref` (296 claim one they don't have), so "coming soon" is
 * the state most learners will meet. It is built as a real state — the lesson's
 * title, description and place in the run order all still render — because the
 * brief is explicit: gate playback, don't block the page.
 */
export function LessonPlayer({
  embedUrl,
  title,
  instructor,
}: {
  embedUrl: string | null;
  title: string;
  instructor: { name: string; photoUrl: string | null } | null;
}) {
  const [pip, setPip] = useState(true);

  if (!embedUrl) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-brand border border-line bg-bg-soft px-6 text-center">
        <p className="font-display text-[20px] font-bold">Coming soon</p>
        <p className="mt-2 max-w-md text-[14.5px] text-ink-2">
          This lesson is written and scheduled — the video isn&apos;t loaded yet.
          Everything else about it is below, and it&apos;ll play here the moment
          it lands.
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
            className="absolute right-1 top-1 rounded-full bg-black/55 px-1.5 text-[13px] leading-5 text-white hover:bg-black/80"
          >
            ×
          </button>
        </div>
      )}

      {!pip && instructor?.photoUrl && (
        <button
          type="button"
          onClick={() => setPip(true)}
          className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-black/80"
        >
          Show instructor
        </button>
      )}
    </div>
  );
}
