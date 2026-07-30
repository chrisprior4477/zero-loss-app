# Project Zero-Loss Item Page Specification
## Product Detail, Pool Participation, and Conversion Experience

**Version:** 1.1  
**Status:** Authoritative  
**Document Type:** Product Specification

---

# Purpose

The Item Page is the marketplace's primary conversion experience.

Once a customer selects a product from the homepage or another discovery surface, this page provides everything necessary to make an informed participation decision.

The Item Page should:

- explain the product,
- communicate the opportunity,
- reinforce customer trust,
- present live marketplace information,
- and provide a frictionless participation experience.

Every element should reduce uncertainty while increasing confidence.

---

# 1. Primary Objectives

The Item Page has six primary objectives.

## Explain the Product

Customers should immediately understand:

- what the product is,
- its approximate retail value,
- who fulfills it,
- and why it is desirable.

---

## Explain the Opportunity

Customers should quickly understand:

- entry cost,
- participation rules,
- pool progress,
- and available actions.

The participation model should never feel confusing.

---

## Reinforce Trust

Before asking the customer to participate, the page should communicate:

- financial transparency,
- marketplace integrity,
- safety-net messaging,
- and clear business rules.

Trust should always precede conversion.

---

## Create Momentum

The page should communicate that participation is happening in a healthy, active marketplace.

Momentum should come from authentic marketplace data rather than exaggerated marketing.

---

## Encourage Conversion

Every section should naturally guide customers toward participating without creating unnecessary pressure.

The experience should remain informative rather than aggressive.

---

## Maintain Transparency

Customers should always understand:

- what happens next,
- what participation costs,
- what outcomes are possible,
- and where to find additional information.

---

# 2. Route Structure

The Item Page is available at:

`/items/[id]`

Each route represents a specific marketplace item and its associated participation pool.

The URL should remain stable and shareable.

Loading an item directly should provide the same experience as navigating from the homepage.

---

# 3. Experience Principles

The Item Page should consistently communicate:

## Clarity

Customers immediately understand the opportunity.

---

## Confidence

Participation feels informed rather than risky.

---

## Excitement

The marketplace feels active without appearing chaotic.

---

## Control

Customers remain in control of every decision.

---

## Transparency

Important information is visible before participation begins.

---

# 4. Page Layout

Desktop layouts should use a two-column structure.

## Left Column

Primary product presentation.

Includes:

- product gallery,
- primary image,
- alternate images,
- zoom support,
- and media assets.

The product should feel tangible and premium.

---

## Right Column

Participation and purchasing interface.

Includes:

- product title,
- merchant information,
- retail value,
- availability,
- participation panel,
- wallet information,
- safety-net banner,
- and primary actions.

This column functions as the conversion center of the page.

---

# 5. Product Information

Every Item Page should clearly present:

- Product Name
- Short Description
- Category
- Brand or Merchant
- Retail Value
- Fulfillment Method
- Product Images
- Item Status

Information should prioritize customer understanding over marketing language.

---

# 6. Product Gallery

The gallery should showcase the product through:

- high-quality imagery,
- multiple viewing angles,
- lifestyle photography (where appropriate),
- and digital previews when applicable.

Customers should quickly recognize what they are participating for.

---

# 7. Participation Panel

The Participation Panel is the most important interactive element on the page.

It should always remain visible while the customer evaluates the opportunity.

The panel includes:

- Entry Price
- Pool Progress
- Remaining Capacity
- Current Status
- Safety-Net Banner
- Quantity Selector
- Primary Action Button
- Secondary Actions

The panel should visually communicate confidence and simplicity.

---

# 8. Entry Price

The participation cost should be immediately visible.

Examples:

- Entry Price: $1.00
- Entry Price: $2.00
- Entry Price: $5.00

Pricing should use large typography and remain visible during scrolling whenever practical.

Customers should never search for pricing information.

---

# 9. Pool Progress

Customers should immediately understand the current status of the pool.

The progress section should display:

- Entries Sold
- Entry Capacity
- Progress Bar
- Percentage Complete
- Remaining Availability

Progress should update in near real time whenever possible.

---

# 10. Marketplace Activity

The page may display authentic marketplace activity signals such as:

- customers currently viewing,
- recent participation,
- recent winners,
- pool milestones,
- or other verified marketplace events.

Marketplace activity should always reflect genuine platform activity.

Artificial activity indicators are prohibited.

---

# 11. Safety-Net Banner

The Safety-Net Banner is one of the platform's most important trust-building components.

It should appear immediately above the primary participation controls.

The banner should explain, in clear language, that eligible non-winning participation may continue providing useful value according to that pool's published rules.

The wording should emphasize:

- transparency,
- customer value,
- and individual pool rules.

It should never imply guarantees beyond those rules.

---

# 12. Primary Actions

The Item Page presents customers with clear participation options.

Primary actions may include:

