# Project Zero-Loss

# API Design Standards

**Document Path:** `docs/architecture/api-design-standards.md`  
**Document Type:** Enterprise Architecture Specification  
**Version:** 1.0  
**Status:** Authoritative  
**Authority Level:** Enterprise Architecture  
**Owner:** Architecture Governance  
**Applies To:** All Public, Internal, Administrative, and Integration APIs  
**Last Updated:** July 2026

---

# Document Purpose

The API Design Standards define the mandatory rules governing every API exposed by Project Zero-Loss.

These standards ensure that every API is:

- consistent
- predictable
- secure
- versionable
- observable
- scalable
- auditable
- AI-generatable
- enterprise compliant

Regardless of which engineering team develops a service, every endpoint must appear as though it belongs to one unified platform.

---

# Architectural Authority

This document is authoritative for API design.

It is subordinate only to:

1. Master Architecture
2. Approved Architecture Decision Records (ADRs)

This specification governs:

- REST API design
- endpoint naming
- request structure
- response structure
- resource modeling
- versioning
- pagination
- filtering
- sorting
- validation
- authentication
- authorization
- concurrency
- error handling
- observability
- API evolution

Where conflicts exist:

1. Master Architecture
2. Approved ADRs
3. API Design Standards
4. Enterprise Data Dictionary
5. Domain Ownership Matrix
6. Domain Event Catalog
7. Capability Specifications

---

# Objectives

The Project Zero-Loss API platform must:

- expose a consistent interface
- minimize client complexity
- maximize backward compatibility
- preserve financial integrity
- prevent ambiguous behavior
- support distributed services
- support AI-assisted implementation
- maintain long-term stability

---

# Core API Principles

---

## 1. APIs Represent Business Capabilities

APIs expose business capabilities—not database tables.

Good:

```text
POST /entries
```

Bad:

```text
POST /entry_records
```

Good:

```text
POST /payments
```

Bad:

```text
POST /payment_table
```

Resources represent enterprise concepts defined in the Enterprise Data Dictionary.

---

## 2. Resource-Oriented Design

Every endpoint centers around a canonical resource.

Examples:

```text
Customers

Pools

Entries

Payments

Memberships

Rewards

Notifications
```

Resources own their lifecycle.

Actions operate upon resources.

---

## 3. One Canonical Resource Name

Every business concept has exactly one API resource.

Examples:

Correct:

```text
/customers

/pools

/entries

/winners
```

Never create aliases such as:

```text
/users

/accounts

/contestants

/tickets
```

unless formally approved.

---

## 4. Stable Resource Identity

Every resource has one immutable identifier.

Example:

```text
GET /customers/{customer_id}
```

Never expose:

- database IDs
- sequential integers
- provider identifiers

The canonical identifier defined within the Enterprise Data Dictionary must always be used.

---

## 5. Stateless Requests

Every request must contain all information required for processing.

Servers must never rely upon:

- hidden session state
- request ordering
- cached client assumptions

Authentication may establish identity.

Business state must remain explicit.

---

## 6. APIs Never Own Business Truth

APIs expose authoritative business capabilities.

They do not create independent truth.

Example:

Wallet API returns:

```text
Current Wallet Projection
```

It does not become the authoritative financial record.

Ledger remains authoritative.

---

## 7. Server Authority

Servers always determine:

- eligibility
- balances
- pricing
- permissions
- rewards
- membership benefits
- fraud decisions
- drawing eligibility

Clients provide requests.

Servers determine truth.

---

## 8. Consistency Over Convenience

Consistency always outweighs shorthand.

If every collection endpoint returns:

```text
items
```

No endpoint should instead return:

```text
results

records

objects

list
```

Uniformity reduces implementation complexity.

---

## 9. Explicitness

Requests should never rely on hidden assumptions.

Bad:

```text
POST /join
```

Good:

```text
POST /pools/{pool_id}/entries
```

The resource being acted upon is explicit.

---

## 10. Backward Compatibility

Breaking changes are prohibited within a published API version.

New functionality should be introduced by:

- optional fields
- additive resources
- additive endpoints
- new API versions when necessary

---

# API Architecture

Project Zero-Loss exposes four categories of APIs.

