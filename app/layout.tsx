import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Playfair_Display } from "next/font/google";
import { heroThumb } from "@/components/hero/hero-avatar";
import { Intro } from "@/components/home/intro";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { INTRO_GUARD } from "@/lib/intro";
import { getDashboardData } from "@/lib/repositories";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["600", "700"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Tollywood Analysis — Who is Tollywood's biggest hero?", template: "%s · Tollywood Analysis" },
  description:
    "Independent, transparent benchmarks of Telugu-cinema lead actors: performance, audience reception, consistency, momentum and release cadence.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ec",
  width: "device-width",
  initialScale: 1,
};

/** How many hero photos burst out of the clapperboard in the opening animation. */
const INTRO_FACES = 24;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The best-known faces first: the heroes with the most lead films that have a photo.
  const faces = (await getDashboardData()).windows.all_time
    .filter((h) => h.photo)
    .sort((a, b) => b.eligible - a.eligible)
    .slice(0, INTRO_FACES)
    .map((h) => ({ name: h.name, src: heroThumb(h.photo) as string }));
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable} ${jetbrains.variable} antialiased`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        {/* Decides before first paint whether the opening animation plays (once per session). */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_GUARD }} />
        <Intro faces={faces} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
