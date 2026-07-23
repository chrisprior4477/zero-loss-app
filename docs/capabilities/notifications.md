# Project Zero-Loss Notifications Capability Specification

**Version:** 1.0
**Status:** Draft for Founder Review
**Document Owner:** Founder / Customer Communications
**Last Updated:** 2026-07-16
**Target Path:** `docs/capabilities/notifications.md`

**Related Documents:**

* `docs/project-index.md`
* `docs/architecture/master-architecture.md`
* `docs/architecture/ai-operating-rules.md`
* `docs/architecture/output-contract.md`
* `docs/core/product-vision.md`
* `docs/core/product-concept.md`
* `docs/capabilities/README.md`
* `docs/capabilities/favorites.md`
* `docs/capabilities/wishlist.md`
* `docs/capabilities/search.md`
* `docs/capabilities/recommendations.md`
* `docs/capabilities/user-preferences.md`
* `docs/capabilities/activity-history.md`
* `docs/capabilities/catalog.md`
* `docs/capabilities/identity-and-profile.md`
* `docs/capabilities/rewards-and-referrals.md`
* `docs/capabilities/communications.md`
* `docs/product/homepage-spec.md`
* `docs/product/item-page-spec.md`
* `docs/product/account-wallet-spec.md`
* `docs/product/payments-and-payouts-spec.md`
* `docs/product/support-status-spec.md`
* `docs/product/design-system-spec.md`
* `docs/operations/admin-portal-spec.md`
* `docs/operations/analytics-spec.md`
* `docs/operations/fraud-and-risk-spec.md`
* `docs/operations/content-management-spec.md`
* `docs/decisions/ADR-004-notification-strategy.md`

---

# 1. Purpose

The Notifications capability provides reliable, respectful, traceable communication between Project Zero-Loss and its users.

Notifications must help users:

* understand account and security activity,
* confirm financial and marketplace actions,
* monitor products and pools they intentionally follow,
* receive winner, rebate, purchase, payout, and support updates,
* discover relevant products without being overwhelmed,
* and control how and when optional messages are delivered.

Notifications are part of the customer experience, but they are also part of the platform’s operational infrastructure.

A notification must never become the authoritative source of:

* wallet balance,
* entry ownership,
* pool status,
* payment status,
* rebate value,
* prize ownership,
* payout status,
* or any other financial or legal fact.

The authoritative system record must always remain in the appropriate database, ledger, payment, pool, claim, or support table.

---

# 2. Product Philosophy

Zero-Loss notifications should build trust rather than pressure.

The system should communicate:

* what happened,
* why it happened,
* what the user needs to know,
* whether action is required,
* and where the user can verify the information.

Notifications should be:

* factual,
* timely,
* understandable,
* relevant,
* accessible,
* secure,
* and easy to control.

Notifications must not use:

* fake urgency,
* fake winners,
* fake activity,
* misleading countdowns,
* exaggerated scarcity,
* disguised marketing,
* guilt,
* fear,
* repeated loss-based prompts,
* or manipulative language.

The system should prefer one useful message over several low-value messages.

The user should never feel that following one item gave the platform permission to contact them about everything.

---

# 3. Guiding Principles

All notification design and implementation must follow these principles.

## 3.1 User Control

Users control optional notification categories, channels, frequency, and quiet hours.

## 3.2 Explicit Consent

Optional marketing and user-requested alerts require appropriate consent.

Silence, inactivity, or account creation must not be treated as unlimited consent.

## 3.3 Transactional Integrity

Transactional messages must accurately reflect authoritative system state.

## 3.4 Separation of Message Classes

Transactional, security, user-requested, operational, educational, founder, and promotional messages must remain distinguishable.

## 3.5 Traceability

Every delivered notification should be traceable to:

* its trigger,
* notification type,
* template version,
* recipient,
* delivery channel,
* provider,
* delivery result,
* and related entity.

## 3.6 Idempotency

The same triggering event must not create duplicate notifications or duplicate deliveries.

## 3.7 Privacy

Messages must contain only the information necessary for the user to understand and act.

## 3.8 Safe Failure

A failed email, push message, or SMS must not alter financial state or mark the underlying business operation as failed.

## 3.9 Honest Urgency

Urgency may be communicated only when supported by real system state.

## 3.10 Accessible Communication

Messages and controls must work for users with disabilities and across supported devices.

---

# 4. Definitions

## 4.1 Notification

A user-facing message created in response to an event, condition, schedule, or approved campaign.

## 4.2 In-App Notification

A notification displayed inside the authenticated Zero-Loss experience.

## 4.3 Delivery

An attempt to send a notification through a channel such as email, web push, or SMS.

## 4.4 Notification Type

A specific event or purpose.

Examples:

* `entry_confirmed`
* `pool_result_published`
* `winner_claim_required`
* `wishlist_item_available`

## 4.5 Notification Class

The high-level purpose and consent category.

Examples:

* Security.
* Transactional.
* User-requested alert.
* Operational.
* Educational.
* Founder communication.
* Promotional.

## 4.6 Channel

The method used to deliver a notification.

Examples:

* In-app.
* Email.
* Web push.
* SMS.

## 4.7 Trigger

The authoritative event or condition that causes a notification to be created.

## 4.8 Template

The approved structure and wording used to render a notification.

## 4.9 Digest

A grouped notification containing multiple relevant events delivered on a schedule.

## 4.10 Quiet Hours

A user-defined period during which nonurgent optional notifications should not be delivered.

## 4.11 Suppression

A rule preventing delivery to an address, phone number, account, channel, or notification type.