---

## Public APIs

Accessible by authenticated customers.

Examples:

- Account
- Wallet
- Pools
- Entries
- Membership
- Rewards
- Notifications

---

## Administrative APIs

Used exclusively by internal administrative systems.

Examples:

- Fraud Review
- Customer Support
- Pool Administration
- Content Management
- Reporting
- Compliance

Administrative APIs must never be exposed publicly.

---

## Internal Service APIs

Used for communication between platform services.

Characteristics:

- authenticated
- authorized
- observable
- versioned
- traceable

These APIs are not public contracts.

---

## Integration APIs

Used for approved third-party integrations.

Examples:

- Payment providers
- Shipping providers
- Identity verification providers
- Email providers
- SMS providers

Integration contracts remain isolated from internal service models whenever possible.

---

# REST Design Standards

Project Zero-Loss follows REST principles.

REST resources represent business entities.

REST endpoints should avoid RPC-style naming.

Preferred:

```text
POST /entries
```

Avoid:

```text
POST /createEntry
```

Preferred:

```text
DELETE /notifications/{notification_id}
```

Avoid:

```text
POST /deleteNotification
```

---

# URI Design Standards

URIs must:

- be lowercase
- use nouns
- use plural collections
- avoid verbs
- avoid implementation details

Correct:

```text
/customers

/customers/{customer_id}

/pools

/entries

/rewards
```

Incorrect:

```text
/getCustomer

/createEntry

/updateWallet

/deleteReward
```

---

# URI Naming Rules

Allowed characters:

- lowercase letters
- numbers
- hyphens

Avoid:

- underscores
- spaces
- camelCase

Good:

```text
/customer-preferences
```

Bad:

```text
/customer_preferences

/customerPreferences
```

---

# Resource Nesting

Resources may be nested only where ownership is clear.

Good:

```text
/customers/{customer_id}/preferences

/pools/{pool_id}/entries

/pools/{pool_id}/winners
```

Avoid excessive nesting.

Poor:

```text
/customers/{customer_id}/memberships/{membership_id}/benefits/{benefit_id}/history
```

Maximum nesting depth:

```text
2
```

Beyond two levels, expose independent resources.

---

# HTTP Method Standards

Only standard HTTP methods may be used.

| Method | Purpose |
|---------|----------|
| GET | Retrieve resource(s) |
| POST | Create resource |
| PUT | Full replacement |
| PATCH | Partial update |
| DELETE | Remove or deactivate resource |
| HEAD | Metadata retrieval |
| OPTIONS | Capability discovery |

Method semantics must remain consistent across every service.

---

# Safe Methods

Safe methods:

```text
GET

HEAD

OPTIONS
```

Must never modify business state.

---

# Idempotent Methods

The following methods must remain idempotent:

```text
PUT

DELETE
```

PATCH should be idempotent whenever practical.

POST is generally non-idempotent unless explicitly governed.

---

# API Versioning Strategy

Every externally published API must be versioned.

Example:

```text
/api/v1/customers

/api/v1/pools

/api/v1/entries
```

Versioning occurs within the URI.

Version numbers:

```text
v1

v2

v3
```

Pre-release versions must never become permanent production contracts.

---

# Versioning Principles

A new version is required only for breaking changes.

Examples:

Breaking:

- removing fields
- changing field meaning
- changing response shape
- changing identifiers
- changing resource semantics

Non-breaking:

- optional fields
- optional endpoints
- additional metadata
- additive resources

Breaking changes require publication of a new API version.

---

# API Evolution Rules

Published endpoints should evolve through additive change.

Preferred:

Add:

```json
{
  "membership": {
    "tier": "Gold"
  }
}
```

Avoid changing:

```json
{
  "membership": "Gold"
}
```

into

```json
{
  "tier": "Gold"
}
```

within the same version.

Compatibility always takes priority over convenience.

---

# AI Implementation Rules

All AI-generated APIs must:

- use canonical resource names
- follow REST conventions
- use canonical identifiers
- respect bounded-context ownership
- expose enterprise entities only
- avoid duplicate business models
- remain consistent with the Enterprise Data Dictionary
- follow these standards without exception

# Request Standards

