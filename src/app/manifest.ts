import type { MetadataRoute } from "next";
import { APP_NAME, COLORS } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_NAME,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    // Splash screen in the icon's green; status bar matches the white header.
    background_color: COLORS.primary,
    theme_color: COLORS.surface,
    lang: "mn",
    dir: "ltr",
    categories: ["shopping"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
