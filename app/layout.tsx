import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ViewTransition } from "react";
import { ChartDefs } from "@/components/charts/film-strip";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { THEME_GUARD } from "@/components/layout/theme-toggle";
import { PaletteProvider } from "@/components/search/command-palette";
import "./globals.css";

const sans = Inter({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Tollywood Analysis — Who is Tollywood's biggest hero?", template: "%s · Tollywood Analysis" },
  description: "Every Telugu film since 2000 on one timeline: heroes, directors and years, with one transparent score for every hero.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#131010" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${playfair.variable} antialiased`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_GUARD }} />
        <ChartDefs />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow">
          Skip to content
        </a>
        <PaletteProvider>
          <SiteHeader />
          <ViewTransition default="page">
            <main id="main" className="flex-1">
              {children}
            </main>
          </ViewTransition>
          <SiteFooter />
        </PaletteProvider>
      </body>
    </html>
  );
}
