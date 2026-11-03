"use client";

import { useEffect, useState } from "react";
import { ProductView } from "@/components/product-view";
import { Alert } from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import type { Listing } from "@/lib/listings";

/** Server-rendered for search engines; refreshed in the browser (sellers see pending items). */
export function ProductPage({ id, initial }: { id: string; initial: Listing | null }) {
  const [x, setX] = useState<Listing | null>(initial);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    api<Listing>(`/listings/${encodeURIComponent(id)}`)
      .then(setX)
      .catch(() => setMissing(true));
  }, [id]);
  if (missing && !x)
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Alert>{tr("This item does not exist or has not been verified yet.")}</Alert>
      </section>
    );
  if (!x) return <section className="mx-auto max-w-6xl px-4 py-16 text-muted">{tr("Loading…")}</section>;
  return <ProductView x={x} />;
}
