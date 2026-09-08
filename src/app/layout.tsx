import type { Metadata } from "next";
import { Geist, Geist_Mono, Comfortaa, Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { DevBanner } from "@/components/DevBanner";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { SEO_DESCRIPTION, SEO_TITLE } from "@/lib/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Panameer brand fonts (design system): Comfortaa for display/logo, Montserrat
// for body. Exposed as CSS vars app-wide; applied on the marketing surfaces.
const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
  // 600 added for headings (brief_S / E021) — Comfortaa stops at 700, so
  // `font-extrabold` headings would otherwise be synthesised faux-bold.
  weight: ["500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

/*
  METADATA IS THE ONE PLACE "MARKETPLACE" BELONGS (WS-D).

  It is the word people TYPE INTO A SEARCH BOX, not the word the product says
  about itself — display copy positions Panameer as "Enterprise Systems + AI".
  Keeping the two apart is the whole distinction, and keeping both strings in
  lib/brand.ts beside the display copy is what stops a future edit quietly
  promoting the keyword into a headline.

  The old title said "services-procurement marketplace with ERP integration",
  which is the mechanism rather than the category anybody searches for.
*/
export const metadata: Metadata = {
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  /*
    ── ⚠⚠ THERE IS NO `icons` BLOCK HERE, AND THAT IS THE FIX (`P1-ALL-E391`) ──

    ⚠ SUPERSEDED, QUOTED NOT DELETED — this file used to declare:

        icons: {
          // WS4 — the new looped-P mark. `apple` gets the 180px padded variant: iOS
          // composites a transparent touch icon onto black, and the supplied mark is
          // 44px, so it is upscaled onto white rather than shipped bare.
          icon: "/brand/panameer-new-mark.png",
          shortcut: "/brand/panameer-new-mark.png",
          apple: "/brand/panameer-new-mark-180.png",
        },

    ⚠⚠ TWO SOURCES WERE EMITTING ICONS AND THE METADATA ONE WAS WINNING.
    MEASURED on the running app before any change — the browser received FOUR
    tags, in this order:

      1  <link rel="shortcut icon" href="/brand/panameer-new-mark.png">   ← metadata
      2  <link rel="icon" href="/favicon.ico?..." sizes="32x32">          ← src/app/favicon.ico
      3  <link rel="icon" href="/brand/panameer-new-mark.png">            ← metadata
      4  <link rel="apple-touch-icon" href="/brand/panameer-new-mark-180.png">

    Next auto-detects `src/app/favicon.ico` AND emits the explicit block, and a
    browser takes the LAST usable `rel="icon"` — tag 3. So `src/app/favicon.ico`
    existed, was served at `/favicon.ico`, and was OVERRIDDEN. ⚠⚠ THAT IS WHY A
    FAVICON "WON'T UPDATE": the file everyone edits is not the one being used.

    ⚠ SO THE FIX IS ONE SOURCE, NOT A BETTER-ORDERED TWO. Next's file conventions
    in `src/app/` are now the only declaration:

      src/app/icon.png        the tab icon    (the 32px compressed-ramp file)
      src/app/apple-icon.png  iOS home screen (the delivered 180px, already padded)
      src/app/favicon.ico     the legacy /favicon.ico request

    ⚠ AND `apple-icon` IS NEXT'S CONVENTION NAME — not `apple-touch-icon`, which
    is the HTML `rel` value Next generates FROM it. A file named
    `apple-touch-icon.png` in `src/app/` is detected as nothing at all.
  */
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${comfortaa.variable} ${montserrat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/*
          J2.4 WS-B (E021) — resolve the theme BEFORE first paint.

          The attribute this writes is what every dark rule keys off, and it has
          to be on the element before the browser paints or the user sees the
          light theme flash to dark on every navigation. That rules out doing it
          in an effect, which is why this is a raw script tag rather than a
          component. `suppressHydrationWarning` on <html> is the price: the
          server renders no attribute and the client has already added one.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      {/* `min-h-dvh` so a `flex-1` frame fills what is left under DevBanner (E020). */}
      <body className="min-h-dvh flex flex-col">
        {/*
          ABOVE THE PROVIDERS, AND ABOVE BOTH SHELLS.

          The root layout is the only mount point that covers pre-auth AND
          authenticated pages, which is what "sitewide" has to mean here — the
          marketing surface and the console have separate chrome and no other
          common ancestor. Outside <Providers> because the banner needs neither
          a session nor a theme context, and a component that renders before
          them cannot be broken by them.
        */}
        <DevBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
