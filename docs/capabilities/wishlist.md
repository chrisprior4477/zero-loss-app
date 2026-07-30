# Project Zero-Loss Wishlist & Watchlist Capability Specification
## Shopping Intent, Product Planning, and Intelligent Alerting

**Version:** 1.1  
**Status:** Authoritative  
**Document Type:** Capability Specification

---

# Purpose

The Wishlist & Watchlist capability allows customers to save products they intend to purchase or participate in later while monitoring real marketplace events that matter to them.

Unlike Favorites, which simply organize interests, Wishlist represents stronger purchase intent, while Watchlist enables customers to receive notifications when specific conditions occur.

The capability exists to support thoughtful shopping rather than impulsive participation.

Wishlist and Watchlist actions must never:

- purchase an entry,
- reserve inventory,
- create wallet holds,
- guarantee future availability,
- modify marketplace odds,
- alter pool capacity,
- or create financial commitments.

Customers always remain in complete control of what they save, monitor, and receive notifications about.

---

# 1. Capability Objectives

The Wishlist & Watchlist capability should help customers:

- organize products they genuinely want,
- plan future purchases,
- monitor marketplace activity,
- receive meaningful notifications,
- discover similar opportunities,
- and return to products without unnecessary searching.

The experience should increase convenience without increasing pressure.

---

# 2. Product Philosophy

Project Zero-Loss is designed to help customers shop smarter.

Wishlist and Watchlist should reinforce this philosophy by supporting deliberate purchasing decisions rather than encouraging impulsive behavior.

The experience should emphasize:

- customer choice,
- transparency,
- organization,
- personalization,
- and trust.

The platform should never create artificial urgency through fake scarcity, fabricated waitlists, misleading popularity indicators, or unnecessary alerts.

Every notification should correspond to a real marketplace event.

---

# 3. Definitions

To maintain consistency throughout the platform, the following concepts have distinct meanings.

---

## Favorite

A Favorite means:

> "I like this and want to find it again."

Favorites provide lightweight organization.

---

## Wishlist

A Wishlist means:

> "I may want to purchase or participate in this item later."

Wishlist entries represent stronger customer intent than Favorites.

---

## Watchlist

A Watchlist means:

> "Notify me when this specific event occurs."

Watchlists monitor real marketplace conditions chosen by the customer.

Examples include:

- new pool opens,
- coming soon becomes available,
- item returns,
- capacity threshold reached,
- entries remaining threshold reached,
- or similar products become available.

---

## Item Request

An Item Request means:

> "I would like Zero-Loss to consider offering this product."

Submitting a request does not guarantee future availability.

Every request follows the normal catalog review process.

---

# 4. Customer Outcomes

Customers should be able to:

1. Save products to a Wishlist.
2. Remove Wishlist items.
3. Create Watch Alerts.
4. Choose notification conditions.
5. Configure delivery channels.
6. Configure notification frequency.
7. Pause alerts without deleting products.
8. Keep unavailable products visible.
9. Request future catalog items.
10. Understand the difference between Favorites, Wishlist, and Watchlist.
11. Synchronize across devices.
12. Control recommendation influence.
13. Remove items without affecting financial history.

Wishlist organization should remain simple regardless of marketplace growth.

---

# 5. Customer Experience Principles

The Wishlist capability should follow several guiding principles.

## Intentional

Wishlist represents thoughtful planning rather than spontaneous activity.

---

## Informative

Customers should always understand why an item appears and what alerts are active.

---

## Customer Controlled

Customers determine:

- what is saved,
- which alerts are enabled,
- notification frequency,
- preferred delivery channels,
- and personalization settings.

---

## Respectful

Notifications should help rather than interrupt.

Customers should never feel overwhelmed by reminders.

---

## Trustworthy

Wishlist actions must never create hidden financial consequences.

---

# 6. Version 1 Scope

Version 1 includes the core shopping-planning experience.

Required functionality includes:

- one private Wishlist,
- add and remove items,
- Wishlist account page,
- synchronization,
- duplicate prevention,
- Watch Alerts,
- configurable thresholds,
- notification preferences,
- item requests,
- server-side authorization,
- accessibility,
- analytics,
- mobile support,
- and complete loading, empty, and error states.