Every API request must be:

- deterministic
- explicit
- version-aware
- fully validated
- traceable
- authenticated when required

Requests should contain only information necessary to complete the requested operation.

Servers must ignore unknown optional fields only when explicitly permitted by version policy.

---

# Request Headers

Every request should support the following standard headers where applicable.

| Header | Required | Purpose |
|---------|----------|----------|
| Authorization | Yes (authenticated endpoints) | Bearer access token |
| Content-Type | Yes (POST/PUT/PATCH) | Request media type |
| Accept | Yes | Expected response format |
| X-Correlation-ID | Yes | Distributed tracing |
| X-Request-ID | Optional | Client request identifier |
| If-Match | Conditional | Optimistic concurrency |
| Idempotency-Key | Conditional | Safe retry protection |
| Accept-Language | Optional | Localization |

Additional proprietary headers should be avoided unless approved through Architecture Governance.

---

# Content Types

Supported media types:

```text
application/json
```

Future approved formats may include:

```text
application/problem+json
```

Binary uploads should use:

```text
multipart/form-data
```

Internal APIs should avoid XML unless required for third-party integration.

---

# JSON Standards

JSON property names must:

- use camelCase
- remain descriptive
- avoid abbreviations
- remain stable

Good:

```json
{
  "customerId": "",
  "membershipTier": "",
  "createdAt": ""
}
```

Avoid:

```json
{
  "cust_id": "",
  "mTier": "",
  "crt": ""
}
```

---

# Standard Request Structure

Create requests should generally follow:

```json
{
  "data": {
    ...
  }
}
```

Optional metadata:

```json
{
  "data": {
    ...
  },
  "metadata": {
    ...
  }
}
```

Internal implementation details must never appear inside request bodies.

---

# Response Design Principles

Every response should be:

- predictable
- self-describing
- consistent
- version compatible
- easily consumable
- machine readable

Responses should expose business information—not database implementation details.

---

# Successful Response Structure

Recommended format:

```json
{
  "data": {
    ...
  }
}
```

Collection responses:

```json
{
  "data": [
    ...
  ]
}
```

Metadata belongs outside the resource.

Example:

```json
{
  "data": [...],
  "metadata": {
      ...
  }
}
```

---

# Metadata Object

Metadata may include:

```json
{
  "metadata": {
    "page":1,
    "pageSize":25,
    "totalItems":142,
    "totalPages":6
  }
}
```

Metadata must never duplicate resource fields.

---

# Hypermedia

Project Zero-Loss does not require HATEOAS.

Navigation links may be provided where useful but business semantics must never depend upon hypermedia controls.

---

# Standard HTTP Status Codes

Approved response codes:

| Code | Meaning |
|------|----------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 412 | Precondition Failed |
| 422 | Validation Failed |
| 429 | Rate Limited |
| 500 | Internal Error |
| 502 | Upstream Failure |
| 503 | Service Unavailable |
| 504 | Gateway Timeout |

Services should not invent custom HTTP status codes.

---

# Resource Creation

Successful creation returns:

```text
201 Created
```

Location header:

```text
Location:
/api/v1/pools/{poolId}
```

Body:

```json
{
  "data": {
      ...
  }
}
```

---

# Resource Deletion

Successful deletion should normally return:

```text
204 No Content
```

If deletion is asynchronous:

```text
202 Accepted
```

Hard deletes should be rare.

Most business entities transition through governed lifecycle states.

---

# Resource Updates

Full replacement:

```text
PUT
```

Partial update:

```text
PATCH
```

PATCH requests should modify only explicitly provided fields.

Missing fields must not imply deletion.

---

# Partial Update Standards

PATCH payloads should remain concise.

Example:

```json
{
  "data": {
    "displayName":"Chris"
  }
}
```

Avoid sending entire resources unnecessarily.

---

# Pagination Standards

Collection endpoints returning large datasets must support pagination.

Recommended parameters:

```text
?page=1

&pageSize=25
```

Response:

```json
{
  "data":[...],
  "metadata":{
      "page":1,
      "pageSize":25,
      "totalItems":500,
      "totalPages":20
  }
}
```

---

# Maximum Page Size

Default:

```text
25
```