## 4.12 Deduplication Key

A unique identifier used to prevent repeated creation or delivery of the same logical message.

---

# 5. Notification Classes

# 5.1 Security Notifications

Security notifications protect the user’s account.

Examples:

* New account verification.
* Password reset.
* Password changed.
* Email address changed.
* Phone number changed.
* New device or unusual login.
* Multifactor authentication changed.
* Account locked.
* Suspicious activity detected.
* Security recovery completed.
* Account deletion initiated.
* Account deletion completed.

Security notifications should generally be delivered promptly and should not be disabled when required to protect the account.

They must never include:

* passwords,
* full authentication secrets,
* session tokens,
* full payment credentials,
* or unrestricted account-access links.

---

# 5.2 Transactional Notifications

Transactional notifications confirm or explain a user-requested or system-required event.

Examples:

* Wallet funding initiated.
* Wallet funding completed.
* Wallet funding failed.
* Entry purchase confirmed.
* Entry purchase failed.
* Entry corrected or reversed.
* Pool closed.
* Pool result published.
* Winner selected.
* Winner claim required.
* Winner claim received.
* Winner claim approved.
* Prize delivery initiated.
* Prize delivery completed.
* Gift-card delivery available.
* Rebate or store credit issued.
* Rebate or credit expiration warning.
* Purchase confirmed.
* Refund initiated.
* Refund completed.
* Payout initiated.
* Payout completed.
* Support ticket created.
* Support ticket updated.
* Identity verification status changed.
* Account restriction applied.
* Official rule or terms update requiring notice.

Transactional messages must not contain unrelated marketing content.

---

# 5.3 User-Requested Alerts

These alerts are created because the user explicitly follows, favorites, watches, saves, or requests something.

Examples:

* Favorited item has a new pool.
* Wishlist item becomes available.
* Coming-soon item goes live.
* Pool reaches a selected capacity threshold.
* Pool reaches a selected entries-remaining threshold.
* Followed brand has a new product.
* Followed retailer has a new pool.
* Followed category has new inventory.
* Saved search has new matches.
* Requested item was added.
* Similar item becomes available.
* Item returns after being unavailable.

These messages must follow the user’s channel and frequency preferences.

---

# 5.4 Operational Notifications

Operational messages communicate service conditions that materially affect the user.

Examples:

* Scheduled maintenance.
* Unexpected outage.
* Payment processing delay.
* Prize-delivery delay.
* Support response delay.
* Temporary suspension of a capability.
* Data correction affecting the user.
* Service restored.
* Incident resolved.

Operational notifications should be sent only to affected users where practical.

---

# 5.5 Educational Notifications

Educational messages explain how Zero-Loss works.

Examples:

* How entries work.
* How the Zero-Loss safety net works.
* How to read pool progress.
* How rebates are used.
* How winners are selected.
* How to protect an account.
* How notification controls work.
* How to contact support.
* How AMOE participation works where applicable.

Educational communication must be accurate, current, and consistent with official rules and legal review.

---

# 5.6 Founder Communications

Founder communications may include:

* Founder journey updates.
* Product-development updates.
* New feature announcements.
* Transparency reports.
* Milestone announcements.
* Behind-the-scenes content.
* Community messages.
* Explanations of major changes.

Founder communications are optional unless they contain required operational or legal information.

Users must be able to subscribe or unsubscribe separately from ordinary marketing where appropriate.

---

# 5.7 Promotional Notifications

Promotional messages may include:

* Featured collections.
* New-product announcements.
* Seasonal promotions.
* Referral campaigns.
* Partner campaigns.
* Weekly discovery digest.
* Category roundups.
* Limited-time legitimate offers.
* Re-engagement campaigns.

Promotional messages require appropriate consent and must have clear unsubscribe or preference controls.

Promotional communication must never imitate a security or transactional message.

---

# 6. Supported Channels

# 6.1 In-App Notifications

In-app notifications are required for Version 1.

They should support:

* notification inbox,
* unread count,
* read and unread state,
* action links,
* category labels,
* timestamps,
* related item or transaction context,
* preference links,
* and historical visibility.

In-app notifications provide a durable user-facing record but are not a substitute for the authoritative source record.

---

# 6.2 Email

Email is required for Version 1.

Email should be used for:

* security messages,
* important transactional confirmations,
* winner and claim notices,
* rebate and payout notices,
* support updates,
* user-requested alerts,
* digests,
* and approved promotional communication.

Email templates must be responsive, accessible, and readable without images.

---

# 6.3 Web Push

Web push is a future or late-Version-1 enhancement.

Web push may be useful for:

* user-requested item alerts,
* pool threshold alerts,
* claim reminders,
* important account updates,
* and service restoration.

Web push requires explicit browser permission and must not be requested immediately on first page load.

Permission should be requested only after the user understands the value.

---

# 6.4 SMS

SMS is not required for initial Version 1.

SMS may later support:

* critical security notices,
* winner claim reminders,
* high-priority user-requested alerts,
* payout notices,
* or time-sensitive account recovery.

SMS requires:

* explicit consent,
* clear opt-out,
* cost controls,
* provider controls,
* jurisdiction-specific compliance,
* quiet-hour handling,
* and legal review.

SMS must not be treated as the default channel.

---

# 6.5 Native Mobile Notifications

Native-app notifications are out of scope while Zero-Loss remains a web application.

The architecture should not assume an Apple App Store or Google Play application exists.

---

# 7. Version 1 Scope

# 7.1 Required for Version 1

