# Project Zero-Loss Wishlist and Watchlist Capability Specification

**Version:** 1.0  
**Status:** Draft for Founder Review  
**Document Owner:** Founder / Product Experience  
**Last Updated:** 2026-07-16  
**Target Path:** `docs/capabilities/wishlist.md`

**Related Documents:**

- `docs/project-index.md`
- `docs/capabilities/README.md`
- `docs/capabilities/favorites.md`
- `docs/capabilities/notifications.md`
- `docs/capabilities/search.md`
- `docs/capabilities/recommendations.md`
- `docs/capabilities/user-preferences.md`
- `docs/capabilities/activity-history.md`
- `docs/capabilities/catalog.md`
- `docs/capabilities/identity-and-profile.md`
- `docs/product/homepage-spec.md`
- `docs/product/item-page-spec.md`
- `docs/product/account-wallet-spec.md`
- `docs/product/design-system-spec.md`
- `docs/operations/admin-portal-spec.md`
- `docs/operations/analytics-spec.md`
- `docs/operations/fraud-and-risk-spec.md`

---

# 1. Purpose

The Wishlist and Watchlist capability allows users to save products they may want to buy or win later and to monitor specific real item or pool conditions.

It supports intentional shopping, product discovery, future demand planning, and respectful re-engagement.

Wishlist and Watchlist actions must never:

- purchase an entry,
- reserve inventory,
- guarantee future availability,
- create a wallet hold,
- automatically enroll a user in marketing,
- or change the odds, capacity, outcome, or economics of any pool.

The user remains in control of what is saved, what is monitored, how often alerts are sent, and which channels are used.

---

# 2. Product Philosophy

Zero-Loss should help users plan purchases, discover relevant opportunities, and return to items they genuinely care about.

The Wishlist and Watchlist capability should feel like a smart-shopping tool, not a casino mechanic.

It should reinforce:

- user control,
- real product intent,
- transparent availability,
- respectful communication,
- and the principle that users are shopping for things they already want.

The capability must not use fake scarcity, fake waitlists, fabricated popularity, automatic entries, or pressure based on prior losses.

---

# 3. Definitions

## 3.1 Favorite

> “I like this and want to find it again.”

Favorites are governed by `docs/capabilities/favorites.md`.

## 3.2 Wishlist

> “I may want to buy or win this item in the future.”

A wishlist captures shopping intent.

## 3.3 Watchlist

> “Notify me when a specific real condition occurs.”

Examples:

- A new pool opens.
- A coming-soon item goes live.
- A pool reaches 80% capacity.
- Only 10 entries remain.
- An item becomes available again.
- A similar item is added.

## 3.4 Item Request

> “I would like Zero-Loss to consider offering this item, brand, retailer, or category.”

An item request does not guarantee catalog inclusion.

---

# 4. Core User Outcomes

A user should be able to:

1. Add or remove a product from a wishlist.
2. View all wishlist items in one account area.
3. See whether an item has an active, upcoming, completed, or unavailable pool.
4. Create a watch for a specific pool or item.
5. Choose which real event should trigger an alert.
6. Choose channel and frequency.
7. Pause or disable alerts without removing the item.
8. Keep an unavailable product saved.
9. Request an item not currently offered.
10. Move clearly between Favorite, Wishlist, and Watchlist states.
11. Access saved items across signed-in devices.
12. Understand that saving or watching never creates a financial commitment.
13. Receive only alerts the user explicitly requested.
14. View similar alternatives when an item is unavailable.
15. Remove an item without affecting wallet, entry, purchase, rebate, or result history.

---

# 5. User Stories

- As a user viewing a $500 gift card, I want to add it to my wishlist so I can return later.
- As a user interested in Publix gift cards, I want an alert when a new Publix pool opens.
- As a user watching an active pool, I want to know when it reaches 80% capacity.
- As a user, I want to know when only 10 entries remain so I can decide whether to participate.
- As a user, I want to join a waitlist for an upcoming item and receive one alert when it becomes live.
- As a user who wants a specific automotive product, I want to request it for future consideration.
- As a user, I want an unavailable wishlist item to remain visible so I can wait for it to return.
- As a user, I want daily-digest alerts instead of immediate messages.
- As a user, I want my wishlist private unless I explicitly choose otherwise in a future sharing feature.

---

# 6. Version 1 Scope

## Required

