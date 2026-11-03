import { cacheLife } from "next/cache";
import type { Post, PostCard } from "@/lib/write";

/**
 * Server-side reads of PUBLIC data (no cookies) for SEO: metadata, server-rendered
 * pages and the sitemap. In production the web container reaches the API directly
 * on the Docker network; locally it is the dev FastAPI server.
 */
const INTERNAL = process.env.INTERNAL_API_URL ?? "http://localhost:8000";
export const SITE_URL = "https://santaliq.supersoftltd.com";

export type Profile = {
  id: string;
  display_name: string;
  bio: string | null;
  joined: string | null;
  published_posts: number;
  verified_entries: number;
};

export type SitemapItem = { slug: string; author_id: string; updated_at: string | null };

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${INTERNAL}/api/v1${path}`, { signal: AbortSignal.timeout(4000) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null; // API unreachable (e.g. during `next build`) — callers fall back gracefully
  }
}

export async function getPublishedPost(slug: string): Promise<Post | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  const post = await getJson<Post>(`/write/posts/${encodeURIComponent(slug)}`);
  return post?.status === "published" ? post : null;
}

export async function getProfile(id: string): Promise<Profile | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return getJson<Profile>(`/people/${id}`);
}

export async function getAuthorPosts(id: string): Promise<PostCard[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return [];
  const r = await getJson<{ items: PostCard[] }>(`/write/posts?author=${id}&limit=50`);
  return r?.items ?? [];
}

export async function getSitemapPosts(): Promise<SitemapItem[]> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 3600, expire: 86400 });
  return (await getJson<SitemapItem[]>("/write/sitemap")) ?? [];
}
