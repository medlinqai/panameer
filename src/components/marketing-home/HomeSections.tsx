import Link from "next/link";
import { HOME_SECTIONS, type HomeSection } from "@/lib/home-sections";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { LazyAutoplayVideo } from "@/components/media/LazyAutoplayVideo";
import {
  HERO_BUTTON,
  HERO_BUTTON_OUTLINE,
  HERO_GRADIENT,
  HERO_SCRIM,
} from "@/components/marketing/hero-treatment";

const INNER = "mx-auto w-full max-w-[1180px] px-[26px]";

const COL = "min-w-0";

const LABEL_WHITE = " text-white!";

const BAND_CLIPS: Record<string, string | undefined> = {
  talent: "/connect-hero.mp4",
  work: "/panameer-office-hero.mp4",
};

function Section({ s, i }: { s: HomeSection; i: number }) {
  const dark = i % 2 === 0;
  const isHero = i === 0;
  const bandClip = !isHero && dark ? BAND_CLIPS[s.key] : undefined;

  const eyebrow = dark ? "text-white" : "text-[#A61AA5]";
  const head = dark ? "text-white" : "text-[#272334]";
  const bodyc = dark ? "text-[#DDE0F0]" : "text-[#5B6183]";

  const grid = dark
    ? "min-[1151px]:grid-cols-[1.05fr_0.95fr]"
    : "min-[1151px]:grid-cols-[0.95fr_1.05fr]";

  const copy = (
    <div className={COL + (dark ? "" : " min-[1151px]:order-2")}>
      {}
      <p
        className={
          "mb-3 text-[14px] font-bold uppercase tracking-[0.12em] min-[1151px]:whitespace-nowrap min-[1151px]:tracking-[0.15em] " +
          eyebrow
        }
      >
        {s.eyebrow}
      </p>
      {}
      {isHero ? (
        <h1
          className={
            "mb-3.5 font-display text-[30px] font-bold leading-[1.2] " +
            "tracking-[-0.6px] " + head
          }
        >
          {s.headline.a}
          {s.headline.b && (
            <>
              <br />
              {s.headline.b}
            </>
          )}
        </h1>
      ) : (
        <h3
          className={
            "mb-3.5 font-display text-[30px] font-bold leading-[1.2] " +
            "tracking-[-0.6px] " + head
          }
        >
          {s.headline.a}
          {s.headline.b && (
            <>
              <br />
              {s.headline.b}
            </>
          )}
        </h3>
      )}
      {}
      {}
      <p className={"text-[15.5px] leading-[1.68] " + bodyc}>
        {s.body.replace("%s", s.ctaLabel)}
      </p>

      {}
      {}
      <div className={(isHero ? "" : "mt-[26px] ") + "flex flex-wrap gap-3"}>
        {}
        {s.ctaHref === null ? (
          <button
            type="button"
            aria-disabled="true"
            className={
              "cursor-default border-2 border-magenta bg-magenta " +
              "px-[26px] py-3.5 font-display text-[15px] font-bold text-white" + LABEL_WHITE
            }
          >
            {s.ctaLabel}
          </button>
        ) : (
          <Link
            href={s.ctaHref}
            className={
              (isHero
                ? HERO_BUTTON
                : "border-2 border-magenta bg-magenta px-[26px] py-3.5 " +
                  "font-display text-[15px] font-bold text-white transition-colors " +
                  "hover:border-magenta-dark hover:bg-magenta-dark") + LABEL_WHITE
            }
          >
            {s.ctaLabel}
          </Link>
        )}
        {/* `Learn More` → the menu page. All six exist and are public. */}
        <Link
          href={s.learnMoreHref}
          className={
            (isHero
              ? HERO_BUTTON_OUTLINE + LABEL_WHITE
              : "border-2 px-[26px] py-3.5 font-display text-[15px] " +
                "font-bold transition-colors " +
                (dark
                  ? "border-white/60 text-white hover:border-white hover:bg-white hover:text-[#272334]!" + LABEL_WHITE
                  : "border-[#272334] text-[#272334] hover:bg-[#272334] hover:text-white!"))
          }
        >
          Learn More
        </Link>
      </div>
    </div>
  );

  const media = (
    <div className={COL + (dark ? "" : " min-[1151px]:order-1")}>
      {}
      <div
        className={
          "rounded-[20px] bg-white p-6 " +
          (dark
            ? "border border-transparent shadow-[0_24px_60px_-28px_rgba(0,0,0,.7)]"
            : "border border-[#E3E6EF] shadow-[0_1px_2px_rgba(24,30,60,.05),0_18px_44px_-26px_rgba(24,30,60,.4)]")
        }
      >
        <h4 className="mb-4 font-display text-[12.5px] font-bold uppercase tracking-[0.1em] text-[#5B6183]">
          {s.chipsTitle}
        </h4>
        {s.chips.map((c, n) => (
          <div
            key={c}
            className={
              "flex items-start gap-3 py-[13px] " +
              (n === 0 ? "pt-0" : "border-t border-[#E3E6EF]")
            }
          >
            {}
            <span
              aria-hidden
              className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] border border-[#E7B9E6] bg-[#FBE7FB] text-[12px] font-bold text-[#A61AA5]"
            >
              {n + 1}
            </span>
            <span className="text-[14px] leading-[1.5] text-[#272334]">{c}</span>
          </div>
        ))}
      </div>
      {}
    </div>
  );

  return (
    <section
      id={`home-${s.key}`}
      className={
        "font-body py-[76px] " +
        (dark ? HERO_GRADIENT : "bg-[#F6F3FA]") +
        // needs a positioned ancestor, and `isolate` keeps the video and scrim
        // ALSO ON BANDS 3 AND 5 NOW — their clips are `absolute inset-0`
        (isHero || bandClip ? " relative isolate" : "")
      }
    >
      {bandClip && (
        // THE OTHER TWO PURPLE BANDS GET A CLIP
        <>
          <LazyAutoplayVideo
            src={bandClip}
            // MEASURED NUMBER. Section 3 sits only 229px below the fold at 1440
            rootMargin="100px"
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div aria-hidden className={HERO_SCRIM} />
        </>
      )}
      {isHero && (
        // THE SAME CLIP `HomeHero` PLAYS — `/consultation.mp4` — with the same
        <HeroVideoBackdrop
          src="/consultation.mp4"
          videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
          scrimClassName={HERO_SCRIM}
        />
      )}
      {/* THE RAIL IS UNCHANGED — only the BAND is full-width. `z-[2]` lifts the */}
      <div
        className={
          INNER +
          (isHero || bandClip ? " relative z-[2]" : "")
        }
      >
        <div
          className={
            "grid grid-cols-1 items-center gap-[30px] " +
            "min-[1151px]:gap-[54px] " +
            grid
          }
        >
          {/* DOM ORDER IS ALWAYS copy -> media */}
          {copy}
          {media}
        </div>
      </div>
    </section>
  );
}

export function HomeSections() {
  return (
    <>
      {HOME_SECTIONS.map((s, i) => (
        <Section key={s.key} s={s} i={i} />
      ))}
    </>
  );
}