- One default private wishlist per user.
- Add and remove item.
- Wishlist account page.
- Signed-in persistence.
- Duplicate prevention.
- Active, upcoming, completed, and unavailable states.
- Watch “new pool opens.”
- Watch “coming-soon item becomes live.”
- Watch a real capacity threshold.
- Watch a real entries-remaining threshold.
- In-app and email notification options.
- Immediate and daily-digest frequency.
- Pause and disable controls.
- Item-request form.
- Server-side ownership enforcement.
- Row Level Security.
- Rate limiting and input sanitization.
- Admin review of item requests.
- Basic analytics.
- Automated authorization, duplication, trigger, and abuse tests.
- Empty, loading, unavailable, and error states.
- Mobile and accessibility support.

## Recommended

- Brand, retailer, and category wishlist entries.
- Similar-item suggestions.
- Recently added section.
- Move from Favorite to Wishlist.
- Add a watch directly from the Wishlist page.
- Anonymous local wishlist with safe account merge.
- Email digest grouping.
- Item-request duplicate detection.
- Aggregate demand analytics.

## Future Enhancements

- Multiple named wishlists.
- Shared, household, gift, and collaborative lists.
- Desired price, retailer, priority, notes, gift recipient, and target date.
- Budget planning.
- External wishlist import.
- Browser extension.
- Group gifting.
- Location-aware availability.
- Price-drop and retailer alerts.
- Seasonal lists and registries.
- AI-assisted organization, only if accurately disclosed.

---

# 7. Out of Scope for Version 1

- Automatic pool entry.
- Automatic purchasing or wallet deduction.
- Inventory reservation.
- Public wishlist profiles.
- Collaborative editing.
- Guaranteed availability or price.
- Fake waitlist counts or demand.
- Unrequested SMS or push.
- Hidden marketing enrollment.
- Fabricated urgency.

---

# 8. User Experience Requirements

## Wishlist Control

Use a bookmark, list, or shopping-bag icon with accessible labels:

- `Add to wishlist`
- `Remove from wishlist`

## Watchlist Control

Use a bell icon with descriptive labels:

- `Notify me when a new pool opens`
- `Notify me at 80% filled`
- `Stop watching this pool`

## Favorite, Wishlist, and Watchlist Clarity

- Heart = Favorite.
- Bookmark/List = Wishlist.
- Bell = Watch Alert.

If Version 1 combines controls visually, the underlying behavior must remain distinct.

## Feedback

- Update state quickly.
- Use subtle confirmation.
- Avoid casino-style effects.
- Show failures clearly.
- Roll back optimistic state after server rejection.

## Unauthenticated Users

An unauthenticated visitor may save locally and receive a nonblocking prompt to sign in for cross-device persistence.

## Removal

Removing a wishlist item must not remove financial history or silently delete a separately created watch.

---

# 9. Required Product Surfaces

Wishlist and Watchlist actions may appear on:

- Homepage cards.
- Search results.
- Category, brand, and retailer pages.
- Item and pool pages.
- Coming-soon cards.
- Recommendation and recently viewed modules.
- Favorites page.
- Account dashboard.
- Notification settings.
- Saved-search pages.
- Mobile navigation where appropriate.

---

# 10. Wishlist Account Page

Recommended route:

`/account/wishlist`

## Sections

- All Wishlist Items.
- Available Now.
- Active Pools.
- Coming Soon.
- Temporarily Unavailable.
- Completed or Historical.
- Watches Enabled.
- Alerts Paused.
- Item Requests.

## Card Information

Show, where relevant:

- Image.
- Item name.
- Brand and retailer.
- Category.
- Retail value.
- Entry price.
- Pool state and progress.
- Entries remaining.
- Coming-soon date.
- Safety-net summary.
- Date added.
- Watch condition and frequency.
- Primary and remove actions.

## Filters

- Availability.
- Category.
- Brand.
- Retailer.
- Pool state.
- Alerts enabled.
- Recently added.
- Coming soon.
- Price or retail-value range.

## Sorting

- Recently added.
- Oldest.
- Available now.
- Coming soon.
- Retail value.
- Entry price.
- Closest to capacity.
- Alphabetical.

All urgency sorting must use real data.

---

# 11. Watchlist Rules

## Supported Watch Types

Version 1:

- `new_pool_opened`
- `coming_soon_live`
- `capacity_percentage_reached`
- `entries_remaining_reached`
- `item_returned`
- `similar_item_available`

## Controlled Thresholds

Suggested capacity thresholds:

- 50%
- 75%
- 80%
- 90%
- 95%

Suggested entries-remaining thresholds:

- 25
- 10
- 5
- 1

## Trigger Semantics

A threshold alert fires once when the condition becomes true. It must not repeatedly fire while the condition remains unchanged.

