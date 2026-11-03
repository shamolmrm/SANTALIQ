import type { MetadataRoute } from "next";
import { getSitemapPosts, SITE_URL } from "@/lib/server-api";

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
  "/ai",
  "/dataset",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getSitemapPosts();
  const authors = [...new Set(posts.map((p) => p.author_id))];
  return [
    ...STATIC.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" as const })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/write/${p.slug}`,
      lastModified: p.updated_at ?? undefined,
      changeFrequency: "monthly" as const,
    })),
    ...authors.map((id) => ({ url: `${SITE_URL}/people/${id}`, changeFrequency: "weekly" as const })),
  ];
}
