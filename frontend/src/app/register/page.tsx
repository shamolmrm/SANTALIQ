import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui";
import { T } from "@/lib/i18n";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="text-center font-display text-3xl font-bold tracking-tight"><T k="auth.registerTitle" /></h1>
      <p className="mt-2 text-center text-muted">
        <T k="auth.registerLead" />
      </p>
      <Card className="mt-8">
        <Suspense>
          <AuthForm mode="register" />
        </Suspense>
      </Card>
    </section>
  );
}
