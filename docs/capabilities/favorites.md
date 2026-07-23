# Project Zero-Loss Favorites Capability Specification

**Version:** 1.0
**Status:** Draft for Founder Review
**Document Owner:** Founder / Product Experience
**Last Updated:** 2026-07-16
**Target Path:** `docs/capabilities/favorites.md`

**Related Documents:**

* `docs/project-index.md`
* `docs/capabilities/README.md`
* `docs/capabilities/wishlist.md`
* `docs/capabilities/notifications.md`
* `docs/capabilities/search.md`
* `docs/capabilities/recommendations.md`
* `docs/capabilities/user-preferences.md`
* `docs/capabilities/activity-history.md`
* `docs/capabilities/catalog.md`
* `docs/product/homepage-spec.md`
* `docs/product/item-page-spec.md`
* `docs/product/account-wallet-spec.md`
* `docs/product/design-system-spec.md`
* `docs/operations/admin-portal-spec.md`
* `docs/operations/analytics-spec.md`
* `docs/operations/fraud-and-risk-spec.md`

---

# 1. Purpose

The Favorites capability allows users to save products, pools, brands, retailers, and categories they want to revisit.

Favorites reduce the effort required to find something again and create the foundation for:

* personalized discovery,
* relevant notifications,
* recommendations,
* saved shopping intent,
* customer retention,
* category and brand following,
* and future wishlist or watchlist behavior.

Favorites must feel like a useful shopping tool rather than a pressure tactic.

Favoriting something must never:

* purchase an entry,
* reserve inventory,
* change wallet balances,
* guarantee future availability,
* create unrestricted marketing consent,
* or imply that a user is financially committed.

---

# 2. Product Philosophy

Favorites support the Zero-Loss product philosophy by helping users organize products they genuinely care about.

The capability should reinforce the idea that Zero-Loss is a shopping platform with an opportunity to win—not a gambling interface designed to encourage impulsive behavior.

Favorites should provide:

* convenience,
* control,
* transparency,
* continuity across devices,
* and respectful personalization.

The system should never use a favorite to create misleading urgency or excessive messaging.

A saved item may be used to improve the experience, but the user must remain in control of:

* whether alerts are sent,
* which channels are used,
* how often alerts are delivered,
* whether favorites affect recommendations,
* and whether behavioral history is retained.

---

# 3. Definitions

## 3.1 Favorite

A Favorite means:

> “I like this and want to find it again.”

A Favorite is a lightweight saved relationship.

## 3.2 Wishlist

A Wishlist means:

> “I may want to buy or win this item.”

Wishlist behavior is governed by:

`docs/capabilities/wishlist.md`

## 3.3 Watchlist

A Watchlist means:

> “Notify me when a specific condition occurs.”

Examples include:

* a new pool opens,
* an item becomes available,
* a pool reaches a real capacity threshold,
* or an upcoming item goes live.

Watchlist behavior is governed by:

* `docs/capabilities/wishlist.md`
* `docs/capabilities/notifications.md`

## 3.4 Follow

A Follow means:

> “I want to see more from this category, brand, or retailer.”

Examples:

* Follow Groceries.
* Follow Publix.
* Follow Apple.
* Follow Milwaukee.
* Follow Travel.

## 3.5 Saved Entity

A Saved Entity is any supported object a user may favorite or follow.

---

# 4. Supported Favorite Types

The platform should support the following favorite types.

## 4.1 Item Favorite

A specific catalog item.

Examples:

* $100 Publix Gift Card.
* Apple AirPods Pro.
* Milwaukee Drill Set.
* Disney Vacation Package.
* YETI Cooler.

## 4.2 Pool Favorite

A specific active, upcoming, completed, or temporarily unavailable pool.

A pool favorite is useful when the user cares about one particular offering rather than every future pool for the underlying item.

## 4.3 Brand Follow

A brand the user wants to see more often.

Examples:

* Apple.
* Milwaukee.
* DeWalt.
* LEGO.
* YETI.
* Ninja.
* Traeger.
* Sony.

## 4.4 Retailer Follow

A retailer, restaurant, travel provider, or service provider.

Examples:

* Publix.
* Walmart.
* Amazon.
* Target.
* Home Depot.
* Lowe’s.
* Delta.
* Airbnb.
* Domino’s.
* Disney.

## 4.5 Category Follow

A broad interest or shopping category.

Examples:

* Groceries.
* Restaurants.
* Travel.
* Electronics.
* Gaming.
* Automotive.
* Car parts.
* Tools.
* Home improvement.
* Kitchen.
* Fitness.
* Outdoors.
* Camping.
* Pets.
* Family.
* Fashion.
* Gift cards.
* Experiences.
* Vacations.

## 4.6 Subcategory Follow

A narrower category.

Examples:

* Pizza.
* Power tools.
* Tires.
* Exhaust systems.
* Cruises.
* Beach vacations.
* Smart-home devices.
* Gaming consoles.
* Pet food.
* Grocery gift cards.

---

# 5. Core User Outcomes

A user should be able to:

1. Favorite or unfavorite an item from any major product-discovery surface.
2. Follow or unfollow a category, brand, or retailer.
3. View saved items in one account area.
4. See whether a saved item has an active, upcoming, completed, or unavailable pool.
5. Move from a favorite into a wishlist or watchlist.
6. Enable or disable alerts for a saved entity.
7. Choose whether favorites influence recommendations.
8. Remove a favorite without affecting entries, purchases, wallet activity, or prior notifications.
9. Access saved favorites after signing in on another device.
10. Understand why a recommendation is connected to a favorite.
11. See when an item is unavailable without the item silently disappearing.
12. Request similar or replacement items when a favorite is unavailable.

---

# 6. User Stories

## 6.1 Saving an Item

> As a user browsing the homepage, I want to save a Publix gift card so I can find it again later without searching.

## 6.2 Following a Category

> As a user interested in groceries, I want to follow the Grocery category so the site can show me relevant opportunities.

## 6.3 Following a Brand

> As a user who prefers Milwaukee tools, I want to follow Milwaukee so I can see new products and pools from that brand.

## 6.4 Enabling an Alert

> As a user who saved an item, I want to be notified when a new pool opens without receiving unrelated messages.

## 6.5 Managing Favorites

> As a user, I want one account page where I can review, filter, and remove saved items.

## 6.6 Unavailable Item

> As a user, I want to understand that a saved item is temporarily unavailable rather than having it disappear from my account.

## 6.7 Personalization Control

> As a user, I want to decide whether my favorites affect recommendations and marketing messages.

## 6.8 Anonymous User

> As a visitor who has not created an account yet, I want to save a few items temporarily and keep them if I later register.

---

# 7. Version 1 Scope

The following are required for Version 1.

## 7.1 Required

* Signed-in item favorites.
* Category follows.
* Favorite and unfavorite controls.
* Favorites account page.
* Saved-state persistence.
* Duplicate prevention.
* Basic filtering.
* Active and unavailable status.
* Mobile-responsive behavior.
* Accessible controls.
* Basic analytics.
* Server-side ownership enforcement.
* Row Level Security.
* Optional notification opt-in.
* Basic relationship with recommendations.
* Empty, loading, unavailable, and error states.
* Automated authorization and duplication tests.

## 7.2 Recommended

* Brand follows.
* Retailer follows.
* Anonymous local favorites.
* Merge anonymous favorites after sign-in.
* Move a favorite into a wishlist.
* Add a watch alert from the favorites page.
* Recently favorited section.
* “Because you saved this” recommendation explanations.

## 7.3 Future Enhancements

* Shared favorites.
* Household lists.
* Gift lists.
* Public creator lists.
* Seasonal collections.
* Collaborative shopping lists.
* Importing a wishlist from another service.
* Price-target alerts.
* Multiple favorite collections.
* Personalized favorite ordering.
* Family-account favorites.
* Favorite notes.
* Gift-recipient tagging.
* Location-aware retailer availability.
* Favorite-based email digests.
* Smart grouping by brand or category.

---

# 8. Out of Scope for Version 1

Version 1 should not include:

* public social favorite counts,
* public user favorite profiles,
* collaborative lists,
* automatic pool entry,
* automatic purchasing,
* automatic wallet deductions,
* hidden marketing enrollment,
* machine-learning-only recommendation logic,
* guaranteed future inventory,
* guaranteed price or pool availability,
* fake favorite counts,
* fake popularity,
* or pressure messages based solely on a favorite.