## Pool-Level Versus Item-Level Watches

- Watch this pool.
- Watch this item for future pools.

A pool-specific watch must not silently transfer to a replacement pool.

## Completed Pools

Completed pools stop active progress alerts and may offer an item-level watch for future pools.

---

# 12. Item Requests

## Required Fields

- Request text.
- Product name.
- Brand.
- Retailer.
- Category.
- Optional product URL.
- Desired retail-value range.
- Optional notes.
- Notification preference if added.

## Business Rules

1. Requests do not guarantee inclusion.
2. Requests never create catalog records automatically.
3. Requests require moderation.
4. Duplicate requests should be grouped.
5. URLs and free text must be sanitized.
6. Requests must be rate-limited.
7. Illegal or prohibited items must be rejected.
8. Requests may inform aggregate demand planning.
9. Users may see a simple status: Submitted, Under Review, Added, or Not Planned.
10. Internal moderation notes remain private.

Suggested user message:

> Thanks. Your request has been submitted for review. This does not guarantee that the item will be added.

---

# 13. Empty, Loading, and Error States

## Empty Wishlist

> Your wishlist is empty.

Supporting text:

> Save products you may want to buy or try to win later.

## No Active Pools

> None of your wishlist items have an active pool right now.

Actions:

- Notify me when one opens.
- View coming soon.
- Explore similar items.

## Loading

Use stable skeletons and avoid major layout shifts.

## Failures

Examples:

- `We could not add this item to your wishlist. Please try again.`
- `We could not remove this item. Please try again.`
- `We could not create this alert. Please review your settings and try again.`
- `Your session expired. Sign in again to manage your wishlist.`

An item removed from the catalog should show a safe unavailable state instead of breaking the page.

---

# 14. Business Rules

1. Wishlist and watchlist actions never reserve inventory.
2. They never create entries, debits, holds, or wallet changes.
3. Saving does not guarantee a future pool or price.
4. Watching does not guarantee delivery.
5. Alert conditions must be based on genuine state.
6. Duplicate wishlist items and duplicate equivalent watches are prohibited.
7. A user may create distinct watches for different conditions.
8. Removing a wishlist item does not erase history.
9. Removing a wishlist item does not silently delete a separate watch.
10. Removing a watch does not remove the wishlist item.
11. Completed pools stop progress alerts.
12. Item-level watches may survive pool replacement; pool-level watches do not.
13. Retired items may remain visible as unavailable.
14. Users may pause alerts without deleting watches.
15. Item Requests require moderation and cannot bypass catalog or legal review.
16. Wishlist data may inform recommendations only according to user settings.
17. Wishlist records and analytics events never become financial truth.
18. Ownership is always verified server-side.
19. Anonymous merges and alert delivery must be idempotent.
20. Administrative actions must be audited.

---

# 15. Suggested Data Model

Final implementation must be reviewed against the Master Architecture.

## `wishlists`

- `id`
- `user_id`
- `name`
- `is_default`
- `visibility`
- `created_at`
- `updated_at`
- `archived_at`

Version 1 uses one default private wishlist.

## `wishlist_items`

- `id`
- `wishlist_id`
- `item_id`
- `created_at`
- `updated_at`
- `source_surface`
- `priority`
- `notes`
- `desired_price_cents`
- `desired_retailer_id`
- `target_date`
- `metadata`

Recommended uniqueness constraint:

`UNIQUE (wishlist_id, item_id)`

## `pool_watches`

- `id`
- `user_id`
- `watch_scope`
- `item_id`
- `pool_id`
- `alert_type`
- `threshold_value`
- `channel`
- `frequency`
- `enabled`
- `paused_until`
- `created_at`
- `updated_at`
- `last_evaluated_at`
- `last_triggered_at`
- `last_condition_state`
- `deduplication_key`
- `metadata`

## `item_requests`

- `id`
- `user_id`
- `request_text`
- `product_name`
- `brand_name`
- `retailer_name`
- `category_id`
- `product_url`
- `desired_value_min_cents`
- `desired_value_max_cents`
- `status`
- `moderation_reason`
- `duplicate_group_id`
- `created_at`
- `updated_at`
- `reviewed_at`
- `reviewed_by`

## Required Integrity Rules

- One default wishlist per user.
- Unique item per wishlist.
- Valid watch scope and threshold.
- Valid entity references.
- Valid request status.
- User ownership.
- Controlled archival where history matters.

---

# 16. Server and API Requirements

The server must derive the acting user from verified authentication.

Required operations:

