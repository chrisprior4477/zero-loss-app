# Project Zero-Loss Item Page Spec

## Item Detail Page, Pool Conversion Flow, and Safety-Net Decision Surface

This document defines the item detail page for Project Zero-Loss.

It explains:
- the purpose of the item page,
- the required route structure,
- the page layout,
- the trust-building elements that must appear,
- the conversion actions available to the user,
- and the branching rules that govern normal entry flow versus premium takeover flow.

This is the master spec for the product detail and pool participation screen.

---

# 1. Route

The item page must live at:

`/items/[id]`

This route should load the specific item or live pool context the user selected from the homepage or another discovery surface.

The page must feel like a direct continuation of discovery, not a disorienting context switch.

---

# 2. Page Goal

The purpose of the item page is to remove hesitation and create conversion confidence.

By the time the user is on this page, they should understand:
- what the item is,
- what the value is,
- how the pool works,
- what their main choices are,
- and why the risk feels controlled rather than reckless.

This page is not just a product page.

It is the page where the user decides whether to participate.

---

# 3. Emotional Purpose

The item page must create four emotional outcomes:

1. **Clarity** — the user understands the item, value, and entry mechanic quickly.

2. **Reassurance** — the safety-net logic lowers fear and reduces regret expectations.

3. **Urgency** — live progress and active-user signals make the opportunity feel current.

4. **Control** — the user feels informed, not rushed or confused.

If the page is exciting but unclear, it will feel dangerous.

If it is clear but not urgent, it may not convert.

If it is urgent without reassurance, it may feel like a casino trap.

The page must balance all three.

---

# 4. Top-Level Layout

The top of the page should present a clear two-part structure.

## 4.1 Left Side

The left side should feature large, clean product imagery.

The imagery should make the item feel tangible, desirable, and easy to understand.

## 4.2 Right Side

The right side should contain the main item information and conversion interface, including:
- product title,
- retailer or brand reference,
- retail valuation,
- short product description,
- pool urgency status,
- safety-net explanation,
- and the primary action controls.

This right-side panel is the decision engine of the page.

---

# 5. Required Product Information

The page must make the item understandable at a glance.

At minimum, it should clearly display:
- item name,
- short plain-English description,
- retailer or fulfillment context where relevant,
- estimated retail value,
- and any critical item classification that affects how the user interprets the offer.

The user should never feel uncertain about what they are trying to win.

---

# 6. Pool Panel

A major component of the item page is the live pool participation panel.

This panel must display:
- the ticket or entry price,
- real-time or near-real-time pool progress,
- visible urgency,
- and the actions the user can take.

## 6.1 Ticket Price Visibility

The user should instantly see the entry amount, such as:

- “Ticket Price: $1.00”

This must be one of the clearest signals on the page.

## 6.2 Progress Visibility

The panel must show how close the pool is to completion through a clean progress display.

This should help the user understand:
- how full the pool is,
- how much momentum it has,
- and whether urgency is increasing.

## 6.3 Live Interest Overlay

The page should eventually support a live or near-live interest signal, such as how many users are currently viewing or considering the item.

This should be implemented cleanly.

It should create momentum without feeling fake or spammy.

---

# 7. Safety-Net Banner

The safety-net banner is one of the most important trust modules on the entire site.

It must appear directly above the primary action area.

## 7.1 Purpose

Its purpose is to reassure the user that participation is not simple burn risk.

It must communicate, in clear language, that if the user is not drawn and later buys the item through the platform under the configured rules, their spent entry value can be converted into useful store-linked value or rebate credit within the allowed time window.

## 7.2 Placement Rule

This banner must be impossible to miss.

It belongs immediately above the action buttons because that is where hesitation peaks.

## 7.3 Tone Rule

The banner should feel reassuring, clean, and legal-safe.

It should not feel exaggerated, manipulative, or confusing.

---

# 8. Primary User Actions

The item page must support two primary user action paths.

## 8.1 Buy Tickets

The main default action is the standard pool-entry flow.

Clicking this action should:
- open a quantity picker or purchase modal,
- let the user choose how many entries to buy,
- validate available playable balance,
- run an atomic server-side transaction,
- debit the correct amount from the user’s playable balance,
- and return a fast success state to the UI.

The interaction must feel immediate and clean.

## 8.2 Win It Now / Hostile Takeover

The second action path is the premium override flow.

This action is not always available.

It must be conditionally displayed based on the item or pool’s protection rules.

---

# 9. Hostile Takeover Rules

The “Win It Now” or hostile takeover action is a premium logic branch, not a normal purchase path.

## 9.1 Display Rule

This button must only appear if the database indicates that the item is not protected by trophy-vault-style restrictions.

If the relevant protection flag indicates the item is protected, the button must not render.

## 9.2 Financial Rule

If hostile takeover is allowed and the user triggers it, the system should:
- apply the premium surcharge,
- write the correct negative ledger event for the buyer,
- terminate the standard pool outcome path,
- and trigger the crowd-compensation logic for all other eligible users in that pool.

## 9.3 Crowd Dividend Rule

When a hostile takeover occurs, other active users in that pool must receive their configured compensation back into playable value according to the business rules.

This is a major economic differentiator of the platform and must be preserved.

---

# 10. UI Branching Rules

The page must behave differently depending on the item and pool state.

Possible branching conditions include:
- normal live pool,
- protected item with no takeover option,
- pool nearly full,
- insufficient user balance,
- closed or completed pool,
- or post-takeover state.

The UI must respond cleanly to these conditions rather than forcing the user into dead-end actions.

---

# 11. Conversion Confidence Rule

The item page must make the user feel safe enough to act.

That means the user should be able to understand, without digging:
- what they are entering,
- what the upside is,
- what the fallback value is,
- and what happens next if they proceed.

This page should reduce fear through design clarity, not through bloated explanation.

---

# 12. Wallet Awareness Rule

The item page should remain aware of the user’s financial context.

If the user is logged in, the page should eventually surface relevant account-aware signals such as:
- current playable balance,
- eligibility to buy the selected quantity,
- and clean messaging if more funds are required.

The page must never let the user feel blindsided by hidden balance constraints.

---

# 13. Performance and Interaction Rule

This page must feel fast.

The main action flow should feel responsive enough that:
- quantity selection,
- purchase confirmation,
- and success feedback

all feel tight and deliberate.

The UI should reinforce confidence with speed and clarity.

---

# 14. Anti-Goals

The item page must avoid the following failures:

- vague item identity,
- buried or weak safety-net messaging,
- confusing action hierarchy,
- takeover behavior exposed where it should be hidden,
- fake urgency,
- unclear balance requirements,
- and clumsy transaction feedback.

If the user has to work to understand what is happening, the page is underperforming.

---

# 15. Final Item Page Rule

If the item page is doing its job correctly, the user should leave the page understanding five things clearly:

1. What the item is.

2. What the retail value is.

3. What it costs to enter.

4. What the safety-net protection is if they do not win.

5. What actions are available to them right now.

That is the standard this page must meet.