# Project Zero-Loss — Marketplace Financial Rules Specification

**Document Path:** `docs/product/marketplace-financial-rules-spec.md`
**Status:** Active
**Priority:** Core Repository Document
**Owner:** Founder
**Last Updated:** August 2026

---

# Purpose

This document defines the financial mechanics that govern how pools are priced, how prizes are fulfilled, how membership works, and how the platform protects itself and its customers from fraud and operational failure.

These rules were developed through direct founder working sessions, tested against real numeric scenarios, and in several cases corrected after a flaw was found in an earlier version of the rule. Every rule marked **Locked** is ready for implementation. Every rule marked **🔴 Flagged** requires outside professional review (legal or tax) before it may be implemented — these must not be built from a guessed number.

This document is subordinate to `docs/architecture/master-architecture.md` and `docs/brand/brand-identity.md`. Where a rule here could be read as conflicting with the Brand Promise ("Shopping should never feel like losing"), the Brand Promise governs, and the rule should be revisited.

---

# Part 1 — Pool Pricing

## 1.1 The Entry Ratio Rule (Locked)

Every everyday-category pool sells entries at a **fixed 3-to-1 ratio of the prize's displayed face value** — 3 entries at $1 each per $1 of face value — rounded to the nearest clean number (nearest 25, 50, 75, or 00).

Example: a $100 gift card sells 300 entries (rounded from the exact 3-to-1 output if needed).

**Critical implementation detail:** the ratio is calculated from the prize's **displayed face value only** — never from the platform's actual acquisition cost. A $100 prize always sells the same number of entries regardless of whether it cost the platform $97 or $87 to acquire.

**Why this matters, stated explicitly so it is never "simplified" away during implementation:**
- It keeps entry counts consistent and explainable across the entire catalog — a customer should never see two different $100 prizes with two different entry counts and wonder why.
- It prevents customers from reverse-engineering the platform's wholesale discounts by comparing entry counts across similarly-priced items. Acquisition cost is never customer-visible, directly or indirectly.
- Wholesale cost affects only the platform's margin. It never affects the number of entries offered.

## 1.2 Rounding Rule (Locked)

Entry counts round to the nearest clean number ending in 25, 50, 75, or 00. Never a jagged number (e.g., never 287 — round to 300 or 275 as appropriate).

## 1.3 This Is the Only Pricing Formula (Locked)

There is no separate margin-target formula running alongside the ratio rule. The 3-to-1 ratio *is* the rule. Whatever margin results from (entries sold × $1) − (acquisition cost) is accepted as the platform's profit on that pool. The ratio is not adjusted per-item to hit a specific margin target.

This rule may be revisited later (e.g., evolving toward a margin-target-driven formula) as a deliberate future decision — it must not be partially implemented alongside this rule, creating two competing calculations.

## 1.4 Draw Timing (Locked, pre-existing rule reconfirmed)

A draw only executes once total entries collected covers the prize's acquisition cost.

## 1.5 Wholesale Cost Assumptions (Important Correction — Reference Only)

Real B2B wholesale gift card pricing for Tier-1 cash-equivalent brands (Walmart, Amazon, Visa, Apple) is typically **near face value** — not steeply discounted. Tier-2 brands (casual dining, apparel, entertainment) may offer genuine 10–25% bulk discounts. All specific percentages referenced anywhere in this document are **unverified estimates** pending direct confirmation from actual providers (Tremendous, eGifter, Blackhawk/Hawk Marketplace, Reloadly). Do not hardcode assumed wholesale percentages anywhere in implementation — acquisition cost should be a real, per-purchase input, not an assumed constant.

---

# Part 2 — Catalog Categories & Fulfillment Timing

## 2.1 Two Categories (Locked)

Every Catalog Item belongs to exactly one of two fulfillment categories:

**Everyday** — gift cards and other on-demand digital items that can always be resupplied. Prize is purchased **after** the draw closes.

**Scarce / One-Off** — physical, limited-supply, or resale-sourced goods (e.g., resale sneakers, memorabilia). Prize is purchased **before** the pool opens, guaranteeing it exists for the eventual winner. Never fulfilled "buy after draw" — supply is not guaranteed to still exist at that point.

