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
  price_amount: number | null;
  currency: string | null;
  stock: number | null;
  whatsapp: string | null;
  image_urls: string[];
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

export const CURRENCIES: Array<[string, string]> = [
  ["INR", "₹ INR"],
  ["BDT", "৳ BDT"],
  ["NPR", "रु NPR"],
  ["USD", "$ USD"],
];

/** Formatted product price, e.g. ₹1,250 (falls back to the old free-text price). */
export function formatPrice(x: Pick<Listing, "price_amount" | "currency" | "price">): string | null {
  if (x.price_amount == null || !x.currency) return x.price;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: x.currency,
      maximumFractionDigits: x.price_amount % 1 ? 2 : 0,
    }).format(x.price_amount);
  } catch {
    return `${x.price_amount} ${x.currency}`;
  }
}

export function listingHref(x: Pick<Listing, "id" | "section">): string {
  return x.section === "market" ? `/market/${x.id}` : `/listings/${x.id}`;
}
