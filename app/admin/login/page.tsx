import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-16">
      <h1 className="font-serif text-3xl tracking-tight">Staff sign in</h1>
      <p className="mt-2 leading-relaxed text-muted">
        Sign in to manage registration forms and export what parents have submitted.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </main>
  );
}
