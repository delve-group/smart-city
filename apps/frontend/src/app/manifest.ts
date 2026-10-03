import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mRadar",
    short_name: "mRadar",
    description: "Report city problems and follow the response.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#FAFAFA",
    icons: [
      { src: "/brand/mradar-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/mradar-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