---

# 9. User Experience Requirements

## 9.1 Favorite Control

The primary item-favorite control should use a familiar symbol such as:

* an outlined heart when not saved,
* and a filled heart when saved.

The control must also include an accessible text label.

Examples:

* `Add to favorites`
* `Remove from favorites`

The icon alone is not sufficient for screen-reader users.

## 9.2 Interaction Feedback

When a user favorites an entity:

* the state should update immediately,
* a subtle confirmation may appear,
* the control must remain usable,
* and a failed save must be communicated clearly.

The interface should avoid excessive celebration, confetti, spinning wheels, or casino-style feedback.

## 9.3 Unauthenticated User

When an unauthenticated user favorites something, the platform may:

1. save it temporarily in local browser storage,
2. show a nonblocking sign-in suggestion,
3. and offer to preserve the favorite after account creation.

The platform should not interrupt browsing with repeated mandatory sign-in screens.

## 9.4 Signed-In User

A signed-in user's favorite should be saved to the authoritative server-side record.

The client may optimistically update the UI, but the server result remains authoritative.

## 9.5 Removal

Removing a favorite should:

* require one clear action,
* update the UI immediately,
* not require a confirmation dialog in ordinary cases,
* and optionally allow a brief undo action.

Removing a favorite must not delete:

* entry history,
* wallet history,
* purchase history,
* result history,
* notifications already delivered,
* or analytics records required for audit or aggregate reporting.

---

# 10. Required Product Surfaces

Favorites should be available where relevant on:

* Homepage product cards.
* Search results.
* Category pages.
* Brand pages.
* Retailer pages.
* Item pages.
* Pool pages.
* Coming-soon sections.
* Recommendation modules.
* Recently viewed sections.
* Account dashboard.
* Favorites account page.
* Wishlist page.
* Notification preferences.
* Email digest controls.
* Mobile navigation where appropriate.

---

# 11. Favorites Account Page

Recommended route:

`/account/favorites`

## 11.1 Required Sections

* All Favorites.
* Items.
* Pools.
* Brands.
* Retailers.
* Categories.
* Available Now.
* Coming Soon.
* Temporarily Unavailable.
* Completed or Historical, if shown.

## 11.2 Required Card Information

Each favorite card should show, when relevant:

* Image.
* Item or entity name.
* Brand.
* Retailer.
* Category.
* Retail value.
* Entry price.
* Pool state.
* Pool capacity progress.
* Genuine entries remaining.
* Coming-soon date.
* Safety-net summary.
* Date saved.
* Notification status.
* Wishlist status.
* Watchlist status.
* Primary action.
* Remove action.

## 11.3 Filters

Users should be able to filter by:

* Entity type.
* Category.
* Brand.
* Retailer.
* Availability.
* Active pools.
* Upcoming pools.
* Notifications enabled.
* Recently saved.

## 11.4 Sorting

Possible sorting options:

* Most recently saved.
* Oldest saved.
* Available now.
* Coming soon.
* Highest retail value.
* Lowest entry price.
* Pool closest to capacity.
* Alphabetical.

Urgency-based sorting must use real pool data.

---

# 12. Empty States

## 12.1 No Favorites

Suggested message:

> You have not saved anything yet.

Suggested supporting text:

> Save items, brands, retailers, or categories to find them quickly and receive only the alerts you choose.

Suggested actions:

* Browse popular items.
* Explore categories.
* View coming soon.
* Search products.

## 12.2 Filter Has No Results

Suggested message:

> No saved items match these filters.

Suggested action:

* Clear filters.

## 12.3 Item Unavailable

Suggested message:

> This item is not currently available.

Possible actions:

* Keep it saved.
* Notify me when it returns.
* View similar items.
* Remove from favorites.

---

# 13. Loading and Error States

## 13.1 Loading

Use stable skeleton states or progressive loading that does not cause significant layout shifting.

## 13.2 Save Failure

Suggested message:

> We could not save this favorite. Please try again.

The UI should restore the accurate state if an optimistic update fails.

## 13.3 Removal Failure

Suggested message:

