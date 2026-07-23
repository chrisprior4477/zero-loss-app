# Project Zero-Loss Homepage Spec

## Homepage, Storefront Shell, and Live Discovery Experience

This document defines the homepage for Project Zero-Loss.

It explains:
- the purpose of the homepage,
- the required layout structure,
- the emotional goals of the page,
- the critical UI modules that must appear,
- and the interaction rules that make the storefront feel trustworthy, alive, and conversion-focused.

This is the master spec for the public-facing homepage and primary storefront shell.

---

# 1. Homepage Goal

The homepage must function as the product’s opening handshake with the user.

It should immediately explain, through both layout and messaging, that this is:
- a real storefront,
- a live platform,
- a safer kind of entry-based commerce,
- and a place where users can quickly discover products they already care about.

The homepage should feel:
- modern,
- fast,
- trustworthy,
- slightly urgent,
- and emotionally clear.

It must not feel like:
- a flashing casino page,
- a cluttered discount catalog,
- or a confusing generic ecommerce homepage.

---

# 2. Core Design Direction

The homepage should blend influence from three major UX models while becoming its own product experience.

## 2.1 DraftKings / PrizePicks Influence

The homepage shell should feel premium, dark, sharp, and high-signal.

This includes:
- a sticky top navigation structure,
- strong visual hierarchy,
- a clean dark-mode shell,
- and a fintech-like sense of precision.

## 2.2 Temu Influence

The browsing grid should feel dense, quick, and immediately actionable.

This includes:
- a mobile-first card grid,
- strong thumbnail visibility,
- clear pricing and urgency messaging,
- and a fast-scanning layout optimized for repeated browsing.

## 2.3 StockX Influence

The page must feel alive with proof of activity.

This includes:
- a live-looking ticker,
- visible movement,
- social proof,
- and a sense that the marketplace is active right now.

---

# 3. Emotional Purpose

The homepage must accomplish four emotional outcomes at the same time:

1. **Clarity** — the user understands the basic idea quickly.

2. **Trust** — the user does not feel tricked, confused, or manipulated.

3. **Urgency** — the user feels encouraged to act without the site feeling desperate.

4. **Momentum** — the platform feels live, active, and socially validated.

If the page has urgency without trust, it will feel scammy.

If it has trust without momentum, it will feel dead.

If it has clarity without energy, it will feel forgettable.

The page must balance all three.

---

# 4. Required Page Structure

The homepage should be built in this order from top to bottom:

1. Sticky navigation header.
2. Category filter tabs.
3. Hero banner.
4. Live ticker directly below the hero.
5. Product discovery grid.

This order matters because it establishes:
- control,
- explanation,
- live proof,
- and then product discovery.

---

# 5. Sticky Navigation Header

The homepage header must remain visible and usable as the user scrolls.

## 5.1 Left Section

The left side should contain the brand identity area, including:
- logo,
- clickable home return behavior,
- and eventual access to global navigation as the platform grows.

## 5.2 Center Section

The center should contain a fast universal search field.

This search should feel prominent and useful, not decorative.

It should eventually support searching for:
- items,
- brands,
- categories,
- and relevant product keywords.

## 5.3 Right Section

The right side should contain:
- account/profile access,
- and the split-ledger balance tracker.

The balance tracker should display:
- playable balance,
- rebate/store-credit balance,
- and bright, clearly separated value indicators driven by live ledger-derived account data.

The header should make the platform feel like both a storefront and a command center.

---

# 6. Category Filter Tabs

Directly under the header or in a tightly integrated discovery rail, the homepage should include horizontal category pills.

The initial category set should include:
- All
- Groceries & Gas
- Movie Night
- Electronics
- Trophy Vault

These tabs should feel:
- fast to tap,
- visually clean,
- easy to scan,
- and suited for mobile-first usage.

The purpose of the tabs is to reduce search effort and create immediate browsing structure.

---

# 7. Hero Banner

The hero banner must explain the concept quickly and memorably.

## 7.1 Required Hero Message

The homepage hero headline should communicate the idea that users can:

**Win what they were going to buy anyway.**

