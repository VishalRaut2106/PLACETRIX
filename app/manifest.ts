import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlaceTrix Educational Platform",
    short_name: "PlaceTrix",
    description: "Practice mock tests, join study groups, and track your progress with PlaceTrix.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      // You can add more icons here later for PWA support (e.g., 192x192, 512x512 PNGs)
    ],
  };
}
