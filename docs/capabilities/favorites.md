# Project Zero-Loss Favorites Capability Specification
## Saved Items, Following, Personalized Discovery, and Customer Intent

**Version:** 1.1  
**Status:** Authoritative  
**Document Type:** Capability Specification

---

# Purpose

The Favorites capability allows customers to save products, pools, brands, retailers, and categories they want to revisit.

Rather than functioning as a purchasing mechanism, Favorites help customers organize interests, simplify product discovery, and personalize their marketplace experience.

The capability exists to improve convenience while respecting customer choice.

Favoriting an item must never:

- purchase an entry,
- reserve inventory,
- create financial commitments,
- modify wallet balances,
- guarantee future availability,
- or automatically enroll the customer in marketing communications.

Favorites are organizational tools—not financial actions.

---

# 1. Capability Objectives

The Favorites capability should help customers:

- quickly locate products they care about,
- organize future shopping interests,
- discover similar opportunities,
- receive optional notifications,
- personalize recommendations,
- and maintain continuity across devices.

The experience should reduce friction without encouraging impulsive behavior.

---

# 2. Product Philosophy

Favorites reinforce Project Zero-Loss as a shopping-first marketplace.

The capability should communicate that customers remain in complete control of:

- what they save,
- what they follow,
- what notifications they receive,
- and how their saved interests influence recommendations.

Saved items should improve convenience—not create pressure.

The platform should never use Favorites to manufacture urgency or manipulate purchasing behavior.

---

# 3. Definitions

To maintain consistency across the platform, the following terms have distinct meanings.

## Favorite

A Favorite means:

> "I like this and want to find it again."

A Favorite represents a lightweight saved relationship between a customer and an entity.

---

## Wishlist

A Wishlist represents stronger purchase intent.

It generally means:

> "I may want to buy or participate in this later."

Wishlist behavior is governed by the Wishlist Capability Specification.

---

## Watch Alert

A Watch Alert represents a notification preference.

It means:

> "Notify me when something important happens."

Examples include:

- a new pool opens,
- an item returns,
- inventory becomes available,
- or a configured marketplace condition occurs.

Watch Alerts are governed by the Notifications Capability Specification.

---

## Follow

Following applies to broader entities rather than individual products.

Examples include:

- categories,
- brands,
- retailers,
- and future creator collections.

Following tells the platform:

> "Show me more opportunities like this."

---

## Saved Entity

A Saved Entity is any supported object that may be favorited or followed.

Supported entity types are defined later in this specification.

---

# 4. Supported Favorite Types

The Favorites capability supports several kinds of saved relationships.

Each serves a different customer need while remaining visually consistent.

---

## Item Favorite

An Item Favorite represents a specific catalog item.

Examples include:

- Apple AirPods Pro
- Publix Gift Card
- Milwaukee Tool Set
- Disney Vacation Package
- YETI Cooler

Saving an item helps customers quickly locate it again regardless of current pool availability.

---

## Pool Favorite

A Pool Favorite represents one specific marketplace pool.

Customers may care about a particular live opportunity rather than every future offering for the same item.

Pool Favorites should remain independent from Item Favorites.

---

## Brand Follow

Customers may follow brands they enjoy.

Examples include:

- Apple
- LEGO
- Milwaukee
- Sony
- Ninja
- YETI

Following a brand allows the marketplace to surface future opportunities related to that brand.

---

## Retailer Follow

Customers may follow retailers or service providers.

Examples include:

- Publix
- Walmart
- Target
- Home Depot
- Airbnb
- Delta

Retailer follows help personalize future discovery experiences.

---

## Category Follow

Customers may follow broad shopping interests.

Examples include:

- Electronics
- Travel
- Groceries
- Restaurants
- Gaming
- Home Improvement
- Outdoors
- Fitness
- Gift Cards

Category follows provide long-term personalization without requiring individual item selection.

---

## Subcategory Follow

More specific interests may also be followed.

Examples include:

- Pizza
- Cruises
- Power Tools
- Smart Home
- Tires
- Grocery Gift Cards

Subcategories allow customers to fine-tune recommendations while avoiding unnecessary marketing noise.

---

# 5. Customer Outcomes

A successful Favorites capability allows customers to:

1. Save products from anywhere in the marketplace.
2. Remove saved items at any time.
3. Follow brands, retailers, and categories.
4. Review all saved entities in one location.
5. Understand whether saved items are currently available.
6. Convert Favorites into Watch Alerts when desired.
7. Decide whether Favorites influence recommendations.
8. Access Favorites across every signed-in device.
9. Understand why certain recommendations appear.
10. Keep unavailable products visible rather than silently removing them.

