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
  thumbnailUrl,
}: {
  embedUrl: string | null;
  title: string;
  instructor: { name: string; photoUrl: string | null } | null;
  /** Imported poster art — shown behind the coming-soon state. */
  thumbnailUrl?: string | null;
}) {
  const [pip, setPip] = useState(true);

  if (!embedUrl) {
    /*
      The lesson's own thumbnail, where the import found one, sits behind the
      coming-soon message. This is precisely where the art earns its keep: a
      lesson with no video is the emptiest screen in Learn, and the picture the
      author already drew for it says what the lesson is about far better than
      a grey box does.
    */
    if (thumbnailUrl) {
      // With real art, the picture carries the page and the status is a badge.
      // The first build centred the full "coming soon" paragraph over the
      // image; the artwork already says what the lesson is, and the paragraph
      // sat across the author's own typography and made both unreadable.
      return (
        <div>
          <div className="relative aspect-video w-full overflow-hidden rounded-brand border border-line bg-[#0d0a1a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-contain"
            />
            <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[12px] font-bold text-white backdrop-blur-sm">
              Coming soon
            </span>
          </div>
          <p className="mt-2 text-[13.5px] text-ink-2">
            The video isn&apos;t loaded yet — it&apos;ll play here the moment it lands.
          </p>
        </div>
      );
    }

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