Maximum:

```text
100
```

Administrative APIs may allow larger limits when approved.

---

# Cursor-Based Pagination

Large continuously changing collections should support cursor pagination.

Example:

```text
GET /entries?cursor=abc123
```

Response:

```json
{
  "data":[...],
  "metadata":{
      "nextCursor":"xyz456"
  }
}
```

Cursor values are opaque.

Clients must never infer meaning from cursor values.

---

# Filtering Standards

Filtering uses query parameters.

Example:

```text
GET /pools?status=open
```

Multiple filters:

```text
GET /entries?status=accepted&poolId=pol_123
```

Filtering parameters must remain stable.

---

# Sorting Standards

Sorting parameter:

```text
sort=
```

Examples:

```text
sort=createdAt

sort=-createdAt

sort=scheduledDrawAt
```

Minus indicates descending order.

---

# Search Parameters

Search should use:

```text
search=
```

Example:

```text
GET /catalog-items?search=PlayStation
```

Search semantics remain defined by Search capability specifications—not individual services.

---

# Sparse Fieldsets

Where appropriate:

```text
fields=
```

Example:

```text
GET /customers?fields=customerId,status
```

Servers may ignore unsupported field requests.

---

# Includes

Expandable relationships:

```text
include=
```

Example:

```text
GET /pools/{poolId}?include=ruleset
```

Include parameters must never violate bounded-context ownership.

---

# Bulk Operations

Bulk operations require dedicated endpoints.

Example:

```text
POST /notifications/bulk
```

Avoid overloading standard resource endpoints.

Bulk requests must support:

- validation
- partial failure reporting
- correlation identifiers
- audit logging

---

# Idempotency

Operations involving financial or externally visible side effects must support idempotency.

Examples:

- Payments
- Payouts
- Prize Claims
- Entry submissions
- Membership purchases

Idempotency uses:

```text
Idempotency-Key
```

Duplicate requests with the same key must not create duplicate business actions.

---

# Optimistic Concurrency

Mutable resources should support optimistic concurrency.

Preferred mechanism:

```text
If-Match
```

Example:

```text
If-Match:
W/"17"
```

Conflicts return:

```text
412 Precondition Failed
```

---

# Correlation IDs

Every request receives a correlation identifier.

Example:

```text
X-Correlation-ID
```

This identifier propagates through:

- APIs
- domain events
- background jobs
- integrations
- logs
- monitoring
- audit records

Correlation IDs enable complete request tracing across distributed services.

# Error Handling Standards

Project Zero-Loss APIs must return predictable, machine-readable error responses.

Error responses are part of the public API contract and are governed with the same rigor as successful responses.

Clients must never be required to inspect free-form error text to determine behavior.

---

# Error Response Format

All API errors must follow a consistent structure.

Recommended format:

```json
{
  "error": {
    "code": "ENTRY_LIMIT_EXCEEDED",
    "message": "The maximum number of entries has been reached.",
    "category": "Validation",
    "correlationId": "7f0c4d2d...",
    "timestamp": "2026-07-13T18:42:17Z"
  }
}
```

Optional fields:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "details": [...],
    "documentation": "...",
    "retryable": false
  }
}
```

---

# Error Categories

Every error belongs to a governed category.

Approved categories:

```text
Validation

Authentication

Authorization

BusinessRule

Conflict

RateLimit

Dependency

Compliance

Fraud

Internal
```

Categories must remain stable across API versions.

---

# Error Codes

Every business error receives a stable machine-readable code.

Examples:

```text
ENTRY_LIMIT_EXCEEDED

POOL_CLOSED

POOL_LOCKED

CUSTOMER_NOT_ELIGIBLE

MEMBERSHIP_REQUIRED

PAYMENT_DECLINED

WALLET_INSUFFICIENT_FUNDS

IDENTITY_VERIFICATION_REQUIRED

CLAIM_PERIOD_EXPIRED

