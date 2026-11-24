import { faqCategories, faqItems, type FaqCategory } from "./faq";

export const faqReturnKey = "zeroLossFaqReturn";
export type FaqReturn = { href: string; query: string; category: FaqCategory; expanded: string[]; collapsed?: string[]; scrollY: number; answer: string | null; answerTop: number; answerLink?: string };

export function readFaqReturn(state: unknown, href: string): FaqReturn | null {
  const saved = state && typeof state === "object" ? (state as Record<string, unknown>)[faqReturnKey] as Partial<FaqReturn> | undefined : undefined;
  if (!saved || saved.href !== href || typeof saved.query !== "string" || saved.query.length > 200
    || !faqCategories.some(([key]) => key === saved.category) || !Array.isArray(saved.expanded)
    || !saved.expanded.every(id => typeof id === "string")
    || (saved.collapsed !== undefined && (!Array.isArray(saved.collapsed) || !saved.collapsed.every(id => typeof id === "string")))
    || (saved.answer !== null && typeof saved.answer !== "string")
    || (saved.answerLink !== undefined && (typeof saved.answerLink !== "string" || saved.answerLink.length > 2048))
    || typeof saved.scrollY !== "number" || !Number.isFinite(saved.scrollY) || saved.scrollY < 0
    || typeof saved.answerTop !== "number" || !Number.isFinite(saved.answerTop)) return null;
  const known = (id: string) => faqItems.some(item => item.id === id);
  const answer = saved.answer && known(saved.answer) ? saved.answer : null;
  return { ...saved as FaqReturn, expanded: saved.expanded.filter(known), collapsed: saved.collapsed?.filter(known),
    answer, ...(answer || saved.answer === null ? {} : { answerLink: undefined }) };
}