These outcomes prioritize customer organization over platform promotion.

---

# 6. Experience Principles

The Favorites experience should consistently reinforce five principles.

## Simplicity

Saving something should require minimal effort.

---

## Transparency

Customers always understand what has been saved.

---

## Customer Control

Customers decide how Favorites affect their experience.

---

## Continuity

Saved entities remain available across sessions and devices.

---

## Trust

Favoriting something should never trigger unexpected financial or marketing consequences.

---

# 7. Version 1 Scope

The first release of Favorites should include the core functionality required to support product discovery and personalization.

Required capabilities include:

- signed-in Favorites,
- category follows,
- add and remove actions,
- Favorites account page,
- synchronization across devices,
- duplicate prevention,
- filtering,
- optional notification preferences,
- recommendation integration,
- mobile support,
- accessibility,
- analytics,
- server-side authorization,
- and graceful loading, empty, and error states.

Future enhancements are intentionally deferred to maintain a focused and reliable Version 1 experience.

# 8. User Experience

The Favorites capability should be available throughout the marketplace without interrupting the customer's shopping experience.

Favoriting an item should feel effortless, consistent, and immediately understandable.

The interface should always communicate whether an entity is currently saved while allowing the customer to reverse the action at any time.

---

# 9. Favorite Controls

A Favorite control should appear anywhere a customer may reasonably want to save an item.

Recommended locations include:

- Homepage product cards
- Search results
- Category pages
- Brand pages
- Retailer pages
- Item detail pages
- Recommendation modules
- Recently viewed sections
- Featured promotions
- Coming Soon listings

The control should remain visually consistent across every page.

---

## Favorite Icon

Version 1 should use a heart icon.

States include:

**Not Favorited**

- Outlined heart
- Accessible label: "Add to Favorites"

**Favorited**

- Filled heart
- Accessible label: "Remove from Favorites"

The icon should never be the only method of communicating state.

Screen readers must receive descriptive labels.

---

# 10. Saving an Item

When a customer selects the Favorite control:

1. The interface should immediately reflect the new state.
2. The request should be submitted to the server.
3. The server validates ownership.
4. The favorite is persisted.
5. The interface confirms success.

Optimistic UI updates are encouraged provided the interface gracefully restores the previous state if the server rejects the request.

---

# 11. Removing a Favorite

Removing a favorite should be just as simple as adding one.

Removing a favorite should:

- require only one action,
- immediately update the interface,
- support a short undo opportunity when practical,
- and synchronize across devices.

Removing a favorite must never remove:

- purchase history,
- entry history,
- wallet history,
- transaction history,
- notifications already delivered,
- audit records,
- or analytics required for reporting.

---

# 12. Following Brands, Categories, and Retailers

Following broader entities allows customers to personalize discovery without saving individual products.

Supported entities include:

- Brands
- Retailers
- Categories
- Subcategories

Future versions may expand this capability to include:

- creators,
- influencers,
- seasonal collections,
- curated lists,
- and promotional campaigns.

Following should remain optional and customer-controlled.

---

# 13. Anonymous Visitors

Visitors should be able to save products before creating an account.

Temporary favorites may be stored locally within the browser.

If the visitor later creates an account or signs in, the platform should offer to merge those favorites into the authenticated account.

The merge process must:

- avoid duplicates,
- preserve timestamps where practical,
- maintain customer intent,
- and never overwrite existing records unnecessarily.

---

# 14. Signed-In Customers

For authenticated customers, the server maintains the authoritative record.

The client interface may temporarily display optimistic updates, but all favorite relationships must ultimately be derived from verified server-side data.

Ownership must always be determined from authenticated identity.

Client-supplied user identifiers must never be trusted.

---

# 15. Favorites Account Page

Recommended route:

`/account/favorites`

The page serves as the central location for managing every saved entity.

Customers should immediately understand:

- what has been saved,
- why it was saved,
- whether it is available,
- and what actions are available.

---

## Primary Sections

The page should support logical organization including:

- All Favorites
- Items
- Pools
- Brands
- Retailers
- Categories
- Available
- Coming Soon
- Unavailable
- Archived (future)

Each section should load independently without requiring a full page refresh.

---

# 16. Favorite Cards

Each Favorite should appear as a reusable card using the shared Design System.

Recommended information includes:

- Product image
- Item name
- Brand
- Retailer
- Category
- Retail value
- Participation price
- Current availability
- Pool status
- Pool progress
- Date saved
- Notification status
- Watch Alert status
- Primary action
- Remove action