The category must be clearly disclosed to the customer before entry (a toast or badge — e.g., "Limited-supply item. See how this works.").

**Scarce-item entry ratio is explicitly not defined by this document.** It will require its own decision, informed by real per-item economics, before the first scarce-item pool is built. Do not reuse the 3-to-1 everyday ratio for scarce items without a deliberate decision to do so.

## 2.2 Themed Everyday Prizes (Locked)

A themed prize (e.g., "A Month of Baby Essentials") is a real retailer gift card (Target/Walmart) with custom themed imagery layered on top of a standard Catalog listing — never a custom-priced approximation of specific named products.

**Prohibited:** building any tool that scrapes retailer websites for real-time product pricing. Real ToS/legal risk, technical fragility, and unnecessary — the gift-card model already fully solves this.

**Prohibited:** any special "one-time use, no rollover" rule for themed items. Standard gift-card behavior applies exactly as it would for any other gift card — leftover balance rolls over normally; if the purchase costs more than the card's value, the customer pays the difference at checkout, same as any gift card anyone has ever received.

## 2.3 Product/Prize Imagery (Locked)

Do not scrape or reproduce brand product photography — real copyright risk. Use retailer logos (typically available directly through the gift-card API provider) plus AI-generated or pre-approved generic themed imagery instead.

---

# Part 3 — Loser Credit Mechanics

## 3.1 Everyday-Item Losers (Locked)

A losing entry converts into a right to complete the purchase of that specific item at its full remaining value (entry price paid + additional payment = full face value). This is never a cash refund. The platform incurs no further cost unless and until the customer chooses to pay the remaining balance.

## 3.2 Scarce-Item Losers (Locked)

A losing entry on a scarce-item pool converts into credit redeemable toward **any everyday/on-demand item on the platform** — never toward "more of" the scarce item, since additional units of a scarce item do not exist. Same self-funding mechanic as 3.1: the platform incurs no further cost unless the customer redeems.

## 3.3 🔴 Flagged — Unredeemed Rebate/Loser Credit Expiration

Amended 2026-08-13 — supersedes prior Locked version: Unredeemed rebate/loser credit expires 30 days after issuance. Rationale: comparable, familiar window to standard retail return policies; deliberate founder decision, made after reviewing why the prior rule prohibited short-window expiration. 🔴 Flagged — requires legal review before implementation. Potential exposure: federal CARD Act minimum-duration requirements for stored-value instruments; state-level gift-card/stored-value expiration laws (several states prohibit expiration entirely). Do not implement enforcement of this expiration until reviewed.

---

# Part 4 — Membership

## 4.1 Structure (Locked)

Exactly two tiers: **Free** and **Paid**. No additional tiers at launch.

**Free tier:** 1 entry per person per pool, on every single item, every category, with no exceptions. No item may ever be gated so that only Paid members can attempt it.

**Paid tier:** **$10.00/month.** Additional entries scaled by a percentage of the prize's face value, hard-capped at **20% of total pool entries per person** (a starting number, explicitly intended to be revisited against real usage data — not treated as permanently correct).

## 4.2 Paid-Tier Perks (Locked)

- Early-access entry window (enter before the Free tier can)
- A modest loss-rebate boost
- A visible member badge
- Priority support (intended to become increasingly automated over time, with human escalation retained for cases that genuinely require it)

## 4.3 Explicitly Rejected Mechanics (Locked)

- Reduced payment-processing fees for Paid members. Real, unavoidable cost (e.g., ~2.8% credit card processing) — the platform does not absorb this as a member perk.
- Any mechanic that restricts which items a Free-tier member may attempt. Every tier may try every item; the tier only changes how many entries a person may hold in a given pool.

## 4.4 Billing Finality (Locked)

Membership charges are **final and non-refundable for the billing period, in full.** No proration in either direction. No exception based on cancellation timing.

Entries and their associated allowances are **fixed at the moment of purchase** and are never retroactively adjusted based on a later change in membership status. Cancelling membership affects only future billing periods — it never reverses, reduces, or refunds anything already purchased or already used.

