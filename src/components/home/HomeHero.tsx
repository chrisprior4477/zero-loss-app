export function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(165deg,var(--surface-elevated)_0%,var(--surface)_48%,var(--background)_100%)] px-4 py-6 sm:px-8 sm:py-7 lg:px-10 lg:py-8"
    >
      <h1
        id="home-hero-heading"
        className="max-w-xl text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl lg:text-[2rem] lg:leading-tight"
      >
        Shopping should never feel like losing.
      </h1>
    </section>
  );
}
