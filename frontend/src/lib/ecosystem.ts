/** The SANTALIQ product divisions and their real status. Update when a module ships. */
export type DivisionStatus = "live" | "building" | "planned";

export const divisions: Array<{
  name: string;
  summary: string;
  status: DivisionStatus;
  href?: string;
}> = [
  { name: "Language", summary: "Translator, dictionary, keyboard, script converter", status: "live", href: "/tools" },
  { name: "AI", summary: "Grounded assistant with sources, writing help", status: "live", href: "/ai" },
  { name: "Write", summary: "Articles, poetry, stories and journals in Santali", status: "live", href: "/write" },
  { name: "Learn", summary: "Ol Chiki alphabet and quizzes; courses next", status: "live", href: "/learn" },
  { name: "Voice", summary: "Consented voice collection now; TTS and speech recognition next", status: "building", href: "/voice" },
  { name: "Heritage", summary: "Folk stories, songs, festivals and history archive", status: "live", href: "/heritage" },
  { name: "Social", summary: "Profiles, follow, comments, feed and groups", status: "live", href: "/groups" },
  { name: "Connect", summary: "Private messages and notifications", status: "live", href: "/messages" },
  { name: "Media", summary: "Photos, videos, podcasts and music", status: "live", href: "/media" },
  { name: "News", summary: "Community and regional news", status: "live", href: "/news" },
  { name: "Research", summary: "Open Santali dataset and digital library", status: "live", href: "/library" },
  { name: "Studio", summary: "AI-assisted stories, scripts and voice-over", status: "planned" },
  { name: "Career", summary: "Jobs, internships and scholarships", status: "live", href: "/careers" },
  { name: "Market", summary: "Handmade goods, books and digital products", status: "live", href: "/market" },
  { name: "Developer", summary: "Public APIs, SDKs and documentation", status: "live", href: "/developers" },
];