More advanced organizational capabilities are intentionally reserved for future releases.

---

# 7. Wishlist Relationships

Wishlist integrates with several other capabilities.

### Favorites

Customers may move from:

Favorite

↓

Wishlist

when purchase intent increases.

---

### Watchlist

Customers may create Watch Alerts directly from Wishlist items.

The two capabilities remain independent.

Removing a Wishlist item should not automatically remove an independent Watch Alert.

---

### Recommendations

Wishlist data may improve recommendations only when customers allow personalization.

---

### Notifications

Notification preferences determine:

- delivery channel,
- frequency,
- quiet hours,
- and alert eligibility.

Wishlist itself does not determine notification behavior.

# 8. User Experience

The Wishlist & Watchlist experience should feel fast, organized, and intuitive across every product surface.

Customers should always understand:

- what they have saved,
- what they are watching,
- why they are receiving notifications,
- and what actions are available.

Every interaction should provide immediate visual feedback while remaining calm and professional.

---

## Wishlist Controls

Wishlist actions should use a consistent visual language throughout the application.

Recommended control:

- Bookmark icon
- Shopping list icon
- "Save for Later"

States include:

- Add to Wishlist
- Added to Wishlist
- Remove from Wishlist

The control should remain visible on:

- Homepage cards
- Category listings
- Search results
- Product pages
- Pool pages
- Recommendation modules
- Recently viewed items

---

## Watch Controls

Watch Alerts should use a separate control from Wishlist.

Recommended icon:

🔔 Bell

Examples include:

- Notify me when available
- Notify me when a new pool opens
- Notify me when only 10 entries remain
- Notify me when 80% full
- Stop Watching

Watch controls should clearly communicate what condition is being monitored.

---

## Favorite vs Wishlist vs Watchlist

The platform must clearly distinguish the three concepts.

| Capability | Meaning |
|------------|---------|
| ❤️ Favorite | I like this. |
| 🔖 Wishlist | I want to purchase or participate later. |
| 🔔 Watchlist | Notify me when something happens. |

Although the interface may visually group these controls, the underlying behavior must remain completely independent.

---

## Customer Feedback

Successful actions should provide subtle confirmation.

Examples:

> Added to Wishlist

> Removed from Wishlist

> Watch Enabled

> Watch Paused

Animations should be quick, unobtrusive, and never resemble casino effects.

If the server rejects a request, optimistic interface updates should automatically roll back.

---

## Anonymous Visitors

Visitors who are not signed in may maintain a temporary local Wishlist.

If they later create an account or sign in, the application may safely merge local Wishlist data into their permanent account.

Merge operations must:

- prevent duplicates,
- preserve existing records,
- remain idempotent,
- and never overwrite server-authoritative data.

---

## Removing Items

Removing an item from a Wishlist should:

- remove only the Wishlist relationship,
- preserve financial history,
- preserve completed transactions,
- preserve ledger history,
- and leave separate Watch Alerts unchanged unless the customer explicitly removes them.

---

# 9. Product Surfaces

Wishlist and Watchlist functionality should be available wherever meaningful shopping decisions occur.

Supported locations include:

- Homepage
- Category pages
- Brand pages
- Retailer pages
- Product pages
- Pool pages
- Coming Soon listings
- Search Results
- Recommendation sections
- Favorites page
- Recently Viewed
- Account Dashboard
- Notification Preferences
- Saved Searches
- Mobile navigation

Customers should never need to navigate deep into Account Settings simply to save an item.

---

# 10. Wishlist Account Page

Recommended route:

`/account/wishlist`

The Wishlist page serves as the customer's shopping planner.

---

## Primary Sections

Recommended organization includes:

- All Wishlist Items
- Available Now
- Active Pools
- Coming Soon
- Temporarily Unavailable
- Completed
- Active Watches
- Paused Watches
- Item Requests

---

## Wishlist Cards

Each Wishlist card should display, where appropriate:

- Product image
- Product name
- Brand
- Retailer
- Category
- Retail value
- Entry price
- Current pool status
- Capacity progress
- Entries remaining
- Coming Soon availability
- Safety Net summary
- Date saved
- Active watch indicator
- Primary action button
- Remove control