DUPLICATE_ACCOUNT_DETECTED
```

Error codes are permanent once published.

---

# Customer Messages

Customer-facing messages should:

- be understandable
- avoid technical language
- avoid exposing implementation details
- avoid revealing security decisions

Example:

Good:

```text
Your payment could not be completed.
```

Avoid:

```text
Stripe API timeout during authorization.
```

---

# Internal Error Details

Internal logs may include:

- stack traces
- provider responses
- SQL diagnostics
- infrastructure failures

These details must never be exposed through public APIs.

---

# Validation Errors

Validation failures return:

```text
422 Unprocessable Entity
```

Example:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed.",
    "details": [
      {
        "field": "email",
        "code": "INVALID_EMAIL"
      },
      {
        "field": "dateOfBirth",
        "code": "REQUIRED"
      }
    ]
  }
}
```

Validation should identify every invalid field whenever practical.

---

# Authentication Errors

Unauthenticated requests return:

```text
401 Unauthorized
```

Example:

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication is required."
  }
}
```

Authentication failures should never reveal whether an account exists.

---

# Authorization Errors

Authenticated users lacking permission return:

```text
403 Forbidden
```

Example:

```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You do not have permission to perform this operation."
  }
}
```

Authorization responses should never disclose protected resources.

---

# Resource Not Found

Unknown resources return:

```text
404 Not Found
```

Example:

```json
{
  "error": {
    "code": "POOL_NOT_FOUND",
    "message": "The requested resource could not be found."
  }
}
```

Do not expose whether hidden resources exist.

---

# Conflict Errors

Conflicts return:

```text
409 Conflict
```

Examples:

- duplicate submissions
- conflicting lifecycle state
- concurrent updates
- unique constraint violations

---

# Business Rule Errors

Business rule failures indicate that the request is valid but violates governed platform rules.

Examples:

```text
POOL_ALREADY_COMPLETED

ENTRY_NOT_ALLOWED

MEMBERSHIP_EXPIRED

CLAIM_ALREADY_SUBMITTED

REWARD_NOT_ELIGIBLE
```

Business rules should return meaningful error codes.

---

# Dependency Errors

External provider failures should return appropriate gateway responses.

Examples:

```text
502 Bad Gateway

503 Service Unavailable

504 Gateway Timeout
```

Provider implementation details must remain hidden.

---

# Retry Guidance

Retryable responses should indicate retry recommendations.

Example:

```json
{
  "error": {
    "code": "SERVICE_TEMPORARILY_UNAVAILABLE",
    "retryable": true
  }
}
```

Retry behavior should remain deterministic.

---

# Authentication Standards

Authentication establishes customer identity.

Authorization determines permitted actions.

The two concepts must remain separate.

---

# Authentication Methods

Supported authentication mechanisms:

```text
OAuth 2.1

OpenID Connect

JWT Access Tokens

Refresh Tokens
```

Future authentication methods require Architecture approval.

---

# Access Tokens

Access tokens must:

- be short-lived
- be cryptographically signed
- include expiration
- include issuer
- include audience
- include subject
- include token identifier

Clients must never modify token contents.

---

# Refresh Tokens

Refresh tokens:

- remain confidential
- support rotation
- support revocation
- are stored securely
- are never transmitted unnecessarily

Compromised refresh tokens must be revocable immediately.

---

# Token Claims

Typical claims include:

```text
sub

iss

aud

exp

iat

jti

scope
```

Custom claims should be minimized.

---

# Authorization Standards

Authorization is evaluated server-side.

Clients must never determine permissions.

Examples include:

- membership entitlements
- administrative privileges
- support permissions
- fraud operations
- compliance operations

Authorization policies remain centrally governed.

---

# Role-Based Access

Administrative APIs should support roles.

Examples:

```text
Support

Operations

Finance

Fraud

Compliance

Content

Architecture

Platform Administrator
```

Roles grant capabilities—not unrestricted access.

---

# Permission Model

Permissions should be granular.

Examples:

```text
pool.read

pool.create

pool.publish

winner.review

ledger.read

ledger.export

customer.update

