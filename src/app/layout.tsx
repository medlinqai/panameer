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

// METADATA IS THE ONE PLACE "MARKETPLACE" BELONGS (WS-D).
export const metadata: Metadata = {
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  // THERE IS NO `icons` BLOCK HERE, AND THAT IS THE FIX
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
        {/* J2.4 WS-B (E021) — resolve the theme BEFORE first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      {/* `min-h-dvh` so a `flex-1` frame fills what is left under DevBanner (E020). */}
      <body className="min-h-dvh flex flex-col">
        {/* FIRST IN <body>, AND ABOVE BOTH SHELLS. */}
        <Providers>
          <DevBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