- Create default wishlist.
- Add and remove item.
- List and batch-check wishlist state.
- Create, update, pause, resume, disable, and delete watch.
- Evaluate watch conditions.
- Submit and list item requests.
- Merge anonymous wishlist after sign-in.

Requirements:

- Add, remove, merge, trigger processing, and retries must be idempotent.
- Watch evaluation must use a durable job, event, or queue mechanism.
- Product grids must use batch lookup, not one query per card.
- Public data may be cached, but private wishlist state must never leak through shared caches.
- Rate limits must protect wishlist mutations, watches, and item requests.

---

# 17. Integrations

## Notifications

Governed by `docs/capabilities/notifications.md`.

- A watch is not unrestricted marketing consent.
- Users choose channel and frequency.
- Quiet hours are honored.
- Duplicate deliveries are prevented.
- Preview environments never send to production users.
- Failed delivery does not delete the watch.

## Favorites

Favorite, Wishlist, and Watchlist may coexist. The UI may simplify their controls, but their meanings remain distinct.

## Recommendations

Wishlist signals may influence recommendations only with explainable reasons, user control, and eligibility filtering.

## Search

Search results should show wishlist and watch state and allow saving, watching, or requesting unavailable products.

## Catalog

Catalog retirement must not corrupt lists. States may include Active, Coming Soon, Temporarily Unavailable, Retired, Prohibited, and Replaced.

## Activity History

User-visible activity may include wishlist additions, watch creation, watch triggers, and request status changes. This remains separate from the financial ledger, audit logs, analytics, and notification delivery records.

---

# 18. Security, Privacy, and Fraud

- Users may access only their own records.
- Row Level Security must be enabled and tested.
- Wishlists remain private by default.
- Item-request input must be sanitized and rate-limited.
- Administrative access to named user intent should be restricted and logged.
- Aggregate analytics should be preferred.

Potential abuse:

- Fake accounts inflating demand.
- Bots creating watches.
- Scraping.
- Request spam.
- Referral manipulation.
- Fake popularity signals.

Protections may include rate limits, bot detection, duplicate-account signals, request deduplication, velocity limits, suspicious-volume alerts, and fraud-filtered analytics.

Wishlist and watch counts must never affect winners, odds, pool capacity, payouts, rebates, or financial benefits.

---

# 19. Administrative Requirements

The admin portal should support:

- Most-wishlisted, most-watched, and most-requested items.
- Demand by category, brand, retailer, and lawful geography.
- Watch-trigger and notification-delivery health.
- Suspicious activity alerts.
- Request moderation and duplicate grouping.
- Request-status changes.
- Catalog conversion through normal approval.
- Emergency pause.
- Audit history.
- Aggregate export.

Administrative tools must not fabricate demand or silently modify user lists.

---

# 20. Analytics Requirements

Recommended events:

- `wishlist_item_added`
- `wishlist_item_removed`
- `wishlist_page_viewed`
- `wishlist_item_opened`
- `watch_created`
- `watch_updated`
- `watch_paused`
- `watch_resumed`
- `watch_disabled`
- `watch_triggered`
- `watch_delivery_attempted`
- `watch_delivery_failed`
- `item_request_submitted`
- `item_request_updated`
- `anonymous_wishlist_created`
- `anonymous_wishlist_merged`
- `wishlist_merge_failed`

Useful metrics:

- Wishlist-to-entry conversion.
- Wishlist-to-purchase conversion.
- Watch-to-entry conversion.
- Trigger open and click rates.
- Time from save to entry or purchase.
- Most-requested items and categories.
- Request-to-catalog conversion.
- Notification opt-out rate.
- Suspicious watch velocity.

Analytics never become the source of truth.

---

# 21. Accessibility, Mobile, and Performance

## Accessibility

Controls must work by keyboard, have visible focus, include screen-reader labels, avoid color-only meaning, meet contrast requirements, support reduced motion, and announce state changes.

## Mobile

- Controls must be easily tappable.
- Watch settings may use an accessible bottom sheet.
- Threshold options must be clear.
- Large lists should paginate or load incrementally.
- Sign-in prompts must not repeatedly interrupt browsing.
- Weak-network failures must show recovery options.

## Performance

Support batch lookup, indexed ownership queries, paginated lists, efficient watch evaluation, deduplicated jobs, controlled optimistic UI, and safe user-specific caching.

Test large wishlists, many active watches, high-volume threshold crossings, concurrent updates, and multi-device synchronization.

---

# 22. Failure and Edge Cases

The implementation must address:

- Duplicate add or remove requests.
- Simultaneous multi-device changes.
- Anonymous merge conflicts.
- Item retirement after saving.
- Pool completion before delivery.
- Rapid pool-state changes.
- Threshold reversal.
- Provider failure and retry.
- Duplicate events.
- Preference changes after trigger creation.
- Item removed while watch remains.
- Watch removed while item remains.
- Account suspension or deletion.
- Malicious URLs or request text.
- Excessive requests.
- Replaced catalog items.
- Local storage unavailable.
- Partial batch failure.
- Unauthorized access.
- Bot-created watches.

Each edge case needs safe server behavior, understandable messaging where relevant, logging, and tests.

---

# 23. Testing Requirements

## Authorization

- Users can read and modify only their own records.
- Anonymous behavior follows approved local rules.

## Data Integrity

- Duplicates are prevented.
- Add and remove operations are idempotent.
- Invalid thresholds and references are rejected.
- Retired items are safe.

## Trigger Logic

- Thresholds fire once.
- Unchanged state does not resend.
- Pool-level and item-level watches remain distinct.
- Completed pools stop progress alerts.
- Retries do not duplicate delivery.

## User Experience

- Empty, loading, unavailable, and error states render.
- Optimistic rollback works.
- Mobile and accessibility requirements pass.

## Integration

- Notification and recommendation preferences are honored.
- Requests enter moderation.
- Activity and analytics records are correct but nonauthoritative.

## Performance

- Grids use batch lookup.
- Large lists paginate.
- Watch evaluation remains bounded.
- No unbounded queries occur.

---

# 24. Acceptance Criteria

Version 1 is complete only when:

1. Users can add and remove wishlist items.
2. Duplicate records cannot be created.
3. Users can view the wishlist account page.
4. Users can create, pause, resume, and disable supported watches.
5. Alerts fire only on genuine state changes.
6. Duplicate deliveries are prevented.
7. Users control channel and frequency.
8. Users cannot access another user's records.
9. RLS is active and tested.
10. Unavailable and retired items render safely.
11. Item Requests are sanitized and moderated.
12. Wishlist and watch actions never affect financial records or pool outcomes.
13. Loading, empty, error, and unavailable states work.
14. Mobile and keyboard interactions work.
15. Anonymous merge, if implemented, is idempotent.
16. Admin demand and moderation tools work.
17. Fraud controls detect suspicious activity.
18. Automated tests pass.
19. Founder verification passes.
20. Documentation matches implementation.
21. Changes are committed to GitHub.

---

# 25. Founder Verification Checklist

1. Add an item to Wishlist.
2. Refresh and confirm persistence.
3. Open `/account/wishlist` and confirm the item appears.
4. Create a new-pool watch.
5. Confirm the selected frequency.
6. Pause and resume the watch.
7. Create an 80% threshold watch.
8. Confirm duplicates are prevented.
9. Remove the wishlist item and verify the approved watch behavior.
10. Disable the watch.
11. Test an unavailable item.
12. Submit an Item Request.
13. Confirm it appears in user history and admin moderation.
14. Confirm another user cannot access the first user's records.
15. Confirm no wallet, entry, pool-capacity, or ledger record changed.
16. Test mobile and keyboard use.
17. Test an expired session.
18. Simulate delivery failure and confirm retry does not duplicate delivery.

---

# 26. Related Documents

Review this capability with:

- `docs/project-index.md`
- `docs/architecture/master-architecture.md`
- `docs/architecture/ai-operating-rules.md`
- `docs/architecture/output-contract.md`
- `docs/core/product-vision.md`
- `docs/core/product-concept.md`
- `docs/capabilities/README.md`
- `docs/capabilities/favorites.md`
- `docs/capabilities/notifications.md`
- `docs/capabilities/search.md`
- `docs/capabilities/recommendations.md`
- `docs/capabilities/user-preferences.md`
- `docs/capabilities/activity-history.md`
- `docs/capabilities/catalog.md`
- `docs/capabilities/identity-and-profile.md`
- `docs/product/homepage-spec.md`
- `docs/product/item-page-spec.md`
- `docs/product/account-wallet-spec.md`
- `docs/product/design-system-spec.md`
- `docs/operations/admin-portal-spec.md`
- `docs/operations/analytics-spec.md`
- `docs/operations/fraud-and-risk-spec.md`

---

# 27. Guiding Statement

The Wishlist and Watchlist capability exists to help users plan, save, and monitor products they genuinely care about.

It must increase convenience without creating hidden financial commitments, false urgency, fake demand, or unwanted communication.

Users remain in control of what they save, what they watch, when they are contacted, and how their shopping intent is used.