> We could not remove this favorite. Please try again.

## 13.4 Authentication Expired

Suggested message:

> Your session expired. Sign in again to manage your favorites.

The platform should preserve the user's intended action where safely possible.

## 13.5 Item Removed from Catalog

The interface should display a safe unavailable state instead of failing or exposing a broken reference.

---

# 14. Business Rules

1. A favorite does not reserve inventory.
2. A favorite does not purchase an entry.
3. A favorite does not create a financial hold.
4. A favorite does not guarantee future pools.
5. A favorite does not guarantee a particular price.
6. A favorite does not equal marketing consent.
7. A favorite may generate alerts only when the user explicitly enables them.
8. Duplicate favorites for the same user and entity are prohibited.
9. A user may favorite an item even when no pool is currently open.
10. A retired catalog item may remain visible as unavailable.
11. A deleted pool must not destroy the underlying item favorite.
12. Favoriting a specific pool and favoriting the underlying item are separate actions.
13. Removing a favorite does not remove notification delivery history.
14. Removing a favorite should disable future favorite-derived alerts unless the user separately created a watchlist rule.
15. A user may block a favorite from influencing recommendations.
16. An administrator may retire an entity but must not silently manipulate a user's saved history.
17. Favorites cannot directly modify wallet, ledger, entry, payout, prize, rebate, or pool-capacity records.
18. Saved state must be derived from authoritative records, not analytics events.
19. Account deletion must follow the approved data-retention and legal requirements.
20. Preference merging after sign-in must be idempotent.

---

# 15. Favorites, Wishlist, and Watchlist Relationship

The platform should distinguish these behaviors while avoiding unnecessary user-interface clutter.

## Favorite

> I like this.

Suggested icon:

Heart.

## Wishlist

> I may want to buy or win this.

Suggested icon:

Bookmark, list, or shopping bag.

## Watchlist

> Notify me when something specific happens.

Suggested icon:

Bell.

## Version 1 Recommendation

Version 1 may expose:

* Favorites.
* Watch Alerts.

Wishlist may be introduced as a distinct visible concept if founder review determines that users will understand the difference.

The underlying data model should remain extensible so the interface can evolve without major redesign.

---

# 16. Suggested Data Model

The final database implementation must be reviewed against the Master Architecture before migration approval.

## 16.1 `user_favorites`

Suggested fields:

* `id`
* `user_id`
* `entity_type`
* `entity_id`
* `created_at`
* `updated_at`
* `source_surface`
* `notification_enabled`
* `recommendation_enabled`
* `is_archived`
* `metadata`

Suggested entity types:

* `item`
* `pool`
* `brand`
* `retailer`
* `category`
* `subcategory`

Recommended uniqueness constraint:

`UNIQUE (user_id, entity_type, entity_id)`

## 16.2 Possible Reference Tables

The system may require:

* `catalog_items`
* `pools`
* `brands`
* `retailers`
* `categories`
* `subcategories`

## 16.3 Polymorphic Relationship Warning

A generalized `entity_type` plus `entity_id` design is flexible but may weaken direct database foreign-key enforcement.

Before implementation, Cursor must evaluate and document alternatives such as:

* separate favorite tables,
* a generalized entity registry,
* typed relationship tables,
* or validated server-side references.

Cursor must not silently choose a polymorphic structure without explaining the integrity tradeoffs.

---

# 17. Server and API Requirements

## 17.1 Server Authority

All signed-in favorite mutations must be validated server-side.

The server must derive the acting user from verified authentication.

The client must never be trusted to provide the authoritative owner ID.

## 17.2 Required Operations

The capability should support:

* Add favorite.
* Remove favorite.
* List favorites.
* Check favorite state.
* Batch favorite-state lookup for product grids.
* Update favorite notification setting.
* Update recommendation setting.
* Merge anonymous favorites after sign-in.

## 17.3 Idempotency

Adding an already-saved favorite should return a safe successful result rather than creating duplicates.

Removing an already-removed favorite should produce a safe result rather than corrupting state.

## 17.4 Batch Lookup

Product grids may display many items.

The implementation should avoid one database request per card.

The server should support efficient batch lookup for all visible entities.

## 17.5 Rate Limits

