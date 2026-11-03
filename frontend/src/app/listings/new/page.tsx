"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ListingFormPage } from "@/components/listings";
import type { Section } from "@/lib/listings";

function Inner() {
  const s = useSearchParams().get("section");
  const section: Section = s === "media" || s === "library" ? s : "market";
  return <ListingFormPage section={section} />;
}

export default function NewListingPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
