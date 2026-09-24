# Hamburger menu — Stage 1 review

Date: 2026-09-24
Branch: `codex/hamburger-menu-ticket-preview`
Base: `before-we-change-the-hamburger-menu` → `b7ec5c39c9a605f14973f9daaccf17f727bf50e9`.

## Scope and approval boundary

Implements the owner's supplied Hamburger Menu Only handoff. The accompanying Account Pages handoff was read but is deferred until Stage 1 approval. The owner's newer drawer labels/order supersede the older drawer hierarchy in account-wallet-spec §4.1 for this isolated preview only.

No homepage, SiteHeader, marketplace, destination page, route, authentication, financial, API, or database implementation changed. The original experiment branch, its deployment, and the checkpoint tag remain unchanged.

## Changed application files

- `src/components/layout/AccountDrawer.tsx`: hamburger/badge, profile header, seven described navigation rows, dialog behavior.
- `src/components/account/DrawerOverview.tsx`: existing live summary data and direct routes in the approved ticket presentation.
- `src/components/account/DrawerIllustration.tsx`: seven original unbranded decorative SVG illustrations.
- `src/components/account/drawer.module.css`: scoped warm-white tickets, responsive layout, focus and reduced-motion rules.
- `src/components/layout/AccountDrawer.test.tsx`: menu regression coverage.
- This review record.

## Verification

- 627 tests passed across 77 files, including 30 drawer tests.
- Production build passed (104 generated static pages); the initial sandbox attempt could not fetch the existing Google Fonts. Retried with network permission successfully.
- TypeScript check and `npx eslint src` passed.
- The broad `npm run lint` also scans pre-existing ignored local browser-capture files and fails on their generated code. These unrelated artifacts and the lint configuration were not changed.
- Local browser visual checks: 390 × 844, 768 × 1024, 1440 × 1000; also 320 × 700 narrow-phone and 720 × 500 compact-height reflow.
- Actual browser zoom shortcuts are not exposed by the in-app browser. 720 × 500 checks the layout space corresponding to 200% zoom on a 1440 × 1000 viewport; native 200% zoom remains a manual review item.
- In-browser: sticky header, internal scrolling to every navigation row and install action, background scroll lock, Escape, X, backdrop dismissal without navigation, initial Close focus, Tab/Shift+Tab wrap, trigger focus restoration, long names, unavailable data, and no horizontal overflow.
- Unit tests verify all seven row destinations, the three status actions, close-on-navigation, profile and active-entry shortcuts, real/zero/unavailable/large counts, photo updates, signed-out personal/business paths, preserved How It Works link, install event, and browser Back dismissal.
- Browser layout checks used a temporary development-only fictional rendering fixture, removed before build and commit. No sample account data or test-only route is deployed.
- Authenticated live-preview click-through is pending the owner's sign-in on the separate preview origin. No authentication bypass or session copying was used.

## Explicit design accommodations

- Kept Add to Home Screen below the seven rows and Sign out in a pinned footer; the supplied mockups omit these existing features.
- Preserved the existing signed-out welcome, shopping, registration, and How It Works content. The shared trigger and accessible dialog controls still receive the menu improvements.
- Used original code-native SVG artwork, not raster crops of the mockups.
- Blue/green/orange fills are slightly deeper for readable white text (at least 4.86:1 contrast across the chosen gradient endpoints).
- The hamburger's 44px hit target retains the previous 36px header layout footprint, avoiding movement of surrounding controls.
- Full viewport width uses the fixed overlay's available width rather than raw `100vw`, preventing scrollbar-width clipping.

## Release gate

Preview only. No production deployment. Stage 2 must branch from this approved Stage 1 branch, not from the original checkpoint. Do not start Stage 2 until the owner reviews Stage 1.