**Rationale (retained for future reference):** an earlier draft of this rule allowed cancellation to be "generous" (à la standard SaaS subscription norms). This was identified as a real exploit: a bad-faith user could upgrade, purchase maximum entries on a specific pool, then cancel before the draw to attempt to recover the membership fee. Full finality in both directions (no refund on cancel, no early benefit unlock either) removes any incentive to time cancellation around a pool's close.

## 4.5 Upgrade Confirmation Requirement (Locked)

Upgrading to Paid membership requires **password re-entry** as the confirming action, shown directly beneath a plainly-worded, unavoidable statement of the final/non-refundable terms (not fine print). The system must log the **exact wording of the terms shown** at the moment of confirmation, alongside the timestamp and the confirming action — not merely the fact that "terms were accepted."

## 4.6 🔴 Flagged — Mandatory Legal Review Before Implementation

The pay-more-get-more-entries mechanic (Section 4.1, Paid tier) risks crossing from a legal sweepstakes into a regulated lottery in some U.S. states, under the standard consideration + chance + prize test. **Do not implement the Paid-tier entry-scaling mechanic in production, and do not process real payments against it, until a licensed attorney has reviewed it.** This is directly tied to the still-unwritten `docs/operations/sweepstakes-compliance-spec.md`.

---

# Part 5 — Scarce-Item Win Handling

## 5.1 Core Rule (Locked)

A scarce-item win is **never** convertible to cash or platform credit. The winner receives the specific item, in full, and nothing else.

The winner **may transfer or gift** their win to another named ZeroLoss account, as a free courtesy feature. This must never be advertised, implied, or presented anywhere as a cash-out mechanism. **The platform's public-facing content must never mention that cash redemption of any prize is possible, under any circumstance.**

## 5.2 Unclaimed Scarce-Item Wins (Locked)

A disclosed claim deadline applies — approximately 30 days, shown to the winner at time of win. After the deadline passes unclaimed, a **governed fallback** applies: either a documented backup-bidder/next-in-line process, or an explicit, disclosed re-draw. Silent forfeiture and undisclosed re-draws are prohibited.

## 5.3 Deferred to a Future Version — Not Building Now (Reference Only)

A secondary marketplace allowing winners to resell or re-raffle prizes for cash, with the platform taking a fee, was considered and explicitly deferred. Reasons: meaningful additional legal exposure (real cash-for-prize resale between customers, brokered by the platform, raises materially different compliance questions than anything else in this document), price-competition problems between duplicate listings of the same item, and the transfer/gift mechanic in 5.1 already resolves the underlying "I don't want this item" problem without introducing those risks. If revisited in a future version, it requires its own dedicated compliance review — it must not be treated as a simple extension of the transfer feature.

---

# Part 6 — Fraud & Dispute Handling

## 6.1 Chargeback / "Friendly Fraud" Defense (Locked)

The platform relies on its existing immutable Ledger and audit trail (IP/device information at signup and at funding, complete transaction history, proof of delivery/redemption) as its dispute evidence. No custom blockchain or alternative recordkeeping system is required or should be built for this purpose — standard payment-network dispute processes expect standard evidence, not novel infrastructure.

