import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_LANGUAGE, SITE_NAME, THEME_COLOR } from "@/lib/seo";

/** Web App Manifest served at /manifest.webmanifest (Next links it from every page). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME}: Telugu hero rankings, hits and flops`,
    short_name: "TollyAnalysis",
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    lang: SITE_LANGUAGE,
    dir: "ltr",
    categories: ["entertainment"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [
      { name: "Tolly Index", short_name: "Tolly Index", description: "Every ranked Telugu hero, scored out of 100", url: "/tolly-index" },
      { name: "All heroes", short_name: "Heroes", description: "Every Telugu hero and his films", url: "/heroes" },
      { name: "Compare heroes", short_name: "Compare", description: "Two to four heroes side by side", url: "/compare" },
    ],
  };
}
