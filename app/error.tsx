"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-16">
      <h1 className="font-serif text-3xl tracking-tight">Something went wrong</h1>
      <p className="mt-4 leading-relaxed text-muted">
        We couldn’t load this page. Check your internet connection and try again.
      </p>
      <div className="mt-8">
        <button type="button" className="btn btn-quiet" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
