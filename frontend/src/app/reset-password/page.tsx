import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="text-center font-display text-3xl font-bold tracking-tight">Set a new password</h1>
      <Card className="mt-8">
        <Suspense>
          <ResetForm />
        </Suspense>
      </Card>
    </section>
  );
}
