/** The SANTALIQ product divisions and their real status. Update when a module ships. */
export type DivisionStatus = "live" | "building" | "planned";

export const divisions: Array<{
  name: string;
  summary: string;
  status: DivisionStatus;
  href?: string;
}> = [
  { name: "Language", summary: "Translator, dictionary, keyboard, script converter", status: "live", href: "/tools" },
  { name: "AI", summary: "Grounded chat, writing help, research assistant", status: "building" },
  { name: "Write", summary: "Articles, poetry, stories and journals in Santali", status: "live", href: "/write" },
  { name: "Learn", summary: "Ol Chiki, grammar, courses and quizzes", status: "planned" },
  { name: "Voice", summary: "Text-to-speech, speech recognition, pronunciation", status: "planned" },
  { name: "Heritage", summary: "Folk stories, songs, festivals and history archive", status: "planned" },
  { name: "Social", summary: "Profiles, feed, groups and polls", status: "planned" },
  { name: "Connect", summary: "Messages, discussions and notifications", status: "planned" },
  { name: "Media", summary: "Photos, video, audio and podcasts", status: "planned" },
  { name: "News", summary: "Community and regional news", status: "planned" },
  { name: "Research", summary: "Digital library, papers and open datasets", status: "planned" },
  { name: "Studio", summary: "AI-assisted stories, scripts and voice-over", status: "planned" },
  { name: "Career", summary: "Jobs, internships and scholarships", status: "planned" },
  { name: "Market", summary: "Handmade goods, books and digital products", status: "planned" },
  { name: "Developer", summary: "Public APIs, SDKs and documentation", status: "planned" },
];