**Admin workflow:** an admin-facing "Chargeback / Dispute" action automatically compiles the relevant evidence package for a flagged transaction → a human employee reviews the compiled package → the employee takes an explicit approval action → the system writes an **immutable audit record of the reviewing employee's identity, timestamp, and decision** → the approved evidence package is submitted via the payment processor's (Stripe's) Disputes API.

**Implementation note:** build the Stripe integration against Stripe's current API documentation at the time of implementation. Do not assume field names, structures, or endpoints from this specification — verify against live documentation.

**Policy (Locked):** the platform accepts a baseline chargeback-loss rate as a normal, budgeted cost of doing business. Disputes are not reflexively fought in every case — priority goes to disputes with strong evidence (clear proof of delivery/redemption). The platform's dispute rate is tracked as an ongoing operational metric, since payment processors may flag or restrict accounts with a chronically high dispute rate regardless of who is factually correct in any individual case.

## 6.2 New-Account Fulfillment Hold (Locked)

An account with **no prior successful, unreversed transaction history** that wins a prize valued at **$50 or more** has fulfillment of that specific win held for **24 hours**, during which basic automated risk checks run on the funding transaction.

Entering pools, funding a wallet, and browsing are **never** held under this rule — only fulfillment of a qualifying win on an unproven account.

A win under $50 on a new account triggers no hold.

Customer-facing language for a held fulfillment must read as standard order-processing language (e.g., "Your prize is being prepared") — it must never read as, or imply, a fraud accusation.

## 6.3 Multi-Account Pool-Cornering / Membership-Cap Circumvention (Locked)

IP address alone is an insufficient defense (trivially defeated by VPN use). The platform's real defense is **tiered identity verification (KYC):** government-issued ID (front and back), AI-assisted data extraction, and a live facial-match selfie, via a licensed third-party identity verification provider (e.g., Stripe Identity, Persona, or Onfido — not built in-house).

KYC verification is required above a defined value threshold, specifically for high-value and scarce-item pools. One verified identity corresponds to one entry-cap allowance across all accounts associated with that identity — cross-checked against shared funding-card and device-fingerprint signals, tied into the platform's existing duplicate-account detection.

**Sequencing decision (Locked):** the full KYC infrastructure — identity document upload, verification workflow, secure storage, account-side UI, and a tax-document download area for the eventual W-2G workflow (see 6.4) — is to be **built now, but not activated or required at launch.** Real enforcement thresholds are to be set later, once real platform usage data exists to inform them.

## 6.4 🔴 Flagged — Tax Reporting, Requires a Licensed CPA or Tax Attorney

The applicable form is very likely **IRS Form W-2G**, not "1078-B" as referenced in an earlier working draft of this document. The exact dollar threshold that triggers a reporting obligation, and — critically — **which party is the legally correct issuer** (ZeroLoss directly, versus the underlying gift-card provider), are both genuinely unresolved and must not be guessed at or assumed by AI-assisted implementation.

**Action required before any real prize is issued at scale:** build the account-side tax-document infrastructure now (a downloadable-forms area within the customer's account, functioning as plumbing only). Leave the actual reporting trigger threshold as an explicitly unconfirmed placeholder until a licensed tax professional confirms the correct number and issuing party.

---

# Part 7 — Fulfillment Continuity

## 7.1 Provider API Unavailable at Draw or Fulfillment Time (Locked)

**Draws are never delayed or blocked by third-party provider availability.** Winner selection is fully self-contained (a frozen eligible-entry population plus the platform's own cryptographically secure randomness source) and always executes on schedule regardless of any external system's status.

**Fulfillment requests must use a unique idempotency key per win** on every retry attempt, so that repeated retries against a provider outage can never result in a prize being issued more than once for a single win.

**Customer-facing messaging during a fulfillment delay must remain calmly honest and general — never a fabricated explanation.** Approved baseline language: *"Your prize is confirmed and being processed. Delivery can take up to 24 hours."* Fabricated excuses (e.g., falsely claiming an email address needs confirmation) are prohibited — a customer who disproves a fabricated excuse leaves the platform with no honest position left to fall back on.

**Escalation timeline (starting values — explicitly intended to be tuned later against real operational data):**

| Elapsed time | Action |
|---|---|
| 0–15 minutes | Silent automatic retry. No customer-facing indication. |
| 15 minutes – 2 hours | Customer sees the standard processing message. An internal alert is sent to the responsible employee **every 15 minutes** during this window (not a single alert) so that multiple simultaneously affected winners cannot go unnoticed. Employee begins investigating and/or contacting the provider directly. |
| Past ~4 hours | Human-authorized substitution (see 7.1.1) becomes available as an option. |

### 7.1.1 Petty-Cash Substitution Reserve (Locked)

The platform maintains a standing reserve of generic prepaid Visa/Mastercard cards at common denominations, to be used as **equal-value substitution only** (never a lower-value substitute) during an extended provider outage.

Release of a substitution card **requires explicit human authorization** by an authorized employee — this action must never be fully automated, specifically to prevent the release mechanism itself from becoming a fraud target.

## 7.2 Real Vendor Security Breach (Locked)

Upon a provider's disclosure of a breach, the responsible employee cross-references the vendor's disclosed compromised code/date range against the platform's own issued-codes Ledger to precisely identify affected customers — an actual database query, not estimation. Only genuinely ambiguous boundary cases require manual review.

**Scale-based response, mirroring the structure of 7.1:**

- **Below the defined scale threshold:** quiet, individually handled reissue to each affected customer. No public statement required.
- **10 or more affected customers, OR any single unresolved case exceeding 24 hours — whichever occurs first:** a calm, honest, composed public statement is issued. The statement reassures customers that fulfillment will occur; it does not fabricate an excuse and does not lead with blame directed at the vendor.

**🔴 Flagged — Data breach disclosure law:** the moment there is any real ambiguity about whether customer **personal data** (as distinct from gift-card codes alone) may have been exposed, that is the trigger for **immediate, same-day legal consultation.** Exact data-breach notification requirements vary by U.S. state and must not be assumed or guessed at by AI-assisted implementation.

As part of vendor selection, the platform should directly ask each prospective gift-card provider about their own breach-disclosure and code-replacement policy — the answer should factor into vendor selection, not only pricing.

---

# Part 8 — Whale Tier (Concept Only — Deferred to a Future Version)

Not being built as part of the current implementation. Recorded here so the concept is not lost:

- A separate, high-value category functioning as a real auction/buyout system, structurally distinct from the standard $1-entry pool mechanic.
- Backup-bidder mechanic: if the winning bidder fails to complete payment within approximately 7 days, the next-highest bidder (2nd, then 3rd, then 4th place, in order) receives the option. This mirrors established auction-house practice.
- Requires a genuine **payment-method authorization hold** for the bid amount — a point-in-time balance check is explicitly insufficient, since funds can be moved before or after a simple balance snapshot.
- Requires identity verification (KYC), likely more stringent than the threshold used for standard high-value/scarce pools.
- **Explicitly rejected:** distributing a pro-rata share of the whale-tier surcharge back to non-whale losers in the standard pool. This was found to reintroduce the same "profit depends on people not noticing small amounts" pattern. The prior Part 3.3 blanket prohibition on short-window credit expiration shared that concern; the 2026-08-13 amendment narrowed 3.3 to a 30-day rebate/loser-credit window (still 🔴 Flagged for legal review). This whale-tier rejection is unchanged.
- The exact whale-tier dollar threshold is not defined and requires real research into industry norms before it is ever proposed as a hard number.

---

# Documents This Specification Affects

| Document | Relationship |
|---|---|
| `docs/operations/fraud-and-risk-spec.md` | Should incorporate Part 6 and Part 7 of this document. |
| `docs/operations/admin-portal-spec.md` | Should incorporate the Chargeback/Dispute action, the fulfillment-outage alert queue, and the petty-cash substitution action described in Part 6 and Part 7. |
| `docs/architecture/enterprise-data-dictionary.md` | Should be checked for a Membership Tier field on the Customer entity, IP/device metadata capture on Ledger entries at the funding step, and tax-document placeholder fields. |
| `docs/capabilities/membership.md` | Not yet written (Phase 4 backlog). Part 4 of this document is its intended first real content. |
| `docs/operations/sweepstakes-compliance-spec.md` | Not yet written (Phase 4 backlog). Part 4.6 of this document makes this specification more urgent than previously assessed. |

---

# Governance

This document follows the repository's standard governance model (Clarification, Expansion, Correction, Superseding Decision — see `docs/project-index.md`). Sections marked **Locked** should not be casually rewritten; a change to a Locked rule is a Correction or Superseding Decision and should be treated with the same weight as a change to `master-architecture.md`. Sections marked **🔴 Flagged** must not be converted to Locked status by AI-assisted implementation under any circumstance — only by the founder, after the required outside professional review has actually occurred.

---

*This document reflects a founder working session in which several rules were deliberately corrected after a real flaw was identified in an earlier version. It should be treated as a mature, load-bearing specification — not a first draft of untested ideas.*


