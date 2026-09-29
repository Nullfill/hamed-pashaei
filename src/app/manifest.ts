import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "فیلمچی",
    short_name: "فیلمچی",
    description: "تماشای فیلم و سریال آنلاین",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#08080d",
    theme_color: "#08080d",
    lang: "fa",
    dir: "rtl",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