* In-app notification inbox.
* Transactional email.
* Security email.
* User-requested email alerts.
* Immediate notification option.
* Daily digest option.
* Off option for optional messages.
* Read and unread state.
* Notification preferences page.
* Category-level preferences.
* Channel-level preferences.
* Favorite-derived alerts.
* Wishlist and Watchlist alerts.
* Coming-soon alerts.
* New-pool alerts.
* Real pool-threshold alerts.
* Support updates.
* Winner and claim notices.
* Wallet, entry, rebate, refund, and payout notices.
* Template versioning.
* Delivery logging.
* Idempotent creation and delivery.
* Deduplication.
* Retry processing.
* Failed-delivery visibility.
* Unsubscribe handling.
* Quiet-hour support for optional messages.
* User timezone.
* Separate preview and production behavior.
* Admin delivery-health controls.
* Consent history.
* Rate limiting.
* Security and privacy protections.
* Analytics.
* Automated tests.
* Founder verification checklist.

# 7.2 Recommended for Version 1

* Weekly digest.
* Founder update preference.
* Category and brand digest grouping.
* Unread-count badge.
* Mark all as read.
* Archive or hide user-facing inbox messages.
* Delivery-status visibility for critical messages.
* Template previews.
* Test-send capability.
* Global emergency pause.
* Email suppression list.
* Bounce and complaint processing.
* Expiration reminders at controlled intervals.
* Support for localizing date and time presentation.

# 7.3 Future Enhancements

* Web push.
* SMS.
* Multilingual templates.
* User-selected send time.
* Smart digest timing.
* Advanced campaign segmentation.
* Household notification profiles.
* Shared-account notification rules.
* Rich notification actions.
* Voice assistant integration.
* Notification preference import.
* AI-assisted copy review, with human approval.
* Advanced deliverability optimization.
* Geographic campaign controls.
* Notification A/B testing with ethical guardrails.
* In-product preference recommendations.
* Channel failover for critical messages.
* Delivery-provider redundancy.

---

# 8. Out of Scope for Version 1

Version 1 should not include:

* native mobile-app notifications,
* unlimited real-time promotional alerts,
* unrequested SMS,
* automatic browser push prompts on first visit,
* fake winner notices,
* fake purchase activity,
* fake pool activity,
* fake urgency,
* mass direct messaging between users,
* public social-notification feeds,
* automated marketing created without approval,
* AI-generated campaign publication without human review,
* or notification content that changes financial state.

---

# 9. User Preference Experience

Recommended route:

`/account/notifications`

The preference page should be understandable to a nontechnical user.

## 9.1 Preference Groups

Suggested groups:

### Account and Security

Examples:

* Password changes.
* New-device login.
* Account restrictions.
* Verification updates.

These may be mandatory where required.

### Entries and Pool Results

Examples:

* Entry confirmations.
* Pool closed.
* Result published.
* Winner status.
* Claim reminders.

### Wallet and Payments

Examples:

* Funding completed.
* Funding failed.
* Rebate issued.
* Refund completed.
* Payout status.

### Favorites, Wishlist, and Watchlist

Examples:

* New pool opened.
* Item available.
* Selected threshold reached.
* Similar item available.

### Brands, Retailers, and Categories

Examples:

* New from followed brand.
* New from followed retailer.
* Category digest.

### Founder and Product Updates

Examples:

* Founder journey.
* Feature announcements.
* Platform milestones.

### Promotions

Examples:

* Weekly discovery.
* Seasonal offers.
* Referral campaigns.

---

# 9.2 Frequency Options

Optional notification types should support:

* Immediately.
* Daily digest.
* Weekly digest.
* Off.

Not every notification type needs every frequency.

Example:

* Password changed: Immediate only.
* Pool threshold alert: Immediate or Off.
* Category updates: Immediate, Daily, Weekly, or Off.
* Founder updates: Immediate, Weekly, or Off.

---

# 9.3 Channel Options

Users may choose available channels for each supported type:

* In-app.
* Email.
* Web push, when implemented.
* SMS, when implemented.

Unavailable channels should not appear as active choices.

---

# 9.4 Quiet Hours

Users should be able to select:

* Start time.
* End time.
* Timezone.
* Apply to optional messages.
* Allow critical security messages.
* Allow claim-deadline messages where appropriate.

Quiet hours must not silently suppress legally required or critical security communication.

---

# 9.5 Global Controls

Recommended controls:

* Pause all optional notifications.
* Turn off all promotions.
* Turn off favorite-based alerts.
* Turn off recommendation-based alerts.
* Pause alerts until a selected date.
* Restore recommended defaults.
* Export preferences where required.
* View consent history where appropriate.

---

# 9.6 Default Preferences

Defaults should be conservative.

Recommended general approach:

* Security: Enabled.
* Essential transactional: Enabled.
* In-app transactional: Enabled.
* User-requested alert: Enabled only when explicitly requested.
* Promotional email: Disabled until consent is provided.
* Founder updates: Explicit opt-in or clearly disclosed signup selection.
* SMS: Disabled.
* Web push: Disabled until permission is granted.
* Category marketing: Disabled unless selected.

---

# 10. Notification Center

Recommended route:

`/account/notifications/inbox`

## 10.1 Required Features

* Notification list.
* Unread count.
* Read and unread styling.
* Mark one as read.
* Mark all as read.
* Filter by class.
* Filter by date.
* Open related item or record.
* View message timestamp.
* Access preference settings.
* Pagination or incremental loading.
* Empty state.
* Loading state.
* Error state.

## 10.2 Suggested Filters

