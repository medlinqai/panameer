import Link from "next/link";

/**
 * THE SELLER HUB (E074, Create primer).
 *
 * One seller in the middle, the seven things they can make radiating out. The
 * claim is that "Create" on this platform is not only delivery work, and a list
 * would not make that point — the point IS that they all come from the same
 * person.
 *
 * FLOW LAYOUT, NOT ABSOLUTE POSITIONING. The mock places each spoke with
 * `left:8%; top:2%` inside a fixed 520px box, which is fine for a mock and
 * brittle in production: it breaks the moment a label wraps, a font loads late,
 * or someone zooms. This is three wrapped rows — spokes, hub, spokes — so the
 * rings centre themselves on whatever they contain, there are no magic numbers,
 * and it reflows on a phone without a media query repositioning anything.
 *
 * A SERVER COMPONENT and passed into the carousel as a prop, so none of it
 * reaches the client bundle.
 *
 * ⚠ ONE SPOKE IS A LINK; SIX ARE NOT. "Courses" goes to /learn, which is a real
 * public catalogue. The rest describe capabilities whose public pages do not
 * exist yet, so they are plain text — a marketing diagram is not a reason to
 * invent a destination, and every one of them would have had to point at a
 * login wall, which `/` is specifically not supposed to do (E077).
 */

type Spoke = { label: string; href?: string };

const SPOKES: Spoke[] = [
  { label: "Courses", href: "/learn" },
  { label: "Support" },
  { label: "Forums" },
  { label: "Implementations" },
  { label: "Mentoring" },
  { label: "Packages" },
  { label: "Consultations" },
];

function SpokeFigure({ label }: { label: string }) {
  return (
    <>
      <div aria-hidden>
        <div className="mx-auto h-8 w-8 rounded-full bg-[#2c2740]" />
        <div className="mx-auto mt-1 h-9 w-[68px] rounded-t-[34px] rounded-b-[8px] bg-[#2c2740]" />
      </div>
      <p className="mt-1.5 text-[13.5px] font-bold text-ink">{label}</p>
    </>
  );
}

export function SellerHub() {
  return (
    <div className="mx-auto max-w-[760px]">
      {/*
        FLEX-WRAP, NOT A FIXED GRID. A 4-column grid left-aligns the top ring —
        three spokes fill columns 1-3 and leave a hole under column 4, so the
        ring sits off-centre from the hub it is supposed to surround. Wrapping
        centres each row on its own count, which is what a radial diagram needs
        when the two rings are 3 and 4.
      */}
      <ul className="flex flex-wrap justify-center gap-x-6 gap-y-7 sm:gap-x-10">
        {SPOKES.slice(0, 3).map((s) => (
          <li key={s.label} className="w-[112px] text-center">
            {s.href ? (
              <Link
                href={s.href}
                className="block rounded-brand py-1 transition-colors hover:text-magenta"
              >
                <SpokeFigure label={s.label} />
              </Link>
            ) : (
              <SpokeFigure label={s.label} />
            )}
          </li>
        ))}

        {/*
          THE SELLER SITS BETWEEN THE TWO RINGS. `w-full` forces a line break
          either side of it, so it is always alone on its row — which is what
          makes it read as the hub rather than as an eighth spoke. On a phone
          the spokes wrap to two or three per row around it; a radial diagram at
          375px is a list whatever you do to it.
        */}
        <li className="w-full py-2 text-center">
          <div aria-hidden>
            <div className="mx-auto h-12 w-12 rounded-full bg-magenta" />
            <div className="mx-auto mt-1.5 h-16 w-[104px] rounded-t-[52px] rounded-b-[12px] bg-magenta" />
          </div>
          <p className="mt-2.5 text-[16px] font-extrabold text-ink">Service Seller</p>
        </li>

        {SPOKES.slice(3).map((s) => (
          <li key={s.label} className="w-[112px] text-center">
            {s.href ? (
              <Link
                href={s.href}
                className="block rounded-brand py-1 transition-colors hover:text-magenta"
              >
                <SpokeFigure label={s.label} />
              </Link>
            ) : (
              <SpokeFigure label={s.label} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