Cards should remain consistent with the Design System specification.

---

## Filtering

Customers should be able to filter by:

- Availability
- Category
- Brand
- Retailer
- Pool Status
- Active Watches
- Recently Added
- Coming Soon
- Retail Value
- Entry Price

Filtering should always occur using server-authoritative data.

---

## Sorting

Recommended sort options include:

- Recently Added
- Oldest Saved
- Available Now
- Coming Soon
- Highest Retail Value
- Lowest Retail Value
- Highest Entry Price
- Lowest Entry Price
- Closest to Capacity
- Alphabetical

Sorting based on urgency must only use genuine marketplace data.

Artificial urgency is prohibited.

---

# 11. Watchlist Rules

Watch Alerts allow customers to monitor real marketplace conditions.

---

## Supported Watch Types

Version 1 supports:

- New Pool Opened
- Coming Soon Item Available
- Pool Capacity Percentage
- Entries Remaining
- Item Returns
- Similar Item Available

Each Watch monitors only one specific condition.

---

## Capacity Thresholds

Suggested preset thresholds include:

- 50%
- 75%
- 80%
- 90%
- 95%

Thresholds should remain configurable by platform administrators.

---

## Remaining Entry Thresholds

Suggested presets include:

- 25 Remaining
- 10 Remaining
- 5 Remaining
- 1 Remaining

Customers should clearly understand when each notification will occur.

---

## Trigger Behavior

Threshold notifications fire once when the monitored condition becomes true.

Notifications must never continuously resend while the condition remains unchanged.

If marketplace conditions reverse and later cross the threshold again, server rules determine whether another notification is appropriate.

---

## Pool-Level Watches

A Pool Watch follows one specific pool.

When that pool completes:

- progress notifications stop,
- capacity notifications stop,
- remaining-entry notifications stop.

Pool Watches never automatically transfer to replacement pools.

---

## Item-Level Watches

Item Watches follow the product itself rather than one individual pool.

If future pools become available, customers may receive alerts according to their selected preferences.

Item-level Watches remain independent from any previous completed pools.

---

# 12. Item Requests

Customers may request products not currently available within Project Zero-Loss.

Requests help improve future catalog planning while making no promise of inclusion.

---

## Required Information

Recommended request fields include:

- Product Name
- Brand
- Retailer
- Category
- Optional Product URL
- Desired Retail Value
- Additional Notes
- Notification Preference

---

## Customer Expectations

Submitting an Item Request means:

- the request enters review,
- moderation may occur,
- duplicate requests may be grouped,
- prohibited products may be rejected,
- and catalog availability is never guaranteed.

Suggested confirmation message:

> Thank you. Your request has been submitted for review. We appreciate your feedback and will evaluate it as part of future catalog planning.

# 13. Empty, Loading, and Error States

The Wishlist & Watchlist experience should gracefully handle every customer state while maintaining confidence and clarity.

---

## Empty Wishlist

When a customer has not saved any items, display a welcoming empty state.

**Primary Message**

> Your Wishlist is empty.

**Supporting Text**

> Save products you may want to purchase or participate in later so they're always easy to find.

Suggested actions:

- Browse Products
- Explore Categories
- View Recommendations
- Search the Marketplace

The empty state should encourage discovery without creating urgency.

---

## No Active Pools

When none of the customer's Wishlist items currently have an active pool:

> None of your saved items currently have an active pool.

Suggested actions include:

- Notify me when one becomes available
- Browse Coming Soon
- Explore Similar Products

Customers should understand that unavailable items remain safely stored in their Wishlist.

---

## Loading States

Loading screens should use stable skeleton placeholders.

Requirements include:

- minimal layout shift,
- responsive loading,
- predictable placement,
- and consistent Design System components.

Customers should never experience flashing interfaces or unnecessary animations.

---

## Error States

Errors should be understandable and actionable.

Examples include:

> We couldn't add this item to your Wishlist. Please try again.

> We couldn't remove this item.

> We couldn't create this Watch Alert.

> Your session has expired. Please sign in again.

Temporary failures should preserve customer intent whenever possible.

