import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="text-center font-display text-3xl font-bold tracking-tight">Sign in to SANTALIQ</h1>
      <p className="mt-2 text-center text-muted">Contribute words and help verify Santali language data.</p>
      <Card className="mt-8">
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </Card>
    </section>
  );
}