* All.
* Security.
* Entries and Results.
* Wallet and Payments.
* Favorites and Watchlist.
* Support.
* Founder Updates.
* Promotions.

## 10.3 Notification Information

Each notification should include, where relevant:

* Icon.
* Title.
* Plain-language summary.
* Timestamp.
* Read status.
* Notification class.
* Related entity.
* Primary action.
* Secondary preference action.
* Expiration or deadline, if genuine.
* Historical delivery information for critical notices where useful.

## 10.4 Retention

The platform should define retention by notification type.

Examples:

* Security messages: longer retention.
* Critical transaction notices: longer retention.
* Promotional notices: shorter retention.
* User-dismissed inbox messages: hidden from the user but retained only as required.

Deleting an inbox message must not delete the underlying business record.

---

# 11. Required Transactional Notification Types

The following notification types should be considered in Version 1.

## 11.1 Authentication and Security

* `account_verification_required`
* `account_verified`
* `password_reset_requested`
* `password_changed`
* `email_change_requested`
* `email_changed`
* `new_device_login`
* `suspicious_login_detected`
* `account_locked`
* `account_unlocked`
* `account_deletion_requested`
* `account_deletion_completed`

## 11.2 Wallet and Payment

* `wallet_funding_started`
* `wallet_funding_completed`
* `wallet_funding_failed`
* `payment_requires_action`
* `payment_corrected`
* `refund_started`
* `refund_completed`
* `refund_failed`
* `payout_started`
* `payout_completed`
* `payout_failed`

## 11.3 Entry and Pool

* `entry_confirmed`
* `entry_failed`
* `entry_reversed`
* `pool_closed`
* `pool_result_pending`
* `pool_result_published`
* `entry_not_selected`
* `entry_selected_as_winner`

## 11.4 Rebate and Purchase

* `rebate_issued`
* `rebate_adjusted`
* `rebate_expiring`
* `purchase_started`
* `purchase_completed`
* `purchase_failed`
* `order_status_changed`

## 11.5 Winner and Prize

* `winner_notification`
* `claim_required`
* `claim_reminder`
* `claim_received`
* `claim_approved`
* `claim_rejected`
* `prize_delivery_started`
* `prize_delivery_available`
* `prize_delivery_completed`
* `prize_delivery_problem`

## 11.6 Support and Operations

* `support_case_created`
* `support_case_updated`
* `support_case_resolved`
* `maintenance_scheduled`
* `service_incident_started`
* `service_incident_updated`
* `service_restored`

The final active list must be reconciled with financial, pool, support, and operational specifications.

---

# 12. User-Requested Alert Types

Version 1 should support:

* `favorite_new_pool`
* `wishlist_item_available`
* `watch_new_pool`
* `watch_coming_soon_live`
* `watch_capacity_threshold`
* `watch_entries_remaining`
* `followed_brand_new_item`
* `followed_retailer_new_item`
* `followed_category_new_item`
* `saved_search_new_match`
* `requested_item_added`
* `similar_item_available`

Each alert must be connected to a clear user action or preference.

---

# 13. Digest Requirements

## 13.1 Daily Digest

A daily digest may combine:

* new items from followed categories,
* new pools from favorites,
* wishlist availability,
* saved-search matches,
* founder updates,
* and approved promotional content.

Transactional and security messages should not be delayed merely to fit a digest.

## 13.2 Weekly Digest

A weekly digest may include:

* new inventory,
* followed-brand updates,
* wishlist summary,
* coming-soon items,
* platform updates,
* and educational content.

## 13.3 Digest Rules

1. Do not include duplicate items.
2. Exclude expired opportunities.
3. Exclude items the user cannot access.
4. Honor current preferences at send time.
5. Limit message length.
6. Clearly label sponsored content.
7. Do not turn transactional messages into promotional digest content.
8. Provide a direct preference link.
9. Avoid repeated promotion of ignored content.
10. Record the items included in each digest.

---

# 14. Business Rules

1. A notification does not create financial state.
2. A delivery failure does not reverse the underlying transaction.
3. A delivery success does not prove the user read the message.
4. Transactional and promotional messages must remain separate.
5. User-requested alerts require an explicit triggering preference.
6. Optional messages must honor channel and frequency settings.
7. Critical security communication may override optional quiet hours.
8. Promotional consent must be recorded.
9. Unsubscribe requests must be honored promptly.
10. Duplicate event processing must not duplicate notifications.
11. Duplicate notification processing must not duplicate deliveries.
12. Every critical notification should reference the authoritative record through a safe link.
13. Sensitive data must not appear unnecessarily.
14. Full gift-card numbers, redemption codes, and financial credentials must not appear in ordinary notification content.
15. Winner messages must not expose a winner publicly without appropriate consent and legal approval.
16. Fake winner messages are prohibited.
17. Fake activity messages are prohibited.
18. Pool urgency may be communicated only from genuine state.
19. Notification templates must be versioned.
20. Template changes must not rewrite historical messages silently.
21. Preview and development environments must not send to production users.
22. Provider webhooks must be authenticated.
23. Delivery retries must be bounded.
24. Permanent failures must enter an observable failed state.
25. Users may not access another user's notifications.
26. Admin access must be restricted and audited.
27. Account suspension may limit optional messages while preserving required notices.
28. Notification deletion must not delete the underlying business record.
29. Time-based alerts must use the user's timezone where appropriate.
30. Deadline messages must state the exact date, time, and timezone.
31. Notification preference changes must apply before the next optional send.
32. A removed Favorite should disable only Favorite-derived alerts unless another Watch remains.
33. A removed Wishlist item should not silently delete a separately created Watch.
34. Completed pools must stop active capacity alerts.
35. Item-level and pool-level watches must remain distinct.
36. Marketing content must not be inserted into password-reset or security messages.
37. Consent must not be bundled unnecessarily.
38. The system must support a global emergency stop for optional deliveries.
39. Notification analytics must not become authoritative message state.
40. Financial corrections require new authoritative events and corresponding notifications rather than rewriting history.