---

# 14. Business Rules

The Wishlist & Watchlist capability must remain completely independent from the financial systems of Project Zero-Loss.

Business rules include:

1. Wishlist items never reserve inventory.
2. Wishlist items never purchase entries.
3. Wishlist items never create wallet holds.
4. Wishlist items never guarantee future availability.
5. Watch Alerts never guarantee notification delivery.
6. Alert conditions must use genuine marketplace data.
7. Duplicate Wishlist items are prohibited.
8. Duplicate equivalent Watch Alerts are prohibited.
9. Multiple Watch conditions for the same item are permitted.
10. Removing a Wishlist item does not erase customer history.
11. Removing a Wishlist item does not automatically remove independent Watch Alerts.
12. Removing a Watch Alert does not remove the Wishlist item.
13. Completed pools stop pool-specific alerts.
14. Item Watches may continue across future pools.
15. Retired products may remain visible.
16. Customers may pause notifications without deleting Watches.
17. Item Requests require moderation.
18. Wishlist personalization follows customer preferences.
19. Wishlist data never becomes financial truth.
20. Ownership is always verified server-side.
21. Administrative actions are fully audited.

The server remains the single authoritative source of Wishlist state.

---

# 15. Data Model

Final implementation should align with the Master Architecture specification.

Recommended entities include:

### Wishlists

Stores each customer's Wishlist.

Typical fields include:

- ID
- User ID
- Name
- Default Flag
- Visibility
- Created Date
- Updated Date
- Archived Date

Version 1 supports one default private Wishlist.

---

### Wishlist Items

Each record represents one saved product.

Suggested fields include:

- Wishlist ID
- Item ID
- Date Added
- Source Surface
- Priority
- Notes
- Desired Price
- Preferred Retailer
- Target Date
- Metadata

Recommended constraint:

One item may exist only once within a customer's Wishlist.

---

### Watch Records

Watch entities should include:

- User
- Item
- Pool
- Watch Type
- Threshold
- Notification Channel
- Frequency
- Enabled
- Paused Until
- Last Evaluated
- Last Triggered
- Current State
- Metadata

Each Watch should contain enough information to safely evaluate conditions without ambiguity.

---

### Item Requests

Suggested fields include:

- Product Name
- Brand
- Retailer
- Category
- Product URL
- Desired Value
- Status
- Moderation Notes
- Duplicate Group
- Review Information

Moderation data remains internal.

---

# 16. Server Requirements

The server is responsible for all authoritative Wishlist operations.

Required capabilities include:

- Create default Wishlist
- Add item
- Remove item
- Retrieve Wishlist
- Batch Wishlist lookup
- Create Watch
- Update Watch
- Pause Watch
- Resume Watch
- Delete Watch
- Evaluate Watch conditions
- Submit Item Request
- Merge anonymous Wishlists

All write operations should be idempotent.

Batch endpoints should be used for product grids to avoid excessive database queries.

Private Wishlist information must never leak through shared caches.

---

# 17. Capability Integrations

Wishlist interacts with several other Project Zero-Loss capabilities.

---

## Notifications

Notifications deliver Watch Alerts according to customer preferences.

Wishlist itself does not authorize marketing communications.

Customers choose:

- channel,
- frequency,
- quiet hours,
- and delivery preferences.

---

## Favorites

Favorites and Wishlist represent different customer intent.

Customers may:

Favorite

↓

Wishlist

without affecting either capability.

---

## Recommendations

Wishlist activity may improve recommendations only when customers permit personalization.

Recommendations should always explain why an item appears.

---

## Search

Search results should display Wishlist status.

Customers should be able to:

- add items,
- remove items,
- create Watches,
- and request unavailable products directly from search results.

---

## Catalog

Catalog changes should never corrupt customer Wishlists.

Unavailable products should display appropriate availability messaging rather than disappearing unexpectedly.

---

## Activity History

Customer-visible history may include:

- Wishlist Added
- Wishlist Removed
- Watch Created
- Watch Paused
- Watch Triggered
- Item Request Submitted
- Item Request Updated

These records remain independent from:

- financial ledger entries,
- audit logs,
- notification delivery,
- and analytics events.