The server should apply reasonable limits to prevent:

* automated favorite spam,
* scraping,
* database abuse,
* or intentional analytics manipulation.

## 17.6 Caching

Public item information may be cached.

Private favorite state must remain user-specific and must not leak through shared caches.

---

# 18. Security and Privacy

## 18.1 Ownership

A user may read and modify only their own favorite records.

## 18.2 Row Level Security

Row Level Security must be enabled for user-owned favorite records.

## 18.3 Authentication

The server must use verified authenticated identity.

Client-supplied `user_id` values must never determine ownership.

## 18.4 Privacy

Favorites reveal shopping interests and may be considered personal information.

The platform should:

* avoid exposing them publicly by default,
* disclose how they affect recommendations,
* allow users to clear them,
* avoid inferring sensitive personal traits,
* and minimize unnecessary retention.

## 18.5 Sensitive Inferences

The recommendation system must not use favorites to infer or target sensitive characteristics such as:

* health conditions,
* religion,
* political affiliation,
* race or ethnicity,
* sexual orientation,
* financial distress,
* or other protected or highly sensitive attributes.

## 18.6 Administrative Access

Administrative access to individual favorite histories should be restricted and logged.

Aggregate product-demand analytics should be preferred over unnecessary browsing of named user histories.

---

# 19. Fraud and Abuse Considerations

Favorites are low-risk compared with financial transactions, but they can still be abused.

Potential abuse includes:

* automated accounts inflating demand,
* fake favorite activity,
* bot-driven popularity manipulation,
* scraping,
* promotional ranking manipulation,
* and referral abuse linked to fake engagement.

Required protections may include:

* rate limits,
* bot detection,
* duplicate-account monitoring,
* suspicious-volume analytics,
* account-age signals,
* and separation between favorite counts and financial or ranking authority.

Public popularity labels must not rely solely on raw favorite counts without fraud filtering.

Favorites must never determine winners, pool outcomes, entry capacity, or financial benefits.

---

# 20. Notification Integration

Favoriting an entity must not automatically enroll the user in all alerts.

The user may choose:

* Notify me when a new pool opens.
* Notify me when this item returns.
* Notify me about similar items.
* Include this in my daily digest.
* Include this in my weekly digest.
* Do not notify me.

Notification channels and frequency are governed by:

`docs/capabilities/notifications.md`

If a favorite is removed:

* favorite-derived alerts should be disabled,
* separately created watchlist rules should remain unless the user removes them,
* and delivered-message history should remain available where required.

---

# 21. Recommendation Integration

Favorites may provide a strong recommendation signal.

Possible recommendation labels:

* Because you saved this item.
* Because you follow Groceries.
* New from a brand you follow.
* Similar to your favorites.
* More from Publix.

Requirements:

1. Recommendation logic must remain explainable.
2. Users may disable favorite-based personalization.
3. Unavailable or ineligible offers must be excluded.
4. Recommendations must not manufacture urgency.
5. Favorite activity must not be used to exploit a user's prior losses or spending.
6. Sponsored recommendations must be labeled.

---

# 22. Search Integration

Search results should show whether an entity is already favorited.

Users should be able to:

* favorite directly from search,
* filter search results to saved entities,
* follow a searched category or brand,
* and save a search separately.

A saved search is not the same as a favorite.

Saved-search behavior is governed by:

`docs/capabilities/search.md`

---

# 23. Activity History Integration

Favorite actions may appear in the user's activity history.

Examples:

* Item saved.
* Item removed.
* Category followed.
* Brand unfollowed.
* Favorite alert enabled.

The activity-history implementation should distinguish between:

* user-visible activity,
* audit history,
* analytics events,
* and notification history.

Removing a favorite does not require deleting all historical evidence that the event occurred.

---

# 24. Administrative Requirements

The admin portal should support:

* Aggregate favorite counts.
* Top favorited items.
* Top followed brands.
* Top followed retailers.
* Top followed categories.
* Favorite-to-entry conversion.
* Favorite-to-purchase conversion.
* Favorite-to-alert opt-in.
* Unavailable-item demand.
* Suspicious favorite spikes.
* Bot-related activity indicators.
* Demand by geography where legally and ethically permitted.
* Export of aggregate demand data.
* Emergency disabling of favorite-related notifications.
* Catalog planning based on genuine demand.

