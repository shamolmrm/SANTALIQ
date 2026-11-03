import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SANTALIQ — Santali Language. AI Innovation.",
    short_name: "SANTALIQ",
    description: "Santali translator, script converter, keyboard, dictionary, learning and community.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#071B2B",
    theme_color: "#071B2B",
    lang: "en",
    categories: ["education", "reference", "books"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Translator", url: "/tools/translator" },
      { name: "Script Converter", url: "/tools/script-converter" },
      { name: "Keyboard", url: "/tools/keyboard" },
      { name: "Learn Ol Chiki", url: "/learn" },
    ],
  };
}