The supporting copy should explain the safety-net logic in plain language, making clear that non-winning entry spend still converts into useful store-linked value under the platform’s rules.

## 7.2 Hero Purpose

The hero must do three things:
- introduce the concept,
- lower fear,
- and create curiosity.

It should not overload the user with legal or mechanical detail.

Its job is to create belief, not overwhelm.

---

# 8. Live Activity Ticker

Directly below the hero, the page must include a permanently visible live-style activity ticker.

This ticker is a major trust module.

Its purpose is to make the site feel:
- active,
- legitimate,
- socially validated,
- and already in motion.

## 8.1 Ticker Content Style

The ticker should show outcome-style messages such as:
- user wins,
- community events,
- major milestones,
- and later other celebratory or trust-reinforcing updates.

## 8.2 Visual Behavior

Each ticker item should include a pulsing live indicator or similar real-time signal.

The motion should feel modern and confident, not tacky.

## 8.3 Trust Rule

The ticker must never become fake-looking spam.

It should reinforce platform legitimacy, not damage it.

---

# 9. Product Discovery Grid

The core body of the homepage is the product discovery section.

This is where the site begins converting curiosity into action.

## 9.1 Layout

The grid should be mobile-first and optimized around a dense 2-column browsing experience.

It should present:
- isolated product imagery,
- compact but readable card information,
- visible entry framing,
- and strong progress/urgency signals.

## 9.2 Card Role

Each card should make it immediately obvious:
- what the item is,
- what the entry cost is,
- how far the pool has progressed,
- and whether urgency is increasing.

The card should invite a tap without requiring too much thought.

---

# 10. Product Card Rules

Each product card should include the following required elements:

- isolated product image,
- product title or short label,
- clear badge indicating the entry mechanic,
- progress bar showing pool capacity,
- and click/tap behavior that routes to the item detail page.

## 10.1 Entry Badge

A strong visual badge should make the low-friction entry proposition obvious, such as:
- “$1 Entry to Win”
- or equivalent platform-approved language.

## 10.2 Progress Bar

Each card must display an urgency/progress bar tied to:
- `tickets_sold`
- versus
- `ticket_cap`.

This is one of the homepage’s most important conversion signals.

## 10.3 High-Urgency Threshold

When a pool passes the defined urgency threshold, the card should escalate visually and textually.

At the threshold described in the source concept, the system should surface a pulsing urgency message such as:
- “Only X spots left”
- or equivalent urgent-but-clean language.

The goal is to create momentum, not panic.

---

# 11. Routing and Click Behavior

Clicking a product card must route the user directly to the corresponding item detail page.

The homepage should not introduce unnecessary friction between discovery and conversion.

This means:
- no confusing intermediate pages,
- no forced detours,
- and no bloated preview flow before the user reaches the item page.

The homepage should act like a launch pad.

---

# 12. Balance Visibility Rule

A major distinguishing feature of the homepage shell is that it surfaces wallet state early rather than hiding it deep in account settings.

When the user is authenticated, the homepage should expose:
- playable balance,
- rebate credit balance,
- and later other clean account-relevant cues through the top shell.

This helps the product feel transparent and fintech-grade rather than vague or game-like.

---

# 13. Mobile-First Rule

The homepage must be designed for mobile-first interaction.

That means:
- fast vertical scanning,
- thumb-friendly category filters,
- readable card density,
- sticky top-level controls,
- and strong visual separation without clutter.

Desktop should feel like an expansion of a great mobile experience, not the other way around.

---

# 14. Anti-Goals

The homepage must avoid the following failures:

- fake casino energy,
- cluttered bargain-bin merchandising,
- loud flashing motion,
- weak explanation of the concept,
- hidden wallet context,
- stale-looking activity signals,
- or product cards that hide urgency/value too deeply.

If the homepage becomes messy, generic, or overdesigned, it is moving away from the intended product identity.

---

# 15. Final Homepage Rule

If the homepage is doing its job correctly, a new user should land on it and understand three things within seconds:

1. This is a real storefront.

2. I can try to win something I actually want for a very low entry cost.

3. If I do not win, the system still gives my spend useful value instead of making it feel wasted.

That is the standard this page must hit.