import Link from "next/link";

export default function NotFound() {
  return <section className="mx-auto max-w-3xl px-5 py-12 text-white">
    <h1 className="text-3xl font-black">Page unavailable</h1>
    <p className="mt-3 text-white/75">This link may be out of date.</p>
    <Link className="mt-5 inline-flex min-h-11 items-center font-bold text-cyan-300 underline" href="/browse#search-results">Back to Browse →</Link>
  </section>;
}
