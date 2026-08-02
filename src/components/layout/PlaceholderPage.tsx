import { PageContainer } from "@/components/layout/PageContainer";

type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export function PlaceholderPage({
  title,
  description = "This page is route scaffolding for the application shell. Content will arrive in a later release.",
}: PlaceholderPageProps) {
  return (
    <PageContainer>
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        Placeholder
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
        {description}
      </p>
    </PageContainer>
  );
}