fraud.review
```

Avoid broad administrative permissions whenever possible.

---

# Least Privilege Principle

Every authenticated actor receives only the permissions required to perform assigned responsibilities.

Permissions should:

- expire when appropriate
- remain auditable
- support revocation
- support delegation where approved

---

# Administrative API Protection

Administrative endpoints require:

- strong authentication
- role verification
- audit logging
- correlation identifiers
- elevated monitoring

Sensitive operations may require step-up authentication.

---

# Multi-Factor Authentication

Administrative access should require MFA.

Recommended methods:

- authenticator applications
- hardware security keys
- approved enterprise authentication providers

SMS should not be the preferred MFA method where stronger alternatives are available.

---

# Session Management

Server-managed sessions should remain minimal.

Authentication state should primarily rely upon validated access tokens.

Session invalidation must support:

- logout
- password reset
- security events
- account closure
- administrative revocation

---

# Credential Storage

Passwords must:

- never be stored in plaintext
- use modern adaptive password hashing
- support future algorithm upgrades
- remain inaccessible to application administrators

Authentication providers should minimize direct password handling whenever practical.

---

# AI Implementation Rules

AI-generated APIs must:

- implement standardized error responses
- return governed HTTP status codes
- expose stable machine-readable error codes
- separate authentication from authorization
- enforce least privilege
- never expose sensitive implementation details
- remain fully consistent across all platform services

# Rate Limiting Standards

Every Project Zero-Loss API must protect platform stability through governed rate limiting.

Rate limiting prevents:

- abuse
- denial-of-service attacks
- accidental client misuse
- automated scraping
- infrastructure exhaustion

Rate limiting is a platform capability—not an application-specific behavior.

---

# Rate Limiting Principles

Rate limiting should be:

- predictable
- documented
- observable
- configurable
- proportional to risk

Limits should be based upon:

- endpoint category
- authentication state
- customer tier
- integration agreements
- administrative privilege

---

# Standard Rate Limit Response

Exceeded limits return:

```text
429 Too Many Requests
```

Example:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Request limit exceeded.",
    "retryable": true
  }
}
```

---

# Retry Headers

Rate-limited responses should include:

```text
Retry-After
```

Example:

```text
Retry-After: 30
```

Clients should respect retry guidance.

---

# Public API Limits

Default customer APIs should use conservative limits.

Example categories:

- Authentication
- Entries
- Wallet
- Notifications
- Rewards

Exact thresholds remain configurable.

Thresholds must never be hardcoded into business services.

---

# Administrative API Limits

Administrative APIs may have different limits based upon:

- role
- operational responsibility
- internal network
- emergency authorization

Administrative access does not eliminate rate limiting.

---

# Integration Rate Limits

Third-party integrations may receive negotiated limits.

Examples:

- Payment providers
- Shipping providers
- Identity verification providers
- Analytics integrations

Integration contracts define approved limits.

---

# Distributed Rate Limiting

Rate limiting must support distributed deployment.

Multiple application instances must enforce identical limits.

Implementation should avoid node-local counters whenever possible.

---

# Request Logging

Every API request should produce structured logs.

Logs support:

- debugging
- fraud investigation
- operational monitoring
- compliance
- auditing
- distributed tracing

---

# Structured Logging

Logs must be machine readable.

Preferred formats include structured JSON.

Avoid:

```text
User logged in successfully
```

Prefer:

```json
{
  "event":"customer.authenticated",
  "customerId":"cus_01J...",
  "correlationId":"abc123"
}
```

---

# Standard Log Fields

Recommended fields include:

| Field | Purpose |
|---------|----------|
| timestamp | Event time |
| correlationId | Request trace |
| requestId | Client request |
| service | Service name |
| endpoint | API endpoint |
| httpMethod | HTTP method |
| responseCode | HTTP status |
| durationMs | Processing time |
| customerId | Customer reference |
| actorType | Customer/Admin/System |
| outcome | Success or failure |

---

# Sensitive Logging Rules

Logs must never expose:

- passwords
- authentication secrets
- payment credentials
- verification documents
- personal identification numbers
- encryption keys
- access tokens
- refresh tokens

Sensitive fields should be:

- masked
- redacted
- omitted

---

# Audit Logging

Business operations affecting enterprise state require immutable audit records.

Examples:

- Customer creation
- Membership changes
- Prize assignments
- Draw execution
- Administrative overrides
- Ledger adjustments
- Fraud decisions
- Compliance approvals

Audit logs differ from operational logs.

Audit records are permanent business evidence.

---