# 18. Security Requirements

Wishlist and Watchlist data represent customer preferences and shopping intent.

While they are not financial records, they must be protected with the same commitment to privacy and security applied throughout Project Zero-Loss.

---

## Authorization

Only authenticated customers may:

- create Wishlists,
- modify Wishlist items,
- create Watch Alerts,
- pause Watches,
- resume Watches,
- delete Watches,
- submit Item Requests,
- and manage their own preferences.

The server must derive ownership from the authenticated session.

Client-provided ownership information must never be trusted.

---

## Row-Level Security

All Wishlist data must be protected by Row-Level Security (RLS).

Customers must never be able to:

- read another customer's Wishlist,
- modify another customer's Watches,
- access another customer's Item Requests,
- or enumerate private Wishlist information.

All authorization decisions are enforced server-side.

---

## Administrative Access

Administrative users should have only the minimum access required to perform operational duties.

Administrative actions should require appropriate permissions and be fully audited.

Administrative users must never:

- silently modify customer Wishlists,
- create Wishlist entries on behalf of customers,
- fabricate Watch Alerts,
- or manipulate customer shopping intent.

---

# 19. Privacy Requirements

Wishlist data represents personal shopping preferences.

Customers should understand:

- what information is stored,
- how it is used,
- how recommendations are generated,
- and how notifications are triggered.

Wishlist information should remain private by default.

Future sharing features must always require explicit customer consent.

Customers should be able to:

- delete Wishlist items,
- remove Watches,
- disable personalization,
- and manage notification preferences at any time.

Wishlist information must never be used to infer sensitive personal characteristics or create discriminatory experiences.

---

# 20. Fraud Prevention

Although Wishlist activity has no financial impact, abuse prevention remains important.

Potential abuse includes:

- automated Wishlist generation,
- bot-created Watches,
- artificial demand inflation,
- scraping,
- request spam,
- referral abuse,
- fake popularity,
- and automated catalog manipulation.

Recommended protections include:

- rate limiting,
- bot detection,
- duplicate-account detection,
- request deduplication,
- anomaly detection,
- suspicious activity monitoring,
- velocity limits,
- and abuse analytics.

Wishlist metrics must never influence:

- winner selection,
- pool odds,
- pool capacity,
- rebates,
- payouts,
- ledger balances,
- or financial outcomes.

---

# 21. Administrative Requirements

The Administrative Portal should provide aggregate operational reporting while protecting individual customer privacy.

Recommended dashboards include:

- Most Wishlisted Items
- Most Watched Items
- Most Requested Products
- Category Demand
- Brand Demand
- Retailer Demand
- Watch Trigger Health
- Notification Delivery Health
- Request Moderation Queue
- Duplicate Request Groups
- Suspicious Activity
- Aggregate Demand Trends

Administrative tools should never manufacture demand or artificially influence customer behavior.

Every administrative action should generate a permanent audit record.

---

# 22. Analytics

Wishlist interactions provide valuable product insights.

Recommended events include:

- wishlist_item_added
- wishlist_item_removed
- wishlist_page_viewed
- wishlist_item_opened
- watch_created
- watch_updated
- watch_paused
- watch_resumed
- watch_disabled
- watch_triggered
- watch_notification_sent
- item_request_submitted
- item_request_reviewed

Useful business metrics include:

- Wishlist growth
- Wishlist retention
- Wishlist-to-entry conversion
- Wishlist-to-purchase conversion
- Watch engagement
- Notification open rate
- Notification click rate
- Most Requested Products
- Category demand
- Brand demand
- Retailer demand
- Item Request approval rate

Analytics provide reporting only.

They never become the authoritative source of Wishlist data.

---

# 23. Accessibility

Wishlist & Watchlist must be fully accessible.

Requirements include:

- complete keyboard navigation,
- visible focus indicators,
- descriptive screen-reader labels,
- sufficient color contrast,
- reduced-motion support,
- touch-friendly controls,
- and clear state announcements.

Examples include:

> Added to Wishlist.

> Removed from Wishlist.

> Watch Enabled.

> Watch Paused.

State changes should always be announced to assistive technologies.

---

# 24. Mobile Experience