Administrative tools must not:

* alter a user's financial records,
* fabricate popularity,
* silently add favorites,
* or use favorites to alter pool outcomes.

Manual administrative changes must be audited.

---

# 25. Analytics Requirements

Recommended events:

* `favorite_added`
* `favorite_removed`
* `favorite_viewed`
* `favorites_page_viewed`
* `favorite_opened`
* `favorite_notification_enabled`
* `favorite_notification_disabled`
* `favorite_recommendation_enabled`
* `favorite_recommendation_disabled`
* `brand_followed`
* `brand_unfollowed`
* `retailer_followed`
* `retailer_unfollowed`
* `category_followed`
* `category_unfollowed`
* `anonymous_favorite_created`
* `anonymous_favorites_merged`
* `favorite_merge_failed`

Useful metrics:

* Favorite-to-entry conversion.
* Favorite-to-purchase conversion.
* Favorite return rate.
* Most saved items.
* Most followed categories.
* Alert opt-in rate.
* Recommendation click-through from favorites.
* Unavailable-item demand.
* Time from favorite to entry.
* Time from favorite to purchase.
* Favorite removal rate after alerts.
* Suspicious favorite velocity.

Analytics events must never become the authoritative saved-state record.

---

# 26. Accessibility Requirements

Favorite controls must:

* be keyboard accessible,
* have visible focus states,
* include screen-reader labels,
* not depend on color alone,
* meet contrast requirements,
* communicate saved and unsaved state,
* work with reduced-motion preferences,
* and remain large enough for touch interaction.

A screen reader should announce state changes such as:

> Added to favorites.

or:

> Removed from favorites.

Animated feedback must remain subtle and optional under reduced-motion settings.

---

# 27. Mobile Requirements

On mobile:

* Favorite controls must be easily tappable.
* Product-card actions must not overlap images or pricing.
* Accidental activation should be minimized.
* Filters should use an accessible drawer or sheet.
* Favorite state should remain visible without excessive card clutter.
* Account navigation should provide a clear route to Favorites.
* Sign-in prompts must not repeatedly interrupt browsing.
* Offline or weak-network failures should display understandable recovery options.

---

# 28. Performance Requirements

The favorites capability must not create one database query per product card.

The implementation should support:

* batch state lookup,
* indexed ownership queries,
* pagination,
* efficient account-page filtering,
* controlled optimistic UI,
* and safe cache boundaries.

Performance testing should include:

* large favorite lists,
* high-traffic homepage grids,
* concurrent save actions,
* and multi-device synchronization.

---

# 29. Failure and Edge Cases

The implementation must address:

* Duplicate add requests.
* Duplicate remove requests.
* Simultaneous actions from two devices.
* Anonymous favorite merged with an existing signed-in favorite.
* Item removed from catalog.
* Pool completed after the page loads.
* User session expires during save.
* Database timeout.
* Network interruption.
* Notification preference update failure.
* Recommendation setting update failure.
* User account suspended.
* Account deletion.
* Favorite references a retired brand or retailer.
* Admin retires an entity while users are viewing it.
* Browser local storage is unavailable.
* User blocks cookies or local storage.
* Batch lookup partially fails.
* Large favorite list.
* Unauthorized access attempt.
* Suspicious bot activity.

Each edge case should have:

* a safe server response,
* an understandable user message where relevant,
* an audit or analytics record where appropriate,
* and automated test coverage.

---

# 30. Testing Requirements

Automated tests should cover:

## Authorization

* User can read their own favorites.
* User cannot read another user's favorites.
* User cannot modify another user's favorites.
* Unauthenticated behavior follows the approved local-save rules.

## Data Integrity

* Duplicate favorites are prevented.
* Add operation is idempotent.
* Remove operation is idempotent.
* Invalid entity references are rejected.
* Retired entities are handled safely.

## User Experience

* Saved state renders correctly.
* Optimistic update rolls back on failure.
* Empty states render.
* Error states render.
* Mobile controls are usable.
* Accessibility labels are present.

## Integration

