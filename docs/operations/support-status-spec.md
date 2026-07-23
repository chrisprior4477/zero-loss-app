# Project Zero-Loss Support and Status Spec

## User-Facing Status Center, Internal Diagnostics, Issue Escalation, and Transparency Rules

This document defines the support and status system for Project Zero-Loss.

It explains:
- what users should be able to see when something affects their experience,
- what admins should be able to see internally,
- how status history should be presented,
- how support issues should be escalated,
- and how the product should balance transparency with operational safety.

This is the master spec for the platform’s status center, support visibility, and issue-handling surfaces.

---

# 1. Purpose of This Document

Project Zero-Loss should not behave like a platform that hides issues until users become frustrated.

Instead, it should expose clear, useful status information when the user experience is affected and give admins a deeper operational view of what is happening behind the scenes.

This document exists to define that transparency model.

---

# 2. Core Philosophy

The support and status layer should follow this principle:

**Users should see what affects them. Admins should see what caused it, how serious it is, and what action is available next.**

That means:
- user-facing status should be plain-language and helpful,
- admin-facing status should be detailed and actionable,
- and both layers should preserve history rather than pretending nothing ever happened.

---

# 3. Why This Matters

This platform handles:
- wallet balances,
- entries,
- rebates,
- claims,
- payments,
- and timed value states.

That means support and status are not cosmetic.

They are part of the trust system.

If users do not understand what is happening, or if operators cannot diagnose issues cleanly, the product loses credibility.

---

# 4. User-Facing Status Center

The platform should include a user-facing status surface that explains meaningful platform conditions when they affect the user experience.

This can appear as:
- banners,
- notices,
- account-level alerts,
- or a dedicated status/history view.

## 4.1 User Visibility Rule

Users should be able to see:
- service-impacting issues,
- relevant account-affecting states,
- visible timeline/history where appropriate,
- and plain-language explanations of what is happening.

## 4.2 Plain-Language Rule

The user-facing layer should never rely on raw internal engineering language or confusing system terminology.

The goal is not to expose backend jargon.

The goal is to communicate clearly.

---

# 5. What Users Should See

Regular users should see the information that helps them understand their actual experience.

That includes things like:
- delayed wallet updates,
- temporary purchasing limitations,
- claim review delays,
- read-only or limited-action modes,
- and other service-impacting conditions that affect what they can do right now.

Users should also be able to see relevant account-oriented history and timeline context when it helps them understand what changed and when.

---

# 6. What Users Should Not See

Users should not be exposed to raw internal diagnostics that do not help them act.

That includes:
- internal severity labels,
- low-level exception language,
- override mechanics,
- hidden backend control failures,
- and deep internal cause trees meant for operators.

The user-facing layer must be transparent without becoming confusing.

---

# 7. Status Timeline Rule

A visible history or timeline should be part of the status system wherever it meaningfully improves trust and understanding.

That means the platform should support showing:
- when a status started,
- when it changed,
- whether it was resolved,
- and what the user could expect during that period.

This is especially important for:
- wallet update delays,
- claim review states,
- and account-affecting exceptions.

---

# 8. Cleaner View and Detailed View

The support/status experience should support both a cleaner summary and a more detailed breakdown where appropriate.

Some users will want:
- a plain answer,
- simple banners,
- and minimal noise.

Others may want:
- a visible timeline,
- more account activity context,
- and a clearer breakdown of recent changes.

The product should support both without becoming cluttered.

---

# 9. Admin-Facing Status and Diagnostics

Admins must be able to see more than users.

The internal diagnostics layer should show:
- the affected system or module,
- incident severity,
- operational cause context,
- related accounts or objects,
- support activity,
- and what safe actions or escalation paths are available.

This internal view should support action, not just observation.

---

# 10. Support Operations Layer

The platform should include a support operations layer that allows internal team members to investigate and manage problems through the admin GUI.

This should support workflows such as:
- investigating user complaints,
- checking payment or rebate timing,
- checking claim states,
- reviewing incident impact,
- and creating or linking tickets to the relevant object or user.

Support staff should not need to guess where to look.

---

# 11. Ticket Creation Rule

If an admin identifies an issue that needs follow-up, the system should allow ticket creation directly from the relevant investigation context.

For example, a ticket should be creatable from:
- a user record,
- a payment event,
- a claim state,
- a pool record,
- or a status incident surface.

This preserves context and reduces support error.

---

# 12. Internal Incident Management

The support/status system should include an internal incident layer for meaningful service-impacting problems.

Admins should be able to see:
- incident title,
- affected area,
- severity,
- start time,
- status history,
- impact notes,
- and current action owner where applicable.

This gives the company an operational memory instead of relying on scattered chat messages or ad hoc notes.

---

# 13. Safe Mode and Limited Service States

The platform may enter conditions where not all actions should remain fully available.

Examples include:
- delayed settlement conditions,
- temporary purchase limits,
- read-only states,
- claim verification holds,
- or temporary protections around money movement.

## 13.1 User Rule

Users should see simple, clear messaging when these conditions affect them.

## 13.2 Admin Rule

Admins should see the deeper diagnostics, affected surfaces, and available operational controls.

---

# 14. Support and Financial Sensitivity

Because this platform involves wallet value and financial outcomes, support must be tightly connected to ledger-aware investigation surfaces.

That means support tooling should be able to connect to:
- wallet history,
- entry outcomes,
- rebate events,
- payout review,
- and account status changes.

Support without financial traceability is not sufficient for this product.

---

# 15. Audit and History Rule

Any sensitive admin action tied to support or status handling must leave an internal history trail.

This includes actions such as:
- status changes,
- account review notes,
- financial escalations,
- issue resolutions,
- and permissioned corrective actions.

The system should always preserve:
- who acted,
- when they acted,
- what they changed,
- and why they changed it.

---

# 16. UX Style Rule

The support and status experience should feel:
- calm,
- clear,
- informative,
- and operationally credible.

It should not feel like:
- a vague apology center,
- a hidden support dead-end,
- or a confusing engineering console.

The goal is clarity with confidence.

---

# 17. Anti-Goals

The support and status system must avoid the following failures:

- hiding real service-impacting issues from users,
- exposing useless engineering jargon to regular users,
- forcing admins into Supabase for routine investigation,
- creating tickets with no object context,
- losing incident history,
- allowing sensitive support actions with no audit trail,
- and separating support too far from wallet or account truth.

If support becomes guesswork, the system is failing.

---

# 18. Final Support and Status Rule

If this system is doing its job correctly, all of the following should be true:

1. Users can understand when a problem affects them.

2. Users can see useful history or timeline context when relevant.

3. Admins can see full diagnostics and operational detail.

4. Tickets can be created from the right context inside the GUI.

5. Sensitive actions leave an audit trail.

6. The platform feels transparent rather than evasive.

That is the standard this support and status system must meet.