# Audit Record Requirements

Audit records should capture:

- who
- what
- when
- where
- why
- correlation identifier
- affected resource
- previous state reference
- resulting state reference

Audit records must never be editable.

---

# Distributed Tracing

Every request receives a correlation identifier.

That identifier propagates through:

- APIs
- background jobs
- message queues
- domain events
- integrations
- scheduled jobs

Distributed tracing enables complete request reconstruction.

---

# Correlation Identifier Standards

Correlation identifiers must:

- be globally unique
- remain immutable
- persist throughout processing
- appear in logs
- appear in audit records
- appear in event metadata

Correlation identifiers must never encode business meaning.

---

# Performance Standards

Every API should define measurable performance objectives.

Performance targets should consider:

- customer experience
- infrastructure cost
- scalability
- operational resilience

---

# Response Time Objectives

Typical targets:

| Endpoint Type | Target |
|---------------|---------|
| Read | <250 ms |
| Write | <500 ms |
| Search | <750 ms |
| Authentication | <500 ms |
| Administrative | <1000 ms |

Targets represent service objectives—not guarantees.

---

# Timeout Standards

Requests should have defined timeout policies.

Typical categories:

- Client timeout
- Gateway timeout
- Upstream timeout
- Background processing timeout

Timeout behavior should remain predictable.

---

# Asynchronous Operations

Long-running operations should execute asynchronously.

Examples:

- Prize fulfillment
- Bulk notifications
- Large exports
- Analytics generation
- Recommendation rebuilding

Initial response:

```text
202 Accepted
```

Processing occurs separately.

---

# Long-Running Operation Tracking

Asynchronous operations should expose status resources.

Example:

```text
POST /exports

Response:

202 Accepted

Location:
/exports/{exportId}
```

Clients can retrieve operation progress independently.

---

# Caching Principles

Caching improves performance without changing business truth.

Only cache data that is:

- reconstructable
- replaceable
- non-authoritative

Authoritative financial data should never rely exclusively on caches.

---

# Cache-Control Headers

Responses should explicitly define caching behavior.

Examples:

```text
Cache-Control:
no-store
```

or

```text
Cache-Control:
private, max-age=60
```

Caching policies must align with data sensitivity.

---

# ETag Support

Mutable resources should support:

```text
ETag
```

Example:

```text
ETag:
W/"42"
```

ETags support:

- optimistic concurrency
- conditional retrieval
- reduced bandwidth

---

# Compression

Public APIs should support compression.

Recommended algorithms:

```text
gzip

br
```

Compression reduces bandwidth and improves client performance.

---

# API Documentation Standards

Every published endpoint must include documentation.

Documentation should define:

- purpose
- request
- response
- validation rules
- permissions
- rate limits
- error codes
- examples
- version history

Undocumented endpoints are prohibited.

---

# Example Requirements

Every endpoint should include examples for:

- successful requests
- successful responses
- validation failures
- authorization failures
- business rule failures

Examples improve developer experience and AI-assisted implementation.

---

# OpenAPI Standards

Public APIs should maintain OpenAPI specifications.

Specifications should include:

- schemas
- parameters
- security definitions
- examples
- error models
- response models

OpenAPI documents become authoritative implementation contracts.

---

# Deprecation Policy

Deprecated endpoints must:

- remain documented
- identify replacement endpoints
- specify removal timelines
- provide migration guidance

Silent removal of published APIs is prohibited.

---

# API Lifecycle States

Published APIs should follow governed lifecycle stages.

```text
Draft

Internal

Beta

General Availability

Deprecated

Retired
```

Lifecycle status should be documented for every externally visible API.

---

# AI Implementation Requirements

AI-generated APIs must:

- produce OpenAPI-compliant contracts
- implement structured logging
- propagate correlation identifiers
- enforce rate limiting
- generate immutable audit records
- support distributed tracing
- expose predictable lifecycle states
- comply with all standards defined in this document

---

# Compliance Statement

Every API within Project Zero-Loss must conform to this specification.

No endpoint may introduce custom conventions that conflict with these standards without formal Architecture Governance approval.

This document serves as the enterprise API constitution and is mandatory for all future development, integrations, and AI-generated implementations.