* Notification opt-in creates the correct preference.
* Removing a favorite disables only favorite-derived alerts.
* Recommendation preference is honored.
* Anonymous favorites merge without duplication.
* Activity history records appropriate actions.

## Performance

* Grid state uses batch lookup.
* Large lists paginate.
* No unbounded queries occur.

---

# 31. Acceptance Criteria

The Version 1 Favorites capability is complete only when:

1. Signed-in users can add and remove item favorites.
2. Signed-in users can follow and unfollow categories.
3. Duplicate favorite records cannot be created.
4. The favorites account page lists the correct records.
5. Users cannot access another user's favorite data.
6. Favorite state remains correct after refresh.
7. Favorite state remains correct across signed-in devices.
8. Unavailable items display a safe status.
9. Favorite actions never alter wallet, ledger, entry, pool-capacity, prize, rebate, or payout records.
10. Users may enable or disable favorite-derived alerts.
11. Users may control whether favorites affect recommendations.
12. The interface includes loading, empty, unavailable, and error states.
13. Mobile and keyboard interactions work.
14. Row Level Security is active and tested.
15. Duplicate and concurrent requests are handled safely.
16. Analytics events are recorded without becoming the source of truth.
17. Admin aggregate reporting works without unnecessary exposure of individual preference histories.
18. Automated tests pass.
19. Founder verification steps pass.
20. Documentation matches the implemented behavior.
21. Changes are committed to GitHub.

---

# 32. Founder Verification Checklist

Before approving the capability, the founder should verify:

1. Open the homepage.
2. Favorite an item.
3. Refresh the page.
4. Confirm the item remains saved.
5. Open the item page.
6. Confirm the favorite state matches.
7. Open the account favorites page.
8. Confirm the item appears.
9. Remove the item.
10. Confirm the state updates everywhere.
11. Follow a category.
12. Confirm the category appears in account preferences.
13. Enable a notification for a saved item.
14. Confirm the chosen frequency is displayed.
15. Disable the alert.
16. Sign in on another browser or device.
17. Confirm the favorite state synchronizes.
18. Test an unavailable item.
19. Confirm another test user cannot access the first user's records.
20. Confirm no wallet or entry record changes after favorite actions.

---

# 33. Future Enhancements

Potential future capabilities include:

* Shared favorite collections.
* Household lists.
* Public creator-curated lists.
* Holiday shopping lists.
* Gift-recipient tagging.
* Favorite notes.
* Desired purchase date.
* Location-specific retailer favorites.
* Price-change alerts.
* Automatic grouping.
* AI-assisted organization, if accurately disclosed.
* Import from browser bookmarks.
* Import from outside wishlists.
* Collaborative group gifting.
* Favorite-based budgeting tools.
* Personalized category landing pages.
* Family profiles.
* Favorite trends over time.
* Cross-device offline synchronization.

Future enhancements must not be implemented simply because they appear here.

They require separate approval and roadmap inclusion.

---

# 34. Related Documents

This capability should be reviewed alongside:

* `docs/project-index.md`
* `docs/architecture/master-architecture.md`
* `docs/architecture/ai-operating-rules.md`
* `docs/architecture/output-contract.md`
* `docs/core/product-vision.md`
* `docs/core/product-concept.md`
* `docs/capabilities/README.md`
* `docs/capabilities/wishlist.md`
* `docs/capabilities/notifications.md`
* `docs/capabilities/search.md`
* `docs/capabilities/recommendations.md`
* `docs/capabilities/user-preferences.md`
* `docs/capabilities/activity-history.md`
* `docs/capabilities/catalog.md`
* `docs/capabilities/identity-and-profile.md`
* `docs/product/homepage-spec.md`
* `docs/product/item-page-spec.md`
* `docs/product/account-wallet-spec.md`
* `docs/product/design-system-spec.md`
* `docs/operations/admin-portal-spec.md`
* `docs/operations/analytics-spec.md`
* `docs/operations/fraud-and-risk-spec.md`

---

# 35. Guiding Statement

Favorites exist to help users organize products and opportunities they genuinely care about.

The capability should make Zero-Loss easier to use, easier to personalize, and easier to return to without creating hidden financial commitments, excessive notifications, or manipulative urgency.

The user remains in control of what is saved, what influences recommendations, and what generates communication.
