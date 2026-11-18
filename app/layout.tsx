import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import { heroThumb } from "@/components/hero/hero-avatar";
import { Intro } from "@/components/home/intro";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { INTRO_GUARD } from "@/lib/intro";
import { getDashboardData } from "@/lib/repositories";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_LOCALE, SITE_NAME, SITE_TITLE, SITE_URL, THEME_COLOR } from "@/lib/seo";
import "./globals.css";

// Inter: very legible names and text, with clear, even-height figures for every number.
const sans = Inter({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["600", "700"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

/**
 * Site-wide defaults. Deliberately no `alternates.canonical` and no `openGraph.url` here: metadata merges
 * shallowly, so a root canonical of "/" would be inherited by every page that sets none and tell search
 * engines each of them is a duplicate of the home page. Every indexable page sets its own canonical and
 * OpenGraph block through `pageMetadata()` (lib/seo.ts).
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "entertainment",
  // Box-office figures such as "1,042" must not turn into phone links on iOS.
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    type: "website",
  },
  twitter: { card: "summary", title: SITE_TITLE, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
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
    <html lang="en" className={`${sans.variable} ${playfair.variable} ${jetbrains.variable} antialiased`} suppressHydrationWarning>
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