---

# 15. Suggested Data Model

Final database implementation must be reviewed against the Master Architecture and implemented through version-controlled migrations.

## 15.1 `notification_preferences`

Suggested fields:

* `id`
* `user_id`
* `notification_type`
* `notification_class`
* `channel`
* `frequency`
* `enabled`
* `quiet_hours_start`
* `quiet_hours_end`
* `timezone`
* `consent_source`
* `consent_version`
* `consented_at`
* `unsubscribed_at`
* `created_at`
* `updated_at`

Suggested uniqueness rule:

`UNIQUE (user_id, notification_type, channel)`

## 15.2 `notifications`

Suggested fields:

* `id`
* `user_id`
* `notification_type`
* `notification_class`
* `template_id`
* `template_version`
* `title`
* `body`
* `action_url`
* `related_entity_type`
* `related_entity_id`
* `source_event_type`
* `source_event_id`
* `deduplication_key`
* `priority`
* `created_at`
* `read_at`
* `archived_at`
* `expires_at`
* `metadata`

Recommended uniqueness rule:

`UNIQUE (deduplication_key)`

where appropriate.

## 15.3 `notification_deliveries`

Suggested fields:

* `id`
* `notification_id`
* `channel`
* `provider`
* `provider_message_id`
* `destination_reference`
* `status`
* `attempt_count`
* `scheduled_for`
* `last_attempt_at`
* `sent_at`
* `delivered_at`
* `opened_at`
* `clicked_at`
* `bounced_at`
* `complained_at`
* `failed_at`
* `failure_code`
* `failure_reason`
* `deduplication_key`
* `created_at`
* `updated_at`

## 15.4 `notification_templates`

Suggested fields:

* `id`
* `notification_type`
* `channel`
* `version`
* `subject_template`
* `title_template`
* `body_template`
* `action_label`
* `is_active`
* `approved_by`
* `approved_at`
* `created_at`
* `updated_at`

## 15.5 `notification_consent_history`

Suggested fields:

* `id`
* `user_id`
* `channel`
* `notification_class`
* `action`
* `source`
* `consent_version`
* `occurred_at`
* `ip_metadata`
* `user_agent_metadata`

Sensitive network metadata should be retained only as necessary.

## 15.6 `notification_suppressions`

Suggested fields:

* `id`
* `user_id`
* `channel`
* `destination_hash`
* `reason`
* `source`
* `created_at`
* `expires_at`
* `resolved_at`

## 15.7 `notification_jobs`

If a database-backed job mechanism is selected, suggested fields may include:

* `id`
* `notification_id`
* `channel`
* `status`
* `attempt_count`
* `available_at`
* `locked_at`
* `locked_by`
* `last_error`
* `created_at`
* `updated_at`

The final queue technology must be decided through architecture review rather than assumed in this document.

---

# 16. Server and API Requirements

## 16.1 Server Authority

Notification creation, preference updates, and delivery scheduling must be authorized server-side.

The server must derive the user from verified authentication.

Client-supplied user IDs must never determine ownership.

## 16.2 Event-Driven Creation

Critical notifications should be created from authoritative server events.

Examples:

* payment webhook confirmed,
* entry transaction committed,
* pool result finalized,
* rebate ledger event written,
* claim status changed,
* support case updated.

The client should not be trusted to declare these events complete.

## 16.3 Required Operations

The capability should support:

* List notifications.
* Retrieve unread count.
* Mark one as read.
* Mark all as read.
* Archive a user-facing notification.
* Retrieve preferences.
* Update preferences.
* Record consent.
* Create notification from an authorized event.
* Schedule delivery.
* Retry delivery.
* Suppress destination.
* Process provider webhook.
* Preview template.
* Send approved test message.
* Pause optional delivery.
* Resume optional delivery.

## 16.4 Idempotency

Notification creation and delivery must use stable idempotency or deduplication keys.

Example logical key:

`entry-confirmed:{entry_id}:{user_id}:v1`

Retries must return the existing result rather than creating duplicate messages.

## 16.5 Rate Limits

Rate limits should apply to:

* preference changes,
* test sends,
* verification messages,
* password-reset requests,
* watch-trigger creation,
* campaign sends,
* and public-facing notification endpoints.

Security-message rate limiting must avoid locking legitimate users out of account recovery.

## 16.6 Authorization

Users may:

* read their own notifications,
* update their own optional preferences,
* mark their own messages read,
* and manage their own consent.

Users may not:

* create arbitrary transactional messages,
* send messages to other users,
* change provider results,
* or access another user’s notification history.

---

# 17. Delivery Architecture

## 17.1 Durable Processing

Notification delivery should use a durable queue, job system, or event-processing mechanism.

It must not depend solely on:

* an open browser tab,
* a single user request remaining active,
* or a best-effort client callback.

## 17.2 Delivery Flow

Recommended logical flow:

1. Authoritative event occurs.
2. Event is committed successfully.
3. Notification eligibility is evaluated.
4. Notification record is created idempotently.
5. User preferences are checked.
6. Delivery job is scheduled.
7. Provider request is sent.
8. Provider response is recorded.
9. Provider webhook updates final status.
10. Failure is retried or escalated.
11. User-facing inbox state remains available.