Cards should never overwhelm customers with unnecessary information.

Financial data should remain visually prominent.

---

# 17. Filtering

Customers should be able to filter Favorites using combinations of:

- Entity type
- Category
- Brand
- Retailer
- Availability
- Active pools
- Upcoming pools
- Notification enabled
- Recently saved

Filters should update results immediately while preserving performance.

---

# 18. Sorting

Recommended sorting options include:

- Most Recently Saved
- Oldest Saved
- Alphabetical
- Available Now
- Coming Soon
- Highest Retail Value
- Lowest Participation Price
- Closest to Capacity

Any urgency-related sorting must always be based on authoritative server data.

Artificial urgency is prohibited.

---

# 19. Empty States

When customers have no Favorites, the experience should encourage exploration rather than frustration.

Suggested message:

> You haven't saved anything yet.

Supporting text:

> Save products, brands, retailers, or categories so you can quickly find them again and receive only the updates you choose.

Suggested actions:

- Browse Products
- Explore Categories
- View Coming Soon
- Search Marketplace

---

# 20. Loading States

Loading should use skeleton components defined within the Design System.

Skeletons should closely resemble the final layout to reduce perceived wait time.

Large layout shifts should be avoided.

Loading indicators should remain subtle and never block unrelated interactions.

---

# 21. Error States

Failures should always explain what happened without exposing technical details.

Examples include:

**Save Failed**

> We couldn't save this favorite. Please try again.

**Remove Failed**

> We couldn't remove this favorite. Please try again.

**Session Expired**

> Your session has expired. Please sign in again to continue managing your favorites.

Whenever possible, the customer's intended action should be preserved after recovery.

# 22. Business Rules

The Favorites capability must remain independent from all financial operations within Project Zero-Loss.

The following rules govern Version 1.

1. Favoriting an item does not reserve inventory.
2. Favoriting an item does not purchase an entry.
3. Favoriting an item does not create a financial hold.
4. Favoriting an item does not guarantee future availability.
5. Favoriting an item does not guarantee pricing.
6. Favoriting an item does not grant priority access.
7. Favoriting an item does not automatically subscribe the customer to notifications.
8. Notification enrollment always requires customer consent.
9. Duplicate favorites for the same customer and entity are prohibited.
10. Customers may favorite items regardless of current pool availability.
11. Retired catalog items may remain visible as unavailable.
12. Favoriting an item and favoriting one of its pools are separate relationships.
13. Removing a favorite does not erase historical activity.
14. Removing a favorite disables only favorite-derived alerts.
15. Customers may prevent favorites from influencing recommendations.
16. Administrative actions must never silently alter customer favorites.
17. Favorites must never modify ledger balances, wallet balances, entries, prizes, rebates, payouts, or pool capacity.
18. The server remains the authoritative source of favorite state.

---

# 23. Notifications Integration

Favorites and Notifications work together but remain independent capabilities.

Saving an item should never automatically generate recurring communications.

Customers may optionally enable notifications such as:

- New pool available
- Item available again
- Similar products available
- Daily digest
- Weekly digest
- Category updates
- Brand updates

Notification preferences are governed by the Notifications Capability Specification.

Removing a favorite should disable only alerts directly associated with that favorite.

Watch Alerts created independently should remain active until explicitly removed.

---

# 24. Recommendation Integration

Favorites provide valuable personalization signals.

Examples include:

- Because you saved this item
- More from this brand
- Similar products
- New items in categories you follow
- Customers who saved this also explored...

Recommendation logic should remain transparent.

Customers should always understand why content appears.

Users must be able to disable favorite-based personalization.

Recommendations should never:

- manufacture urgency,
- exploit prior spending,
- exploit prior losses,
- or disguise sponsored content.

Sponsored recommendations must always be clearly identified.

---

# 25. Search Integration

Search should recognize favorite relationships throughout the browsing experience.

Customers should be able to:

- favorite directly from search,
- identify saved products,
- filter to favorites,
- follow searched categories,
- follow searched brands,
- and save searches independently.

Saved Searches and Favorites are separate concepts.

Each serves a different customer need.

---

# 26. Activity History Integration

Favorite activity may appear in the customer's Activity History.

Examples include:

- Favorite Added
- Favorite Removed
- Category Followed
- Brand Followed
- Notification Enabled
- Notification Disabled

Activity History exists to help customers understand previous actions.

Historical records should remain available even after a favorite is removed where required for auditing or customer history.

---

# 27. Security Requirements

Customer favorites represent personal preference data.

Access must remain private.

