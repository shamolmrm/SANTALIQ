import { Suspense } from "react";
import { ReadPost } from "./reader";

export default function ReadPostPage() {
  return (
    <Suspense fallback={<section className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</section>}>
      <ReadPost />
    </Suspense>
  );
}
