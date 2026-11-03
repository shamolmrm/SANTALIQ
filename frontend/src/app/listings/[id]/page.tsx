"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ListingDetail } from "@/components/listings";
import { ProductView } from "@/components/product-view";
import { Alert } from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import type { Listing } from "@/lib/listings";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const [x, setX] = useState<Listing | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    api<Listing>(`/listings/${encodeURIComponent(id)}`)
      .then(setX)
      .catch(() => setMissing(true));
  }, [id]);
  if (missing)
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Alert>{tr("This item does not exist or has not been verified yet.")}</Alert>
      </section>
    );
  if (!x) return <section className="mx-auto max-w-3xl px-4 py-16 text-muted">{tr("Loading…")}</section>;
  return x.section === "market" ? <ProductView x={x} /> : <ListingDetail x={x} />;
}

export default function ListingPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
