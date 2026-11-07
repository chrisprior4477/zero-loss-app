import { faqCategories, faqItems, type FaqCategory } from "./faq";

export const faqReturnKey = "zeroLossFaqReturn";
export type FaqReturn = { href: string; query: string; category: FaqCategory; expanded: string[]; scrollY: number; answer: string | null; answerTop: number };

export function readFaqReturn(state: unknown, href: string): FaqReturn | null {
  const saved = state && typeof state === "object" ? (state as Record<string, unknown>)[faqReturnKey] as Partial<FaqReturn> | undefined : undefined;
  if (!saved || saved.href !== href || typeof saved.query !== "string" || saved.query.length > 200
    || !faqCategories.some(([key]) => key === saved.category) || !Array.isArray(saved.expanded)
    || !saved.expanded.every(id => faqItems.some(item => item.id === id))
    || (saved.answer !== null && !faqItems.some(item => item.id === saved.answer))
    || typeof saved.scrollY !== "number" || !Number.isFinite(saved.scrollY) || saved.scrollY < 0
    || typeof saved.answerTop !== "number" || !Number.isFinite(saved.answerTop)) return null;
  return saved as FaqReturn;
}