The mobile experience should prioritize simplicity and speed.

Wishlist actions should remain easily accessible from:

- product cards,
- product pages,
- search results,
- recommendations,
- and account pages.

Watch configuration may use an accessible bottom sheet or modal.

Large Wishlists should support:

- pagination,
- lazy loading,
- efficient searching,
- and filtering.

Weak network conditions should never silently lose customer actions.

---

# 25. Performance Requirements

Wishlist must scale efficiently as the platform grows.

Recommended implementation includes:

- indexed ownership queries,
- batch Wishlist lookups,
- efficient Watch evaluation,
- paginated results,
- deduplicated background jobs,
- optimistic interface updates,
- and safe customer-specific caching.

Performance testing should include:

- large Wishlists,
- thousands of active Watches,
- concurrent device updates,
- high notification volume,
- and heavy marketplace activity.

---

# 26. Failure and Edge Cases

The implementation should safely handle situations including:

- duplicate add requests,
- duplicate remove requests,
- simultaneous multi-device edits,
- anonymous account merges,
- retired products,
- completed pools,
- threshold reversals,
- duplicate notification events,
- notification provider failures,
- deleted products,
- Watch removal while Wishlist remains,
- Wishlist removal while Watch remains,
- account suspension,
- malformed requests,
- excessive submission attempts,
- replaced catalog items,
- unavailable local storage,
- unauthorized access,
- and automated bot activity.

Every edge case should have:

- predictable server behavior,
- understandable customer messaging,
- logging,
- monitoring,
- and automated testing.

---

# 27. Testing Requirements

Testing should verify:

### Authorization

- Customers access only their own Wishlist.
- Administrative permissions function correctly.

### Data Integrity

- Duplicate Wishlist entries are prevented.
- Duplicate Watches are prevented.
- Idempotent operations succeed.
- Invalid references are rejected.

### Watch Evaluation

- Thresholds trigger once.
- Duplicate notifications are prevented.
- Pool Watches remain separate from Item Watches.
- Completed pools stop progress notifications.

### User Experience

- Empty states function.
- Loading states function.
- Error recovery functions.
- Mobile layouts pass testing.
- Accessibility requirements pass testing.

### Integration

- Notification preferences are respected.
- Recommendation preferences are respected.
- Activity History records correctly.
- Analytics remain non-authoritative.

### Performance

- Batch lookups function efficiently.
- Large Wishlists remain responsive.
- Background evaluation scales safely.

---

# 28. Acceptance Criteria

Version 1 is complete when:

1. Customers can create and manage a Wishlist.
2. Duplicate Wishlist entries cannot be created.
3. Watch Alerts function correctly.
4. Alert thresholds evaluate accurately.
5. Duplicate notifications are prevented.
6. Customers control notification preferences.
7. Wishlist synchronization works across devices.
8. Unauthorized access is prevented.
9. Row-Level Security is active.
10. Item Requests enter moderation.
11. Unavailable products display safely.
12. Wishlist actions never affect financial systems.
13. Mobile functionality is complete.
14. Accessibility requirements pass.
15. Administrative reporting functions correctly.
16. Fraud protections operate correctly.
17. Automated testing passes.
18. Documentation reflects implemented behavior.

---

# 29. Related Specifications

This capability should always be implemented alongside:

- Master Architecture
- AI Operating Rules
- Output Contract
- Product Vision
- Product Concept
- Favorites
- Notifications
- Search
- Recommendations
- User Preferences
- Activity History
- Catalog
- Identity & Profile
- Homepage Specification
- Item Page Specification
- Account Wallet Specification
- Design System Specification
- Administrative Portal Specification
- Analytics Specification
- Fraud & Risk Specification

---

# 30. Governance

The Wishlist & Watchlist capability is the authoritative specification governing saved products, customer purchase intent, and marketplace monitoring within Project Zero-Loss.

Future enhancements should strengthen:

- customer organization,
- transparency,
- personalization,
- accessibility,
- operational performance,
- and long-term customer trust.

No implementation may introduce hidden financial commitments, artificial urgency, fabricated demand, misleading notifications, or behavior that conflicts with the core philosophy of Project Zero-Loss.

