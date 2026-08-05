import type { Metadata } from "next";
import { Geist, Geist_Mono, Comfortaa, Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

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

export const metadata: Metadata = {
  title: "Panameer — The services-procurement marketplace with ERP integration",
  description:
    "Hire vetted enterprise-application experts, or connect your ERP and search, request, order, and settle services without leaving your system of record.",
  icons: {
    // WS4 — the new looped-P mark. `apple` gets the 180px padded variant: iOS
    // composites a transparent touch icon onto black, and the supplied mark is
    // 44px, so it is upscaled onto white rather than shipped bare.
    icon: "/brand/panameer-new-mark.png",
    shortcut: "/brand/panameer-new-mark.png",
    apple: "/brand/panameer-new-mark-180.png",
  },
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
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
