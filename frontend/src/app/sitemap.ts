import type { MetadataRoute } from "next";
import { getHeritageSitemap, getSitemapPosts, SITE_URL } from "@/lib/server-api";

const STATIC = [
  "",
  "/about",
  "/tools",
  "/tools/translator",
  "/tools/script-converter",
  "/tools/keyboard",
  "/tools/dictionary",
  "/write",
  "/learn",
  "/heritage",
  "/voice",
  "/ai",
  "/dataset",
  "/contact",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, heritage] = await Promise.all([getSitemapPosts(), getHeritageSitemap()]);
  const authors = [...new Set(posts.map((p) => p.author_id))];
  return [
    ...STATIC.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" as const })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/write/${p.slug}`,
      lastModified: p.updated_at ?? undefined,
      changeFrequency: "monthly" as const,
    })),
    ...heritage.map((h) => ({
      url: `${SITE_URL}/heritage/${h.slug}`,
      lastModified: h.updated_at ?? undefined,
      changeFrequency: "monthly" as const,
    })),
    ...authors.map((id) => ({ url: `${SITE_URL}/people/${id}`, changeFrequency: "weekly" as const })),
  ];
}