Only authenticated customers may modify their own favorite records.

The server must derive ownership from authenticated identity.

Client-provided ownership information must never be trusted.

Administrative access should be restricted to authorized personnel and recorded through the audit system.

---

# 28. Privacy Requirements

Favorites reveal customer interests and should be treated as personal information.

The platform should:

- avoid public exposure,
- explain recommendation usage,
- allow customers to delete favorites,
- minimize unnecessary retention,
- and respect customer privacy preferences.

Favorites must never be used to infer sensitive characteristics such as:

- health conditions,
- religion,
- political affiliation,
- race,
- ethnicity,
- sexual orientation,
- financial hardship,
- or other protected information.

---

# 29. Fraud Prevention

Although Favorites do not directly affect financial outcomes, abuse protection remains important.

Potential abuse includes:

- automated favorite generation,
- fake popularity,
- scraping,
- artificial demand inflation,
- bot activity,
- referral manipulation,
- and promotional abuse.

Recommended protections include:

- rate limiting,
- bot detection,
- duplicate account monitoring,
- suspicious activity detection,
- behavioral analysis,
- and anomaly monitoring.

Favorite counts should never directly determine:

- marketplace ranking,
- pool outcomes,
- winner selection,
- financial calculations,
- or reward eligibility.

---

# 30. Administrative Requirements

The administrative portal should provide aggregate reporting while protecting individual customer privacy.

Recommended reporting includes:

- Most Favorited Items
- Most Followed Brands
- Most Followed Retailers
- Most Followed Categories
- Favorite Growth Trends
- Favorite-to-Participation Conversion
- Favorite-to-Purchase Conversion
- Alert Opt-In Rates
- Unavailable Product Demand
- Suspicious Activity Detection

Administrative tools must never:

- create favorites on behalf of customers,
- remove favorites without authorization,
- manipulate popularity metrics,
- or influence marketplace outcomes.

All administrative actions should be fully audited.

---

# 31. Analytics

Recommended analytics events include:

- favorite_added
- favorite_removed
- favorite_viewed
- favorites_page_viewed
- favorite_notification_enabled
- favorite_notification_disabled
- brand_followed
- retailer_followed
- category_followed

Useful operational metrics include:

- Favorites created
- Favorites removed
- Favorite conversion rates
- Notification opt-in rate
- Recommendation engagement
- Category popularity
- Favorite retention
- Demand trends

Analytics provide reporting only.

They must never become the authoritative source of favorite state.

---

# 32. Accessibility

Favorites must fully support accessible interaction.

Requirements include:

- keyboard navigation,
- visible focus indicators,
- descriptive screen-reader labels,
- sufficient color contrast,
- touch-friendly controls,
- reduced-motion support,
- and clear status announcements.

State changes should be announced appropriately, including:

> Added to Favorites.

and

> Removed from Favorites.

---

# 33. Mobile Experience

The mobile experience should prioritize speed and ease of use.

Favorite controls should remain:

- easy to tap,
- visually consistent,
- unobtrusive,
- and immediately recognizable.

Customers should always have a simple route to the Favorites page from their account.

Temporary network failures should present understandable recovery options rather than losing customer actions.

---

# 34. Performance Requirements

The Favorites capability should scale efficiently.

Implementation should support:

- batch favorite-state retrieval,
- indexed database queries,
- efficient pagination,
- server-side filtering,
- optimistic updates,
- and safe caching boundaries.

Large favorite collections should remain responsive on both desktop and mobile devices.

---

# 35. Acceptance Criteria

The Favorites capability is complete when:

1. Customers can add and remove favorites.
2. Category follows function correctly.
3. Duplicate favorites cannot be created.
4. Favorite state synchronizes across devices.
5. Favorite pages display accurate information.
6. Customers cannot access another user's favorites.
7. Unavailable items remain visible with appropriate messaging.
8. Notification preferences function independently.
9. Recommendation preferences are respected.
10. Wallets, ledgers, entries, prizes, rebates, and payouts remain unaffected.
11. Mobile interactions are fully supported.
12. Accessibility requirements are satisfied.
13. Administrative reporting functions correctly.
14. Automated testing passes.
15. Documentation accurately reflects implemented behavior.

---

# 36. Governance

The Favorites capability serves as the authoritative specification for all saved-item behavior within Project Zero-Loss.

Future enhancements should strengthen:

- customer organization,
- personalization,
- transparency,
- accessibility,
- performance,
- and trust.

No future implementation should introduce hidden financial effects, misleading urgency, or behavior that conflicts with the platform's shopping-first philosophy.

