import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-void px-8 text-center">
      <p className="label mb-6">404</p>
      <h1 className="text-display text-4xl font-semibold tracking-tight sm:text-6xl">
        Nothing plays here.
      </h1>
      <Link href="/" className="label mt-10 hover:text-ink">
        Back to the start
      </Link>
    </main>
  );
}
