"use client";

import { PostEditor } from "@/components/post-editor";
import { RequireSession } from "@/components/require-session";

export default function NewPostPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <RequireSession>{() => <PostEditor />}</RequireSession>
    </section>
  );
}