## 17.3 Transaction Boundary

A business transaction should not be rolled back solely because an external email provider is unavailable.

The authoritative operation and notification scheduling should be coordinated safely.

An outbox or equivalent reliable-event pattern should be evaluated during implementation.

## 17.4 Retry Strategy

Retry behavior should include:

* bounded attempts,
* increasing delay,
* classification of temporary versus permanent failures,
* no duplicate delivery,
* and visibility after final failure.

## 17.5 Failed-Delivery Handling

Permanent failures should support:

* suppression,
* admin visibility,
* user preference warning where appropriate,
* destination correction,
* and safe alternative-channel consideration for critical messages.

## 17.6 Provider Webhooks

Provider webhooks must:

* verify signatures,
* reject replay where practical,
* be idempotent,
* record status changes,
* avoid exposing secrets,
* and produce audit records.

---

# 18. Template Requirements

## 18.1 Template Versioning

Every notification must record the template version used.

Historical messages should remain understandable even after templates change.

## 18.2 Template Content

Templates should include:

* clear sender identity,
* concise subject or title,
* plain-language explanation,
* exact action when required,
* safe action link,
* support link,
* preference or unsubscribe link where applicable,
* and company/legal information where required.

## 18.3 Dynamic Variables

Dynamic variables must be:

* allowlisted,
* escaped,
* validated,
* and sourced from authoritative records.

Arbitrary HTML or user-supplied script must never be rendered.

## 18.4 Preview and Approval

Templates should support:

* preview with test data,
* mobile preview,
* plain-text preview,
* accessibility review,
* legal review when required,
* approval status,
* and test delivery.

## 18.5 Branding

Notifications should follow the approved design system and communication voice.

Security and financial messages should favor clarity over decorative branding.

---

# 19. Security and Privacy

## 19.1 Row Level Security

User-facing notification, preference, and consent tables must use Row Level Security where applicable.

## 19.2 Sensitive Information

Messages must not expose:

* passwords,
* session tokens,
* service-role keys,
* full payment credentials,
* full gift-card redemption codes,
* full identity documents,
* internal fraud scores,
* private admin notes,
* or unrestricted account identifiers.

## 19.3 Secure Links

Sensitive actions should use:

* authenticated routes,
* short-lived signed links where appropriate,
* one-time tokens where appropriate,
* and server-side validation.

The notification link itself must not be treated as sufficient authorization for high-risk actions unless specifically designed and reviewed.

## 19.4 Destination Privacy

Email addresses and phone numbers must be protected as personal information.

Logs should avoid displaying full destinations unnecessarily.

## 19.5 Preference Privacy

A user may access only their own notification preferences and history.

## 19.6 Administrative Access

Administrative access should be role-restricted, logged, and limited to legitimate operational needs.

## 19.7 Data Retention

Retention periods should vary by message class and legal requirement.

The platform should not retain detailed delivery metadata forever without purpose.

## 19.8 Account Deletion

Account deletion must follow approved retention requirements.

Some transactional and consent records may need to be retained or anonymized rather than destroyed immediately.

---

# 20. Fraud and Abuse Considerations

Potential abuse includes:

* notification bombing,
* repeated verification requests,
* password-reset harassment,
* fake account creation,
* bot-generated watch alerts,
* referral spam,
* malicious destination changes,
* email enumeration,
* SMS abuse,
* campaign misuse,
* provider webhook spoofing,
* fraudulent winner messages,
* and social-engineering attempts.

Required controls may include:

* rate limits,
* CAPTCHA or challenge where appropriate,
* account-age checks,
* destination-verification steps,
* change-confirmation messages,
* webhook signatures,
* deduplication,
* abuse monitoring,
* suppression lists,
* admin permissions,
* and incident alerts.

The platform must never allow an administrator or compromised template to issue a false financial claim without traceability.

---

# 21. Administrative Requirements

The admin portal should support:

* Delivery health dashboard.
* Message volume by type and channel.
* Provider-status view.
* Failed-delivery queue.
* Retry controls.
* Suppression management.
* Bounce and complaint visibility.
* Template management.
* Template version history.
* Template approval.
* Test sends.
* Preview sends.
* Campaign scheduling.
* Campaign pause.
* Global optional-message pause.
* Per-type pause.
* Rate-limit controls.
* Consent audit.
* Unsubscribe audit.
* User-specific troubleshooting.
* Incident communication.
* Delivery export.
* Fraud and abuse indicators.
* Role-based access.
* Administrative audit logs.

Admin users must not be able to:

* alter financial records through notification tooling,
* fabricate winner status,
* change pool results,
* or bypass user consent without documented legal or operational authority.

---

# 22. Analytics Requirements

Recommended events:

* `notification_created`
* `notification_scheduled`
* `notification_sent`
* `notification_delivered`
* `notification_failed`
* `notification_bounced`
* `notification_complained`
* `notification_opened`
* `notification_clicked`
* `notification_read_in_app`
* `notification_archived`
* `notification_preference_changed`
* `notification_consent_granted`
* `notification_consent_withdrawn`
* `notification_unsubscribed`
* `digest_generated`
* `digest_sent`
* `watch_alert_triggered`
* `template_previewed`
* `test_notification_sent`
* `notification_suppressed`

Useful metrics:

* Delivery rate.
* Failure rate.
* Bounce rate.
* Complaint rate.
* Open rate.
* Click rate.
* Unsubscribe rate.
* Digest engagement.
* Time from trigger to delivery.
* Duplicate-prevention count.
* Retry success rate.
* Preference-change rate.
* User-requested alert conversion.
* Winner-notice acknowledgment rate.
* Claim-reminder effectiveness.
* Support-notification response rate.

