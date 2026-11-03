import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="text-center font-display text-3xl font-bold tracking-tight">Join SANTALIQ</h1>
      <p className="mt-2 text-center text-muted">
        One account for contributing to the Santali dictionary — and every SANTALIQ service to come.
      </p>
      <Card className="mt-8">
        <Suspense>
          <AuthForm mode="register" />
        </Suspense>
      </Card>
    </section>
  );
}
