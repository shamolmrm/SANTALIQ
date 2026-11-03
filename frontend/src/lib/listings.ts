import type { Status } from "@/lib/api";

export type Section = "market" | "media" | "library";

export type Listing = {
  id: string;
  section: Section;
  category: string;
  title: string;
  description: string;
  url: string | null;
  contact: string | null;
  price: string | null;
  location: string | null;
  credit: string | null;
  image_url: string | null;
  status: Status;
  created_at: string | null;
  posted_by: string | null;
  posted_by_id: string | null;
  review_note: string | null;
};

/** English labels; pages translate them with tr(). */
export const SECTIONS: Record<
  Section,
  { href: string; eyebrow: string; title: string; lead: string; cta: string; categories: Array<[string, string]> }
> = {
  market: {
    href: "/market",
    eyebrow: "SANTALIQ Market",
    title: "Handmade goods, books and more from Santali makers.",
    lead: "Buy directly from the maker. SANTALIQ does not handle money: contact the seller yourself and agree on payment and delivery.",
    cta: "Sell something",
    categories: [
      ["handmade", "Handmade"],
      ["clothing", "Clothing"],
      ["books", "Books"],
      ["art", "Art"],
      ["food", "Food"],
      ["digital", "Digital"],
      ["other", "Other"],
    ],
  },
  media: {
    href: "/media",
    eyebrow: "SANTALIQ Media",
    title: "Santali photos, videos, podcasts and music.",
    lead: "Photos are shared here; videos and audio play from YouTube, SoundCloud and similar sites. Every item is checked by a reviewer.",
    cta: "Share media",
    categories: [
      ["photo", "Photos"],
      ["video", "Videos"],
      ["podcast", "Podcasts"],
      ["music", "Music"],
      ["other", "Other"],
    ],
  },
  library: {
    href: "/library",
    eyebrow: "SANTALIQ Research · Digital library",
    title: "Books, papers and archives about Santali.",
    lead: "A reviewed catalogue of resources for learners and researchers, with links to where they are legally available.",
    cta: "Add a resource",
    categories: [
      ["book", "Books"],
      ["paper", "Papers"],
      ["thesis", "Theses"],
      ["archive", "Archives"],
      ["dictionary", "Dictionaries"],
      ["other", "Other"],
    ],
  },
};

export function categoryLabel(section: Section, value: string): string {
  return SECTIONS[section].categories.find(([v]) => v === value)?.[1] ?? value;
}

/** YouTube links become privacy-friendly embeds; anything else stays a link. */
export function youtubeEmbed(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}
