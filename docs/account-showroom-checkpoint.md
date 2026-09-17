# Account showroom — first design checkpoint

Scope: the My Zero Loss gallery (`/account/entries`) and the signed-in account drawer.
This is a local design checkpoint on `openai-homepage-experiment`, not a production release.

## Reference decisions

- Use the chosen My Zero Loss hero: navy showroom, cyan framed cards, green winning outcome,
  and All / Still Open / You Won / Complete Purchase filters. Retain the existing Completed filter.
- Preserve catalog product names and images. The stored demo Samsung result remains the winner;
  the Nike and baby-bundle purchase options are not changed to match illustrative screenshot outcomes.
- Keep the drawer compact: saved profile photo and name, three summary rows, then account navigation.
  A single available digital reward still links directly to its barcode destination.
- Keep shopping categories, recent activity, rules/help, business signup, and sign-out available.
  Recent activity and secondary links expand on demand; the recent list is bounded to four items.
- Do not redesign the shared site header, dashboard, reward detail, funding form, notifications,
  orders, or security pages in this checkpoint. Do not invent notification counts or security features.

## Data and behavior

No database migrations, account edits, financial mutations, new balances, or production changes.
The gallery and drawer use existing server-authorized customer activity. Failed reads do not render
stale product cards; empty accounts remain empty. Purchase math and existing detail dialogs remain intact.
The gallery supports touch scrolling, keyboard-reachable product links, previous/next controls,
resize-aware scroll boundaries, and reduced-motion preferences. It never auto-advances.

## Verification

- Production build passed.
- 129 unit tests across 19 files passed.
- Targeted lint and diff whitespace checks passed.
- Headless Edge review of actual components with isolated test fixtures: desktop and mobile screenshots;
  320 / 390 / 768 / 1440 px overflow checks; carousel boundaries; reduced-motion scrolling; keyboard product
  access; drawer focus containment and Escape; direct reward destination; category links; empty state;
  completion filter; and eight-item desktop overflow. No browser runtime errors.
- Browser fixture harness and screenshots live only in ignored local capture paths. They are not app
  routes, do not access customer authentication, and are not included in a release.

## Decorative asset provenance

Mode: built-in image generation. The image-generation skill was used only for the decorative showroom
scene. All interface text, cards, controls, icons, and actual product images remain native page elements.
Saved asset: `public/account/showroom-v1.webp` (1536 × 1024, approximately 70 KB), lossily encoded from
the generated PNG. No existing assets were overwritten.

Final generation prompt:

> Use case: stylized-concept. Asset type: decorative background for a Zero Loss product account gallery, NOT a UI screenshot. Create a polished cinematic 3D showroom interior: midnight navy architectural columns and glass, sparse cyan edge lighting, dark reflective stone floor, subtle brushed metal architectural details. Wide landscape 3:2 composition with mostly quiet dark navy negative space across the top and middle where live UI text and product cards will be placed. The scene has deep perspective and restrained softly blurred lighting at far left and right. Bottom quarter has a low very wide elliptical black brushed-metal display platform with a thin cyan rim, empty and unobtrusive. Refined premium product-showroom mood, deep #001629 shadows, cyan #00def5 accents; a little natural white light at far sides. No products, no objects on the platform, no people, no text, no logos, no cards, no interface, no borders, no letters, no watermark. Background atmosphere only, crisp high-quality materials but low contrast behind foreground content.

## Review gate

Review the gallery and drawer before extending this visual system to the preferred barcode screen,
then wallet history, notifications, and account/security. No commit, push, or Vercel deployment was
performed as part of this first design pass. The three unrelated temporary files remain untouched.