- Enter Pool
- Select Entry Quantity
- Add Wallet Funds (when required)

Secondary actions may include:

- Share Item
- Save to Favorites
- Add to Wishlist
- View Rules
- Report an Issue

The visual hierarchy should make the primary participation path immediately obvious.

# 13. Entry Quantity Selection

Customers should be able to select the number of entries they wish to purchase before confirming participation.

The quantity selector should:

- support quick increment and decrement controls,
- display the total participation cost in real time,
- validate purchase limits,
- and immediately reflect available wallet funds.

The interface should prevent accidental purchases while remaining fast to use.

---

# 14. Wallet Awareness

The Item Page should remain continuously aware of the authenticated customer's financial state.

When signed in, the page should display:

- Playable Balance
- Rebate Credit Balance
- Available purchasing power
- Funding status
- Wallet shortcut

Customers should always understand whether they have sufficient funds before attempting to participate.

---

## Insufficient Balance

If the customer's playable balance is insufficient:

- the participation button should remain disabled or redirect appropriately,
- the required amount should be clearly communicated,
- and a prominent **Add Funds** action should be presented.

The experience should feel helpful rather than punitive.

---

# 15. Participation Confirmation

After a successful participation request, customers should receive immediate confirmation.

Confirmation should include:

- number of entries purchased,
- total amount deducted,
- updated wallet balance,
- updated pool progress,
- and confirmation that the transaction has been recorded.

Customers should never wonder whether their participation succeeded.

---

# 16. Live Pool States

Pools may exist in several operational states.

Each state should have distinct messaging and available actions.

## Open

Participation is available.

All eligible actions remain enabled.

---

## Nearly Full

Participation remains available.

Urgency messaging may increase while remaining factual.

---

## Full

Participation is temporarily unavailable while the pool completes.

Customers should be informed that the drawing or completion process is in progress.

---

## Completed

Participation has ended.

Customers may review results and browse similar opportunities.

---

## Closed

The pool is unavailable.

The interface should explain why participation is no longer possible.

---

# 17. Win It Now (Hostile Takeover)

Certain pools may support an immediate purchase pathway known as **Win It Now**.

This option allows an eligible customer to bypass the normal pool completion process by paying the configured premium price.

This feature is intentionally exceptional and should never overshadow the standard participation experience.

---

## Availability

The Win It Now action should only appear when:

- the pool configuration explicitly permits it,
- the item is eligible,
- and all business rules authorize the action.

If the feature is unavailable, the interface should simply omit it.

Customers should not see disabled controls for unavailable functionality.

---

## Trophy Vault Protection

Items designated as **Trophy Vault** inventory are protected from immediate purchase.

For protected items:

- Win It Now must not be displayed,
- takeover actions must not be offered,
- and standard participation remains the only available path.

This preserves the intended exclusivity of protected inventory.

---

# 18. Hostile Takeover Experience

When a customer initiates Win It Now, the interface should clearly communicate:

- premium purchase price,
- confirmation requirements,
- effect on the current pool,
- and any applicable marketplace consequences.

Confirmation should require deliberate customer approval.

Accidental activation should be prevented.

---

# 19. Crowd Dividend Communication

When a hostile takeover concludes a pool, eligible participants should benefit according to the configured business rules.

Customer-facing messaging should explain that:

- eligible participants receive the configured marketplace compensation,
- wallet balances update automatically after processing,
- and account history records the event.

The page should celebrate community benefit without revealing internal financial calculations.

---

# 20. Related Products

The Item Page should encourage continued exploration.

Recommended products may include:

- similar products,
- related categories,
- trending opportunities,
- recently added pools,
- or personalized recommendations.

Recommendations should complement—not distract from—the primary participation decision.

---

# 21. Product Information

The lower portion of the page should provide additional product details.

Depending on the item, this may include:

- retailer information,
- redemption details,
- shipping information,
- digital delivery expectations,
- usage restrictions,
- expiration dates,
- or other fulfillment details.

Information should be organized into expandable sections where appropriate.

---

# 22. Pool Rules

Every Item Page should provide access to the specific rules governing that pool.

Customers should be able to review:

- participation requirements,
- eligibility,
- entry limits,
- completion process,
- fulfillment information,
- rebate eligibility,
- and any applicable redemption conditions.

Pool-specific rules should always take precedence over generalized marketing language.

---

# 23. Trust Indicators

The Item Page should reinforce confidence through visible trust elements.

Examples include:

- Secure Wallet Transactions
- Transparent Pool Progress
- Ledger-Based Financial Integrity
- Verified Marketplace Activity
- Responsive Customer Support
- Clear Participation History

Trust indicators should reassure customers without overwhelming the page.

# 24. Loading States

The Item Page should remain responsive while product information is loading.

Loading states should include:

- image placeholders,
- product information skeletons,
- participation panel skeletons,
- wallet balance placeholders,
- progress bar placeholders,
- and related product placeholders.