Open and click tracking must be handled carefully because provider and privacy limitations may make those signals incomplete.

Analytics must not determine authoritative delivery state when the provider status says otherwise.

---

# 23. Accessibility Requirements

## 23.1 Email

Emails should:

* use semantic structure,
* have descriptive links,
* avoid image-only information,
* include useful alternative text,
* maintain readable contrast,
* work at increased text size,
* include a plain-text version,
* and remain understandable with images blocked.

## 23.2 In-App Inbox

The inbox should:

* support keyboard navigation,
* expose unread state to screen readers,
* provide visible focus,
* avoid color-only status,
* use understandable timestamps,
* announce preference-save results,
* and respect reduced motion.

## 23.3 Preference Controls

Controls must use:

* clear labels,
* clear descriptions,
* accessible toggles,
* understandable grouping,
* and confirmation after changes.

## 23.4 Time and Deadline Communication

Deadlines should use exact dates and times with timezone.

Relative phrases such as “soon” should not be the only deadline information.

---

# 24. Mobile Requirements

On mobile:

* The notification inbox must be easy to scan.
* Unread state must be visible.
* Actions must be tap-friendly.
* Preference groups should use expandable sections where helpful.
* Digest settings should remain understandable.
* Quiet-hour controls should be easy to operate.
* Long messages should not require horizontal scrolling.
* Action links should return users to the correct mobile web route.
* Permission prompts should not block first use.
* Weak-network states should provide retry guidance.

---

# 25. Performance Requirements

The capability should support:

* indexed notification retrieval,
* paginated inbox results,
* efficient unread-count queries,
* batch job processing,
* bounded retries,
* provider rate limits,
* digest generation at scale,
* and high-volume event bursts.

Performance testing should include:

* mass pool closure,
* large winner/result batches,
* high-volume daily digest generation,
* provider slowdown,
* repeated webhook delivery,
* and many concurrent preference updates.

A notification burst must not compromise:

* entry processing,
* wallet operations,
* payment webhooks,
* pool closure,
* winner selection,
* or claim processing.

---

# 26. Failure and Edge Cases

The implementation must address:

* Duplicate source events.
* Duplicate job execution.
* Duplicate provider webhook.
* Provider timeout.
* Provider outage.
* Temporary bounce.
* Permanent bounce.
* Spam complaint.
* User unsubscribes while message is queued.
* User changes email while message is queued.
* User changes timezone.
* User enters quiet hours before delivery.
* User removes Favorite but retains Watch.
* User removes Wishlist item.
* Pool completes before threshold message is delivered.
* Pool state changes after notification creation.
* Claim deadline changes.
* Account is suspended.
* Account is deleted.
* Template is deactivated.
* Missing template variable.
* Invalid action URL.
* Preview environment attempts production send.
* Delivery succeeds but webhook is delayed.
* Delivery fails after underlying transaction succeeds.
* User marks message read on another device.
* Unread count becomes temporarily stale.
* Large inbox history.
* Malicious provider webhook.
* Rate limit exceeded.
* Global pause activated.
* Required legal notice during optional-message pause.

Each edge case requires:

* safe server behavior,
* understandable user behavior where relevant,
* logging,
* idempotency,
* and test coverage.

---

# 27. Testing Requirements

## 27.1 Authorization Tests

* User can view their notifications.
* User cannot view another user’s notifications.
* User can update their optional preferences.
* User cannot create arbitrary transactional messages.
* Admin access follows roles.

## 27.2 Idempotency Tests

* Duplicate event creates one notification.
* Duplicate job sends once.
* Duplicate provider webhook updates once.
* Retry does not duplicate delivery.
* Digest does not repeat the same event improperly.

## 27.3 Preference Tests

* Off prevents optional delivery.
* Immediate sends immediately.
* Daily digest groups correctly.
* Weekly digest groups correctly.
* Quiet hours delay optional delivery.
* Mandatory security message still follows approved rules.
* Unsubscribe takes effect.

## 27.4 Transactional Tests

* Entry confirmation is created only after authoritative success.
* Failed entry does not receive success confirmation.
* Winner notice matches finalized result.
* Rebate notice matches ledger event.
* Refund notice matches payment status.
* Notification failure does not reverse transaction.

## 27.5 Security Tests

* Cross-user access denied.
* Signed links expire.
* Malicious template variables are escaped.
* Webhook signatures are verified.
* Replay is handled safely.
* Sensitive values are not rendered.
* Preview cannot send to production.

## 27.6 Delivery Tests

* Temporary failure retries.
* Permanent failure stops.
* Bounce creates suppression where appropriate.
* Complaint updates consent and suppression.
* Provider timeout remains recoverable.
* Failover behavior follows approved design.

## 27.7 User Experience Tests

* Empty inbox.
* Loading inbox.
* Error inbox.
* Mark read.
* Mark all read.
* Mobile layout.
* Keyboard navigation.
* Screen-reader labels.
* Preference-save confirmation.
* Exact deadline formatting.

## 27.8 Performance Tests

* High-volume batch.
* Large inbox.
* Large digest.
* Concurrent preference changes.
* Provider throttling.
* Pool-result burst.

---

# 28. Acceptance Criteria

Version 1 is complete only when:

1. Users have an in-app notification inbox.
2. Users receive approved security and transactional emails.
3. Users can configure optional notification preferences.
4. User-requested Favorite, Wishlist, and Watchlist alerts work.
5. Immediate and daily-digest modes work.
6. Optional messages honor quiet hours.
7. Transactional and promotional classes remain separated.
8. Duplicate events do not create duplicate messages.
9. Duplicate jobs do not create duplicate deliveries.
10. Delivery failures retry safely.
11. Permanent failures are visible to administrators.
12. Users cannot access another user’s notifications.
13. RLS and server authorization are active and tested.
14. Sensitive financial and prize credentials are excluded.
15. Provider webhooks are authenticated and idempotent.
16. Preview environments cannot contact production users.
17. Templates are versioned.
18. Consent and unsubscribe history are recorded.
19. Required admin controls exist.
20. Accessibility requirements pass.
21. Mobile behavior works.
22. Notification load does not compromise financial operations.
23. Automated tests pass.
24. Founder verification passes.
25. Documentation matches implementation.
26. Changes are committed to GitHub.

---

# 29. Founder Verification Checklist

Before approving Version 1:

1. Create a test user.
2. Verify the account email.
3. Trigger a password-reset email.
4. Confirm no password or secret appears in the message.
5. Fund a test wallet.
6. Confirm the funding notification matches the authoritative transaction.
7. Create a test entry.
8. Confirm the entry notification appears once.
9. Retry the same event.
10. Confirm no duplicate notification.
11. Favorite an item.
12. Enable a new-pool alert.
13. Trigger a test new pool.
14. Confirm the selected channel and frequency are honored.
15. Add an item to Wishlist.
16. Create an 80% Watch alert.
17. Simulate the threshold crossing.
18. Confirm one alert.
19. Simulate the event again.
20. Confirm no duplicate.
21. Enable daily digest.
22. Confirm eligible alerts are grouped.
23. Set quiet hours.
24. Confirm optional delivery is delayed.
25. Unsubscribe from promotions.
26. Confirm promotional email stops.
27. Confirm required transactional email still works.
28. Open the in-app inbox.
29. Mark one message read.
30. Mark all messages read.
31. Sign in as another user.
32. Confirm the second user cannot access the first user’s notifications.
33. Simulate provider failure.
34. Confirm retry occurs.
35. Simulate permanent failure.
36. Confirm admin visibility.
37. Test on mobile.
38. Test keyboard navigation.
39. Test a screen reader or accessibility checker.
40. Confirm no notification action changes ledger or pool state.

---

# 30. Future Enhancements

Potential future additions include:

* Web push.
* SMS.
* Provider redundancy.
* Multilingual templates.
* User-selected digest time.
* Smart send-time optimization.
* Household notification settings.
* Advanced preference recommendations.
* Interactive web-push actions.
* Rich founder updates.
* Product-specific communication centers.
* Advanced incident communications.
* Geographic campaign controls.
* Ethical A/B testing.
* Notification fatigue scoring.
* User-level message caps.
* Personalized digest sections.
* Additional delivery-provider failover.
* Advanced consent-management integrations.
* Automated accessibility linting.
* Template-approval workflows with multiple reviewers.

Future enhancements require separate approval and roadmap inclusion.

---

# 31. Architecture Decisions Introduced

This specification establishes the following proposed decisions:

1. Notifications are communication records, not financial truth.
2. Transactional and promotional communication are separate.
3. User-requested alerts require explicit user action or preference.
4. In-app and email are the primary Version 1 channels.
5. SMS is deferred until cost, demand, consent, and compliance justify it.
6. Notification creation and delivery are idempotent.
7. Delivery uses durable queued or event-driven processing.
8. Preview environments may not send to production recipients.
9. Templates are versioned.
10. Delivery failure does not reverse the underlying business transaction.
11. Optional notifications support frequency and quiet-hour controls.
12. Sensitive prize and financial credentials are excluded from ordinary messages.

These decisions should be reviewed for inclusion in:

`docs/decisions/ADR-004-notification-strategy.md`

---

# 32. Related Documents

This specification should be reviewed alongside:

* `docs/project-index.md`
* `docs/architecture/master-architecture.md`
* `docs/architecture/ai-operating-rules.md`
* `docs/architecture/output-contract.md`
* `docs/core/product-vision.md`
* `docs/core/product-concept.md`
* `docs/capabilities/README.md`
* `docs/capabilities/favorites.md`
* `docs/capabilities/wishlist.md`
* `docs/capabilities/search.md`
* `docs/capabilities/recommendations.md`
* `docs/capabilities/user-preferences.md`
* `docs/capabilities/activity-history.md`
* `docs/capabilities/catalog.md`
* `docs/capabilities/identity-and-profile.md`
* `docs/capabilities/rewards-and-referrals.md`
* `docs/capabilities/communications.md`
* `docs/product/homepage-spec.md`
* `docs/product/item-page-spec.md`
* `docs/product/account-wallet-spec.md`
* `docs/product/payments-and-payouts-spec.md`
* `docs/product/support-status-spec.md`
* `docs/product/design-system-spec.md`
* `docs/operations/admin-portal-spec.md`
* `docs/operations/analytics-spec.md`
* `docs/operations/fraud-and-risk-spec.md`
* `docs/operations/content-management-spec.md`
* `docs/decisions/ADR-004-notification-strategy.md`

---

# 33. Guiding Statement

Notifications exist to help users understand and control their relationship with Zero-Loss.

They must accurately reflect real events, protect user privacy, respect consent, and provide useful information without creating artificial pressure.

Every notification should answer:

* What happened?
* Why did it happen?
* Is action required?
* Where can the user verify it?
* How can the user control future messages?

Trust is more valuable than message volume.
