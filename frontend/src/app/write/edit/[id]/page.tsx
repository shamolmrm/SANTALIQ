import { Suspense } from "react";
import { EditPostPage } from "./editor-page";

export default function EditPage() {
  return (
    <Suspense fallback={<section className="mx-auto max-w-6xl px-4 py-12 text-muted">Loading…</section>}>
      <EditPostPage />
    </Suspense>
  );
}