Customers should always understand that the page is actively loading.

Blank screens should be avoided.

---

# 25. Empty States

The page should gracefully handle situations where content is unavailable.

Examples include:

- unavailable products,
- inactive pools,
- temporarily hidden inventory,
- expired promotional items,
- or unavailable recommendations.

Each empty state should clearly explain the situation while directing customers toward alternative opportunities.

---

# 26. Error Handling

Errors should be communicated in a clear and reassuring manner.

Examples include:

- network interruptions,
- failed participation requests,
- insufficient wallet funds,
- session expiration,
- unavailable inventory,
- or temporary service interruptions.

Error messages should:

- explain what happened,
- suggest the next step,
- avoid technical jargon,
- and never expose internal implementation details.

---

# 27. Responsive Design Standards

The Item Page must deliver a consistent experience across all supported devices.

## Mobile

Mobile is the primary design target.

The experience should prioritize:

- vertical scrolling,
- thumb-friendly participation controls,
- sticky participation panel,
- clear pricing,
- readable product information,
- and simplified navigation.

Customers should be able to complete participation comfortably with one hand.

---

## Tablet

Tablet layouts should expand spacing while preserving the same interaction flow.

The product gallery and participation panel should remain immediately visible without increasing complexity.

---

## Desktop

Desktop layouts should maximize available space through the two-column presentation.

The product gallery and participation panel should remain visible simultaneously, reducing unnecessary scrolling during decision-making.

---

# 28. Accessibility Standards

The Item Page should meet modern accessibility expectations.

The experience should support:

- keyboard navigation,
- screen readers,
- semantic page structure,
- descriptive alternative text,
- sufficient color contrast,
- scalable typography,
- accessible form controls,
- and clear focus indicators.

Participation should be accessible to all customers regardless of assistive technology.

---

# 29. Analytics and Product Insights

The Item Page should collect analytics that improve marketplace performance while respecting customer privacy.

Examples include:

- product page views,
- gallery interactions,
- entry quantity changes,
- participation attempts,
- successful entries,
- wallet funding clicks,
- Win It Now views,
- Win It Now conversions,
- related product selections,
- wishlist additions,
- favorites,
- and support link usage.

Analytics should help improve customer experience and product performance—not manipulate customer behavior.

---

# 30. Component Architecture

The Item Page should be composed of reusable interface components.

Core components include:

- Product Gallery
- Product Information
- Participation Panel
- Wallet Summary
- Safety-Net Banner
- Progress Bar
- Entry Quantity Selector
- Primary Action Buttons
- Win It Now Module
- Pool Rules Accordion
- Product Details Section
- Related Products Carousel
- Trust Indicators
- Footer

Reusable components improve consistency throughout the platform while simplifying maintenance and future development.

---

# 31. Security Requirements

The Item Page must never rely on client-side logic for financial or marketplace decisions.

The client may display information, but the server remains the authoritative source for:

- wallet balances,
- participation eligibility,
- pool status,
- pricing,
- takeover availability,
- transaction validation,
- and ledger updates.

Every participation request must be validated server-side before funds are committed.

The interface should assume that all financial information displayed to customers originates from authoritative server responses.

---

# 32. Relationship to Other Specifications

The Item Page builds upon the customer's marketplace journey.

Related specifications define the surrounding experiences.

**Homepage Specification**
- Product discovery and marketplace browsing.

**How It Works Specification**
- Customer education and trust-building.

**Account & Wallet Specification**
- Wallet management, balances, transaction history, and account activity.

**Payments & Payouts Specification**
- Funding, withdrawals, payment processing, and financial operations.

Together, these specifications define the complete path from product discovery through successful participation and account management.

---

# 33. Governance

The Item Page is the platform's primary participation interface.

Every future enhancement should strengthen:

- customer confidence,
- transparency,
- financial clarity,
- marketplace integrity,
- responsive performance,
- and conversion through understanding rather than pressure.

Future changes should never:

- obscure participation costs,
- exaggerate urgency,
- hide important pool rules,
- weaken the visibility of the Safety-Net Banner,
- bypass server-authoritative financial validation,
- or create inconsistent participation behavior across pool types.

The Item Page should always prioritize informed customer decisions over short-term conversion metrics.

---

# 34. Final Standard

A successful Item Page allows a customer to make an informed participation decision with confidence.

Before participating, every customer should clearly understand:

1. What the product is.
2. Its approximate retail value.
3. The cost to participate.
4. The current progress of the pool.
5. The value-preserving principles that apply according to the pool's published rules.
6. Their available participation options.
7. Their current wallet status.
8. What happens after participation.

When these outcomes are consistently achieved, the Item Page fulfills its role as the marketplace's primary conversion experience while remaining faithful to Project Zero-Loss's core principles of transparency, trust, financial integrity, and customer-first commerce.

