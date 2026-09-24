# Everyday-language catalog search — September 24, 2026

Approved scope: discover existing offerings using natural shopping terms, including
"baby stuff", "reciprocating saw", "pet food" and "pet treats". No inventory,
availability, price, financial, legal or How It Works changes.

- Search still derives results only from the supplied catalog/category subset.
  There is no new catalog, customer search-history store or Supabase write.
- `src/lib/catalog/search-vocabulary.ts` owns version-controlled discovery terms.
  Product aliases describe that offering; retailer shopping terms apply only to
  existing gift-card offerings. Do not attach all retailer departments to every
  physical-product result or imply retailer stock/authorization.
- Whole words, singular/plural forms, possessives, selected synonyms, filler-word
  removal and conservative one-edit typo tolerance replace substring-only matching.
  Unknown meaningful qualifiers must still match; short terms and numbers are not
  fuzzy-matched. Named brands are not synonyms for competing brands.
- Direct matches rank ahead of indirect retailer suggestions. Retailer suggestions
  retain the actual gift-card title and disclose "Related retailer gift card ·
  Check retailer product availability." No products are invented.
- Queries are bounded to 512 characters / 32 distinct meaningful tokens. This is a
  deterministic MVP vocabulary, not an unrestricted language model or a live
  retailer inventory search. Extend terms with positive and negative tests.

Verification: 598 tests in 76 files passed, including 34 new cases; TypeScript,
changed-file ESLint and production build passed. Browser searches confirmed Baby's
Essentials first for "baby stuff", four Home Depot cards for "reciprocating saw",
and four PetSmart cards for "pet treats". At 390 x 844 the result cards and related
retailer explanation fit without page overflow. The $25 PetSmart result reached
its own item page. Temporary viewport reset; no purchase or funding performed.
