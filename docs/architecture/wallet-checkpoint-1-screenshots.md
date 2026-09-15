# Checkpoint one — local visual review

## Latest: minimal mobile drawer cards

Verified at [http://localhost:3000/account/entries](http://localhost:3000/account/entries)
with a 390 x 844 viewport. The compact balance card now contains only its label,
database balance and disabled Add funds button. Transactions remain in the lower
Wallet & Transactions navigation. The compact wallet removes retailer/description
text and retains the count, direct Open reward action and non-redeemable disclosure.
My Zero Loss and the desktop Dashboard cards are unchanged in this pass.

Measured heights: balance 77px, wallet 105px, My Zero Loss 73px. Equal 319px widths,
no horizontal page overflow; 44px action targets retained. All 23 targeted tests
and scoped ESLint passed. Browser viewport restored after capturing the screenshot.

![Minimal mobile drawer](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-drawer-minimal-mobile.png)

## Latest: tighter summary sizing (pending fresh visual review)

The Dashboard no longer forces a 240px card height. Summary padding, number sizes,
and vertical gaps are reduced. Drawer cards use 12px padding; My Zero Loss is now
a two-line linked summary, and the wallet's disclosure shares its action row.
Cards retain natural height growth, full available width, and 44px action targets.
Links, counts, profile photo, balance reads and funding restrictions are unchanged.

The 22 summary/drawer/wallet tests, scoped ESLint and TypeScript passed. The browser
connection returned no available browsers in this pass, so no fresh screenshot
was captured. Images below show the previous larger sizing, not this adjustment.

## Latest: three-card overview with profile moved to account shortcuts

Local URL for all three screenshots: [http://localhost:3000/account](http://localhost:3000/account).
Authenticated allowlisted visual preview: database balance $0.00, four illustrative
items, one sample reward, one open entry and two purchase options. No redeemable
barcode is issued. The reference image's $100 is not used.

The desktop summaries have equal height and width. Mobile summaries share their
left and right edges; the drawer uses a compact version of the same order. The
saved photo opens [Your account](http://localhost:3000/account/profile), where the
existing photo editor remains available. One sample reward opens its
[direct detail](http://localhost:3000/account/wallet?reward=nike-court-shot-shoes).

![Three-card desktop Dashboard](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-account-three-cards-desktop.png)

![Full-width mobile Dashboard summaries](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-account-three-cards-mobile.png)

![Compact reordered mobile drawer](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-account-three-cards-drawer-mobile.png)

## Latest sizing adjustment: full-height desktop, full-width mobile

September 14 follow-up at [http://localhost:3000/account](http://localhost:3000/account):
the Dashboard wallet link now stretches to the profile/balance row height. All
three measured 170 CSS pixels high in the desktop browser check. On a 390 x 844
viewport, the Dashboard wallet link matches the balance card's left/right edges;
the drawer wallet link also matches its balance card's edges. No horizontal
overflow. Navigation, counts, data readers and funding restrictions are unchanged.
The 17 wallet/menu tests and scoped ESLint passed. Desktop viewport restored.

![Full-height desktop wallet card](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-wallet-sizing-desktop.png)

![Full-width mobile wallet shortcut](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-wallet-sizing-mobile.png)

## Latest: Your wallet shortcut and direct redemption destination

September 14: fresh browser captures from the current working tree. The existing
authenticated, allowlisted reviewer has the unchanged database balance `$0.00`,
one illustrative open entry and one illustrative digital-prize item. The wallet
badge counts the latter; it is not the entry-ticket count. No card was issued.
This section supersedes the older prize-detail-panel descriptions below.

Dashboard: [http://localhost:3000/account](http://localhost:3000/account)

![Compact Your wallet button between profile and balance](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-wallet-shortcut-desktop.png)

The drawer below uses the same Dashboard URL, at a 390 x 844 viewport:

![Drawer with compact wallet shortcut](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-wallet-shortcut-drawer-mobile.png)

Direct reward: [http://localhost:3000/account/wallet?reward=nike-court-shot-shoes](http://localhost:3000/account/wallet?reward=nike-court-shot-shoes)

![Dedicated reward page on desktop](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-wallet-reward-desktop.png)

![Direct mobile redemption destination, no second reveal button](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-wallet-reward-mobile.png)

Collection: [http://localhost:3000/account/wallet](http://localhost:3000/account/wallet)

Funds/history: [http://localhost:3000/account/wallet?view=history](http://localhost:3000/account/wallet?view=history)

Normal empty and unavailable states were tested, not re-photographed by switching
the operator capability this time. The read-only fixture gate and database reader
are unchanged. Saved photo/name were preserved and the authenticated session kept.
The mobile viewport override was reset. Dashboard and direct reward views remain
open locally. No commit, push, deployment, financial write or supplier call occurred.

## Latest: compact desktop product gallery

September 14 desktop refinement: four side-by-side cards, larger catalog images,
untruncated names, and both remaining/applied amounts. Mobile keeps the prior list;
the hamburger drawer has not been changed. The existing My Zero Loss filters and
detail-panel interactions remain. No financial data or functionality changed.

Dashboard: [http://localhost:3000/account](http://localhost:3000/account)

![Desktop Dashboard gallery](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-dashboard-gallery-desktop.png)

My Zero Loss: [http://localhost:3000/account/entries](http://localhost:3000/account/entries)

![Desktop gallery and existing filters](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-my-zero-loss-gallery-desktop.png)

![Preserved mobile list and filters](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-gallery-mobile-preserved.png)

The captures below are earlier revisions retained for comparison.

Captured September 14, 2026 from the current working tree's running local development server. These are browser screenshots, not the user's reference images and not generated artwork.

The same existing authenticated test account was used for both classifications. The operator-only preview setting was disabled for normal captures, then enabled for authorized captures. No customer toggle, URL-based authorization, impersonation, account enrollment or financial write was used. The final local configuration leaves read-only preview enabled for the allowlisted reviewer; other accounts do not receive examples.

Name discrepancy: the stored display name is missing; the stored legal name is lowercase `chris prior`. The app now prioritizes a saved display name with its original casing, but these screenshots honestly preserve the current stored fallback. The photo and editor remain intact. No name was fabricated or rewritten to obtain a capitalized screenshot.

[Technical handoff](C:/Users/Win11Blue/Desktop/zero-loss-app/docs/architecture/wallet-checkpoint-1.md)

## Latest revision: activity-first Dashboard and click-through panels

The captures in this section supersede the older Dashboard/detail layout below.
They use the existing authenticated allowlisted reviewer: actual database balance
`$0.00`, four labeled sample activity items, one illustrative active ticket.
The display name/photo were not changed. Funding and fulfillment remain disabled.

Dashboard URL: [http://localhost:3000/account](http://localhost:3000/account)

![Updated desktop Dashboard](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-dashboard-activity-desktop.png)

Detail URL: [http://localhost:3000/account?item=babys-essentials-bundle](http://localhost:3000/account?item=babys-essentials-bundle)

![Desktop purchase-detail panel](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-dashboard-purchase-details-desktop.png)

Mobile captures: 390 × 844 CSS viewport, subsequently restored to desktop.
The top and scrolled list are both the Dashboard URL above; the mobile detail
uses the same item URL as desktop. No separate mobile fixture source exists.

![Mobile Dashboard overview](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-dashboard-activity-mobile-top.png)

![Mobile Dashboard activity list](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-dashboard-activity-mobile-list.png)

![Mobile purchase-detail panel](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-dashboard-purchase-details-mobile.png)

All four Dashboard product links were opened in the browser. The account-drawer
shortcut opens the same panel on My Zero Loss and closes the drawer. Filtered
selection and close preserve `filter=active`. Escape/X close, focus restoration,
Tab wrapping and mobile wrapping/no horizontal overflow were checked. Profile
photo editor opened and was cancelled; nothing was saved or replaced.

The old normal-account screenshots below document the prior layout. The revised
normal/failed-read Dashboard state and unauthorized item selection were verified
in application tests in this UI follow-up; no new normal-account browser capture
is claimed for this revision. Financial schema and data were not altered.

## 1. Normal Account Dashboard

Local URL: [http://localhost:3000/account](http://localhost:3000/account)

Viewport: Desktop. Data: Authenticated test account; preview permission disabled. Database-derived $0.00 and preserved photo.

![1. Normal Account Dashboard](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-normal-dashboard.png)

## 2. Normal Wallet & Transactions

Local URL: [http://localhost:3000/account/wallet](http://localhost:3000/account/wallet)

Viewport: Desktop. Data: Authenticated database snapshot; $0.00, no transactions, funding disabled.

![2. Normal Wallet & Transactions](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-normal-wallet.png)

## 3. Normal My Zero Loss

Local URL: [http://localhost:3000/account/entries](http://localhost:3000/account/entries)

Viewport: Desktop. Data: Authenticated empty checkpoint state; zero activity, no investor fixtures.

![3. Normal My Zero Loss](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-normal-activity-desktop.png)

## 4. Normal My Zero Loss on mobile

Local URL: [http://localhost:3000/account/entries](http://localhost:3000/account/entries)

Viewport: Mobile, 390 × 844 CSS viewport. Data: Same authenticated empty state and zero active tickets.

![4. Normal My Zero Loss on mobile](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-normal-activity-mobile.png)

## 5. Authorized unified My Zero Loss

Local URL: [http://localhost:3000/account/entries](http://localhost:3000/account/entries)

Viewport: Desktop. Data: Server-allowlisted, read-only illustrative activity: four items / one active. Header balance remains the actual database $0.00; no enrollment or ledger writes.

![5. Authorized unified My Zero Loss](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-preview-activity-desktop.png)

## 6. Normal authenticated drawer

Local URL: [http://localhost:3000/account/entries](http://localhost:3000/account/entries)

Viewport: Desktop. Data: Authenticated empty state, database balance, saved photo, zero tickets.

![6. Normal authenticated drawer](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-normal-drawer-desktop.png)

## 7. Normal authenticated drawer on mobile

Local URL: [http://localhost:3000/account/entries](http://localhost:3000/account/entries)

Viewport: Mobile, 390 × 844 CSS viewport. Data: Same normal state; saved photo/name visible, scrollable drawer and working X.

![7. Normal authenticated drawer on mobile](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-normal-drawer-mobile.png)

## Additional: authorized preview Wallet

Local URL: [http://localhost:3000/account/wallet](http://localhost:3000/account/wallet)

Viewport: Desktop. Data: Actual database $0.00, no transaction rows, read-only preview permission; Add Funds disabled.

![Additional: authorized preview Wallet](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-preview-wallet-desktop.png)

## Additional: authorized drawer

Local URL: [http://localhost:3000/account/entries](http://localhost:3000/account/entries)

Viewport: Desktop. Data: Four isolated visual examples / one active ticket; actual database $0.00. Funding disabled.

![Additional: authorized drawer](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-preview-drawer-desktop.png)

## Additional: authorized drawer on mobile

Local URL: [http://localhost:3000/account/entries](http://localhost:3000/account/entries)

Viewport: Mobile, 390 × 844 CSS viewport. Data: Same server-authorized examples and actual balance. Product names wrap and the inner drawer scrolls to rules.

![Additional: authorized drawer on mobile](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-preview-drawer-mobile.png)

## Additional: authorized My Zero Loss on mobile

Local URL: [http://localhost:3000/account/entries](http://localhost:3000/account/entries)

Viewport: Mobile, 390 × 844 CSS viewport. Data: Responsive single-column rendering of the same illustrative activity, not stored outcomes.

![Additional: authorized My Zero Loss on mobile](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-preview-activity-mobile.png)

## Additional: exact-product purchase detail

Local URL: [http://localhost:3000/account/entries?item=babys-essentials-bundle#activity-detail](http://localhost:3000/account/entries?item=babys-essentials-bundle#activity-detail)

Viewport: Desktop. Data: Read-only illustration: product $100, $1 applied, $99 remaining, availability explicitly not checked. No purchase or credit issued.

![Additional: exact-product purchase detail](C:/Users/Win11Blue/Desktop/zero-loss-app/.tmp-cp1-preview-purchase-detail.png)
