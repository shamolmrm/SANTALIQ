"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PostEditor } from "@/components/post-editor";
import { RequireSession } from "@/components/require-session";
import { Alert } from "@/components/ui";
import { api } from "@/lib/api";
import type { Post, PostCard } from "@/lib/write";

function LoadAndEdit({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Find the slug among the author's own posts, then load the full piece.
    api<PostCard[]>("/write/me/posts")
      .then((mine) => {
        const card = mine.find((p) => p.id === id);
        if (!card) throw new Error("You can only edit your own writing.");
        return api<Post>(`/write/posts/${encodeURIComponent(card.slug)}`);
      })
      .then(setPost)
      .catch((e) => setError(e.message));
  }, [id]);
  if (error) return <Alert>{error}</Alert>;
  if (!post) return <p className="text-muted">Loading…</p>;
  if (post.status === "removed") return <Alert>This piece was removed by moderators and can no longer be edited.</Alert>;
  return <PostEditor initial={post} />;
}

export function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <RequireSession>{() => <LoadAndEdit id={id} />}</RequireSession>
    </section>
  );
}
