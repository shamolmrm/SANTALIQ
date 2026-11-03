import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { Verify } from "./verify";

export const metadata: Metadata = { title: "Confirm email", robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="text-center font-display text-3xl font-bold tracking-tight">Confirm your email</h1>
      <Card className="mt-8">
        <Suspense>
          <Verify />
        </Suspense>
      </Card>
    </section>
  );
}
