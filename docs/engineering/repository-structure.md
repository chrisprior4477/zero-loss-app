# Project Zero-Loss

# Repository Structure

**Document Path:** `docs/engineering/repository-structure.md`  
**Document Type:** Enterprise Engineering Standard  
**Version:** 1.0  
**Status:** Authoritative  
**Authority Level:** Engineering Governance  
**Owner:** Architecture Governance & Engineering Leadership  
**Applies To:** All Source Code, Services, Infrastructure, Documentation, Build Pipelines, Automation, Third-Party Integrations, and AI-Generated Implementations  
**Last Updated:** July 2026

---

# Document Purpose

The Repository Structure defines the authoritative organization of the Project Zero-Loss source repository.

A consistent repository structure improves:

- discoverability
- maintainability
- onboarding
- architectural consistency
- automation
- deployment
- long-term scalability

Every engineer and AI assistant must organize code according to this document.

---

# Architectural Authority

This document governs the physical organization of all source code and engineering assets.

It is subordinate only to:

1. Master Architecture
2. Approved Architecture Decision Records (ADRs)
3. Engineering Standards

This document complements:

- Coding Standards
- API Design Standards
- Database Design Standards
- Event Schema Standards
- Deployment Architecture
- Security Architecture

Repository organization must remain aligned with enterprise architecture.

---

# Repository Philosophy

The repository should reflect the architecture of the platform.

Repository organization should make it immediately obvious:

- what the system contains
- where responsibilities belong
- who owns each component
- how services interact

Developers should spend minimal time searching for implementation locations.

---

# Organizational Principles

The repository should be organized according to:

- business capabilities
- bounded contexts
- architectural layers
- operational ownership

Repository organization should never be driven solely by programming language conventions.

---

# Single Source of Truth

Every artifact should have one authoritative location.

Examples include:

- documentation
- source code
- infrastructure
- configuration
- deployment manifests
- database migrations

Duplicate implementations should be avoided.

---

# Repository Model

Project Zero-Loss adopts a **monorepo** architecture.

The monorepo provides:

- unified version control
- consistent tooling
- shared engineering standards
- coordinated releases
- simplified dependency management
- centralized documentation

Independent services remain logically separated despite sharing a repository.

---

# Root Directory Philosophy

The repository root should contain only high-level project assets.

Typical root directories include:

```text
apps/
packages/
infrastructure/
docs/
scripts/
tools/
.github/
```

The root should remain clean and immediately understandable.

---

# Documentation Organization

All documentation belongs under the `/docs` directory.

Documentation should be organized by purpose.

Examples include:

```text
docs/
    architecture/
    engineering/
    product/
    operations/
    roadmap/
    decisions/
    capabilities/
```

Documentation should never be scattered throughout the repository.

---

# Application Organization

Applications should reside under a dedicated application directory.

Example:

```text
apps/
```

Each application should represent a deployable system.

Examples may include:

- customer platform
- administration portal
- internal tools
- background workers

Applications should remain independent.

---

# Service Organization

Each business service should exist within its own directory.

Example:

```text
apps/customer-service/
apps/payments-service/
apps/catalog-service/
apps/pools-service/
```

Service names should align with bounded context ownership.

---

# Shared Packages

Reusable technical components belong within a shared packages directory.

Example:

```text
packages/
```

Examples include:

- UI component libraries
- SDKs
- shared infrastructure adapters
- testing utilities
- reusable tooling

Business logic should not be centralized inside shared packages.

---

# Infrastructure Organization

Infrastructure definitions belong within a dedicated infrastructure directory.

Example:

```text
infrastructure/
```

Infrastructure may include:

- Terraform
- Kubernetes
- networking
- cloud resources
- deployment definitions

Infrastructure should be version controlled.

---

# Automation Organization

Automation scripts should remain isolated from business code.

Example:

```text
scripts/
```

Scripts may include:

- database setup
- maintenance
- reporting
- local development
- deployment helpers

Scripts should remain documented and repeatable.

---

# Tooling Organization

Engineering tooling should remain centralized.

Example:

```text
tools/
```

Examples include:

- code generators
- internal utilities
- build tooling
- repository automation

Tooling should support—not replace—engineering standards.

---

# GitHub Organization

Repository automation belongs under:

```text
.github/
```

Examples include:

- GitHub Actions
- issue templates
- pull request templates
- CODEOWNERS
- repository configuration

Repository governance should be automated whenever practical.

---

# Naming Standards

Repository names should remain:

- descriptive
- consistent
- business-oriented
- lowercase where appropriate
- free from unnecessary abbreviations

Names should follow the Enterprise Glossary.

---

# Directory Naming

Directories should communicate responsibility.

Preferred examples include:

```text
customer-service
payments-service
catalog-service
notifications-service
identity-service
```

Avoid generic names such as:

```text
misc
common
temp
old
new
test2
stuff
```

---

# File Placement Principles

Files should exist in the directory that owns their responsibility.

Business logic should never be stored in:

- infrastructure folders
- deployment folders
- documentation folders
- test directories

Ownership should always be obvious.

---

# Repository Scalability

The repository should support long-term growth.

Organization should remain manageable as the platform expands to include:

- additional services
- additional engineering teams
- additional deployment environments
- future integrations
- AI-generated implementations

Scalability should not require repository reorganization.

---

# Repository Discoverability

A new engineer should be able to locate any major component within minutes.

Repository organization should prioritize:

- predictability
- consistency
- logical grouping
- architectural alignment

Time spent searching for files is engineering waste.

---

# AI Repository Awareness

AI assistants should treat the repository structure as authoritative.

AI-generated code should:

- place new files in approved locations
- preserve directory ownership
- avoid creating unnecessary folders
- follow established naming conventions
- maintain bounded-context organization

Repository organization should remain consistent regardless of who—or what—creates the code.

---

# AI Implementation Rules

AI-generated implementations must:

- organize all files according to the approved repository structure
- preserve bounded-context ownership through directory organization
- place documentation exclusively within the `/docs` hierarchy
- isolate infrastructure inside the `/infrastructure` directory
- place reusable technical libraries within `/packages`
- keep deployable applications inside `/apps`
- centralize automation scripts within `/scripts`
- place repository tooling inside `/tools`
- preserve a clean, scalable repository root
- avoid creating generic or ambiguous directories
- maintain repository organization that aligns with the Master Architecture, Engineering Standards, Coding Standards, Enterprise Glossary, and all approved Architecture Decision Records (ADRs).

# Application Structure

---

# Application Layering

Every deployable application should follow a consistent internal architecture.

Applications should separate:

- Domain
- Application
- Infrastructure
- Interfaces
- Configuration
- Testing

Layer separation preserves maintainability and architectural integrity.

---

# Standard Application Structure

Each application should follow a predictable directory layout.

Example:

```text
apps/

    customer-service/
        src/
            domain/
            application/
            infrastructure/
            interfaces/
            configuration/
        tests/
        package.json
        README.md
```

Every application should use the same organizational model unless an approved ADR specifies otherwise.

---

# Source Directory

All production source code belongs within:

```text
src/
```

The source directory should contain only implementation code.

Examples include:

- business logic
- application services
- infrastructure
- interfaces
- configuration

Generated build artifacts should never be committed inside the source directory.

---

# Domain Layer

The Domain Layer contains the core business model.

Example:

```text
src/

    domain/
        customer/
        membership/
        pool/
        wallet/
        ledger/
```

The Domain Layer may contain:

- Aggregates
- Entities
- Value Objects
- Domain Events
- Domain Services
- Business Policies
- Specifications
- Domain Exceptions

The Domain Layer must remain independent of frameworks and infrastructure.

---

# Application Layer

The Application Layer coordinates business use cases.

Example:

```text
src/

    application/
        commands/
        queries/
        services/
        handlers/
        validators/
```

Responsibilities include:

- orchestration
- transaction coordination
- authorization coordination
- workflow management

Business decisions remain within the Domain Layer.

---

# Infrastructure Layer

The Infrastructure Layer implements technical capabilities.

Example:

```text
src/

    infrastructure/
        persistence/
        messaging/
        payments/
        notifications/
        storage/
```

Infrastructure includes:

- repositories
- external APIs
- messaging adapters
- database implementations
- cloud integrations

Infrastructure should never own business rules.

---

# Interface Layer

The Interface Layer exposes the application.

Example:

```text
src/

    interfaces/
        api/
        events/
        jobs/
        admin/
```

Responsibilities include:

- REST controllers
- event consumers
- scheduled jobs
- administrative endpoints

Interfaces should remain thin.

---

# Configuration Directory

Configuration should remain centralized.

Example:

```text
src/

    configuration/
```

Configuration may include:

- application settings
- dependency registration
- environment mappings
- feature flags

Configuration should not contain business logic.

---

# API Organization

REST APIs should be grouped by business capability.

Example:

```text
interfaces/

    api/
        customers/
        memberships/
        payments/
        pools/
        rewards/
```

API organization should mirror bounded context ownership.

---

# Domain Events

Domain Events should reside within the owning bounded context.

Example:

```text
domain/

    pool/

        events/
            EntryConfirmed.ts
            WinnerSelected.ts
```

Events should remain close to the business concepts they represent.

---

# Commands

Commands should reside within the Application Layer.

Example:

```text
application/

    commands/
```

Commands represent requests to perform business work.

Commands should not contain business rules.

---

# Queries

Queries should remain separate from Commands.

Example:

```text
application/

    queries/
```

Queries should retrieve information without modifying business state.

CQRS separation should remain explicit.

---

# Validators

Validation components should remain organized by responsibility.

Example:

```text
application/

    validators/
```

Validation may include:

- request validation
- command validation
- business rule validation

Validation ownership should remain clear.

---

# Repositories

Repository interfaces belong close to the Domain Layer.

Repository implementations belong within Infrastructure.

Example:

```text
domain/

    repositories/

infrastructure/

    persistence/
```

This separation preserves dependency inversion.

---

# Database Organization

Database implementations should remain isolated.

Example:

```text
infrastructure/

    persistence/
        migrations/
        repositories/
        models/
```

Persistence concerns should never leak into business logic.

---

# Database Migrations

Database migrations belong in one dedicated location.

Example:

```text
infrastructure/

    persistence/

        migrations/
```

Migration history should remain complete and version controlled.

---

# Event Handlers

Application event handlers should remain organized separately.

Example:

```text
application/

    handlers/
```

Handlers coordinate reactions to Domain Events.

Business ownership remains within the originating bounded context.

---

# External Integrations

External systems should be isolated through adapters.

Example:

```text
infrastructure/

    integrations/

        stripe/
        sendgrid/
        auth0/
```

Vendor-specific logic should never spread throughout the codebase.

---

# Shared Libraries

Reusable technical components belong within:

```text
packages/
```

Examples include:

```text
packages/

    ui/
    sdk/
    observability/
    testing/
```

Business logic should remain inside the owning service.

---

# Assets

Static assets should remain separate from source code.

Examples include:

```text
assets/

images/
icons/
fonts/
email/
```

Assets should not be mixed with application logic.

---

# Testing Structure

Tests should be organized alongside engineering responsibilities.

Example:

```text
tests/

    unit/
    integration/
    e2e/
    performance/
```

Testing structure should remain consistent across every application.

---

# Test Fixtures

Reusable testing data belongs in dedicated fixture directories.

Example:

```text
tests/

    fixtures/
```

Fixtures should be deterministic and version controlled.

---

# Mock Objects

Mock implementations should remain isolated from production code.

Example:

```text
tests/

    mocks/
```

Mocks should simulate behavior without duplicating business logic.

---

# Build Output

Compiled artifacts should never reside within source directories.

Examples include:

```text
dist/

build/

out/
```

Generated output should remain excluded from version control unless explicitly required.

---

# README Files

Every significant application should include a README.

Documentation should explain:

- purpose
- ownership
- dependencies
- startup
- testing
- deployment

Documentation improves onboarding and long-term maintenance.

---

# AI Application Awareness

AI-generated code should preserve the approved application structure.

AI should never:

- invent new architectural layers
- bypass bounded-context organization
- duplicate infrastructure
- relocate business logic into controllers
- create inconsistent directory layouts

Repository consistency is mandatory.

---

# AI Implementation Rules

AI-generated implementations must:

- organize every application according to the standard layered architecture
- preserve strict separation between Domain, Application, Infrastructure, and Interface layers
- keep business rules exclusively within the Domain Layer
- place Commands, Queries, Validators, and Handlers within the Application Layer
- isolate persistence, messaging, storage, and third-party integrations within Infrastructure
- keep REST controllers, event consumers, and scheduled jobs within the Interface Layer
- maintain dedicated directories for configuration, migrations, repositories, assets, and tests
- separate Commands from Queries in accordance with CQRS principles
- place reusable technical libraries in `/packages` without centralizing business logic
- ensure every application remains predictable, discoverable, scalable, and fully aligned with the Master Architecture, Engineering Standards, Coding Standards, Enterprise Glossary, and all approved Architecture Decision Records (ADRs).

# Infrastructure Structure

---

# Infrastructure Philosophy

Infrastructure should be organized with the same discipline as application code.

Infrastructure must be:

- version controlled
- repeatable
- automated
- testable
- observable
- secure

Manual infrastructure changes should be avoided whenever practical.

---

# Infrastructure Directory

All infrastructure assets belong within:

```text
infrastructure/
```

This directory should contain only infrastructure-related resources.

Examples include:

- Infrastructure as Code
- container definitions
- deployment manifests
- networking
- cloud resources
- platform configuration

Infrastructure should remain independent of application source code.

---

# Infrastructure as Code (IaC)

Infrastructure should be defined using Infrastructure as Code.

Example structure:

```text
infrastructure/

    terraform/
    networking/
    environments/
```

Infrastructure definitions should be:

- reproducible
- reviewable
- version controlled
- automated

Manual configuration should be minimized.

---

# Environment Organization

Infrastructure should support multiple deployment environments.

Example:

```text
infrastructure/

    environments/

        development/
        staging/
        production/
```

Each environment should maintain clearly defined configuration while sharing common infrastructure definitions whenever practical.

---

# Container Configuration

Container definitions should remain centralized.

Example:

```text
infrastructure/

    docker/
```

This directory may contain:

- Dockerfiles
- Docker Compose files
- container build scripts
- runtime configuration

Container definitions should remain standardized across services.

---

# Orchestration

Container orchestration resources should remain isolated.

Example:

```text
infrastructure/

    kubernetes/
```

Resources may include:

- Deployments
- Services
- Ingress
- ConfigMaps
- Secrets
- Autoscaling policies

Orchestration definitions should remain environment independent whenever possible.

---

# Networking

Network configuration should be documented and version controlled.

Example:

```text
infrastructure/

    networking/
```

Networking definitions may include:

- DNS
- load balancers
- firewalls
- routing
- virtual networks

Networking changes should undergo architectural review.

---

# Secrets Management

Secrets should never reside within source code repositories.

Infrastructure should integrate with approved secret management solutions.

Examples include:

- API credentials
- encryption keys
- certificates
- database passwords
- authentication secrets

Secret references may appear in configuration, but secret values must remain external.

---

# CI/CD Organization

Continuous Integration and Continuous Deployment configuration should remain centralized.

Example:

```text
.github/

    workflows/
```

CI/CD workflows may include:

- build validation
- automated testing
- security scanning
- deployment
- release automation

Automation should be standardized across repositories.

---

# Build Configuration

Build tooling should remain centralized.

Example:

```text
tools/

    build/
```

Build configuration may include:

- compiler configuration
- package management
- code generation
- artifact creation

Build systems should produce reproducible outputs.

---

# Deployment Configuration

Deployment definitions should remain version controlled.

Example:

```text
infrastructure/

    deployment/
```

Deployment assets may include:

- deployment templates
- rollout strategies
- rollback procedures
- deployment scripts

Deployment configuration should remain consistent across environments.

---

# Monitoring

Monitoring configuration should remain centralized.

Example:

```text
infrastructure/

    monitoring/
```

Monitoring may include:

- dashboards
- alert definitions
- health checks
- metrics collection
- service monitoring

Monitoring should support operational visibility.

---

# Logging Configuration

Logging infrastructure should remain separately managed.

Example:

```text
infrastructure/

    logging/
```

Logging configuration may include:

- log aggregation
- retention policies
- parsing rules
- routing configuration

Operational logs should remain consistent across all services.

---

# Observability

Observability resources should support:

- metrics
- logs
- traces
- alerts
- service health

Example:

```text
infrastructure/

    observability/
```

Observability should remain aligned with the Observability Architecture.

---

# Security Configuration

Infrastructure security should remain isolated.

Example:

```text
infrastructure/

    security/
```

Examples include:

- network policies
- certificate management
- identity integration
- access policies
- encryption configuration

Security configuration should be centrally governed.

---

# Scripts

Operational scripts belong in:

```text
scripts/
```

Examples include:

- deployment helpers
- migration execution
- backup automation
- maintenance tasks
- reporting utilities

Scripts should remain repeatable and documented.

---

# Database Administration

Operational database assets should remain isolated.

Example:

```text
infrastructure/

    database/
```

This directory may contain:

- initialization scripts
- backup procedures
- restore procedures
- operational maintenance

Business migrations remain within the owning service.

---

# Environment Variables

Environment variable templates should remain documented.

Example:

```text
configuration/

    env/
```

Environment templates should:

- define required variables
- document expected values
- exclude sensitive information

Secrets should never appear inside template files.

---

# Artifact Storage

Generated deployment artifacts should remain outside application source directories.

Examples include:

```text
artifacts/
```

Artifacts may include:

- build packages
- deployment bundles
- release archives

Artifacts should be reproducible from source.

---

# Backup Configuration

Backup automation should remain centrally managed.

Example:

```text
infrastructure/

    backup/
```

Backup definitions should specify:

- schedules
- retention
- validation
- restoration procedures

Backup strategies should align with Business Continuity requirements.

---

# Automation Standards

Infrastructure automation should be:

- repeatable
- deterministic
- idempotent
- monitored
- version controlled

Automation should reduce manual operational work.

---

# Infrastructure Documentation

Infrastructure documentation should accompany implementation.

Documentation should describe:

- architecture
- deployment
- dependencies
- operational procedures
- recovery processes

Documentation should remain synchronized with infrastructure changes.

---

# AI Infrastructure Awareness

AI-generated infrastructure should preserve the approved repository structure.

AI should never:

- create duplicate infrastructure definitions
- bypass Infrastructure as Code
- embed secrets in repositories
- invent inconsistent deployment layouts
- violate environment separation

Infrastructure organization must remain predictable and maintainable.

---

# AI Implementation Rules

AI-generated implementations must:

- organize all infrastructure assets within the approved `/infrastructure` hierarchy
- use Infrastructure as Code for all supported infrastructure resources
- maintain separate configurations for development, staging, and production environments
- centralize container, orchestration, networking, monitoring, logging, observability, and security configurations
- store deployment automation within approved CI/CD and scripting directories
- keep secrets external to source control while documenting required environment variables
- isolate operational database administration from application business logic
- generate repeatable, idempotent automation wherever practical
- maintain infrastructure documentation alongside implementation
- remain fully consistent with the Master Architecture, Engineering Standards, Coding Standards, Deployment Architecture, Observability Architecture, Security Architecture, Business Continuity & Disaster Recovery Architecture, and all approved Architecture Decision Records (ADRs).

# Repository Governance

---

# Repository Governance

Repository Governance establishes the enterprise rules that ensure the Project Zero-Loss repository remains organized, scalable, maintainable, and aligned with the approved architecture.

Repository Governance applies to:

- source code
- infrastructure
- documentation
- automation
- build pipelines
- deployment assets
- AI-generated implementations

Every repository change is subject to governance.

---

# Repository Ownership

Every directory should have clearly defined ownership.

Ownership includes responsibility for:

- implementation
- maintenance
- documentation
- testing
- security
- operational support

Ownership should align with the appropriate bounded context or engineering team.

---

# Directory Ownership

Each top-level directory should have one primary purpose.

Examples include:

| Directory | Primary Responsibility |
|-----------|------------------------|
| `/apps` | Deployable applications |
| `/packages` | Shared technical libraries |
| `/infrastructure` | Infrastructure as Code and platform resources |
| `/docs` | Enterprise documentation |
| `/scripts` | Operational automation |
| `/tools` | Engineering tooling |
| `/.github` | Repository automation and governance |

Responsibilities should remain stable over time.

---

# Repository Consistency

Every application should follow the same repository conventions.

Consistency includes:

- directory layout
- naming conventions
- architectural layering
- testing organization
- configuration placement

Consistency reduces onboarding time and maintenance effort.

---

# Repository Changes

Structural repository changes should be carefully controlled.

Examples include:

- adding top-level directories
- reorganizing services
- relocating shared packages
- changing application layouts
- introducing new infrastructure areas

Major structural changes should receive Architecture Governance approval.

---

# Repository Reviews

Repository organization should be reviewed periodically.

Reviews should evaluate:

- directory consistency
- architectural alignment
- duplicated structures
- obsolete directories
- scalability
- maintainability

Repository reviews should occur alongside architecture reviews.

---

# Repository Documentation

Repository organization should remain documented.

Documentation should explain:

- directory purpose
- ownership
- architectural boundaries
- contribution expectations

Documentation should remain synchronized with repository changes.

---

# Repository Naming Governance

Directory and repository names should remain:

- descriptive
- stable
- business-oriented
- architecturally consistent

Renaming major directories should be avoided unless justified by architectural evolution.

---

# Shared Package Governance

Shared packages should contain only reusable technical capabilities.

Examples include:

- UI components
- SDKs
- testing utilities
- observability libraries
- infrastructure helpers

Business logic should remain within the owning bounded context.

---

# Documentation Governance

The `/docs` directory is the authoritative location for project documentation.

Documentation should remain organized according to established categories.

Examples include:

- architecture
- engineering
- product
- operations
- roadmap
- capabilities
- decisions

Documentation should never be duplicated across multiple locations.

---

# Infrastructure Governance

Infrastructure definitions should remain isolated from application code.

Infrastructure should remain:

- version controlled
- reviewable
- reproducible
- automated

Infrastructure changes should follow the same governance process as application code.

---

# Repository Security

Repository organization should support secure development practices.

Repository governance should prevent:

- secret exposure
- unauthorized configuration changes
- unmanaged dependencies
- undocumented infrastructure
- uncontrolled automation

Repository organization should reinforce enterprise security policies.

---

# Scalability Governance

The repository should continue supporting future growth without major reorganization.

Growth may include:

- additional bounded contexts
- new engineering teams
- additional services
- new deployment environments
- expanded automation

Repository evolution should preserve consistency.

---

# Technical Debt Governance

Repository organization should be reviewed for structural technical debt.

Examples include:

- duplicate directories
- obsolete packages
- inconsistent layouts
- abandoned services
- unused tooling

Structural technical debt should be documented and periodically addressed.

---

# AI Repository Governance

AI-generated changes must preserve the approved repository structure.

AI should never:

- invent new architectural layouts
- relocate existing components without approval
- duplicate directory structures
- bypass ownership boundaries
- introduce inconsistent naming conventions

AI-generated repository changes should remain reviewable and predictable.

---

# Repository Acceptance Criteria

This Repository Structure specification is complete when:

- Every top-level directory has a clearly defined purpose and ownership.
- All applications follow a consistent layered architecture.
- Shared libraries remain separated from business logic.
- Infrastructure assets are isolated and managed as code.
- Documentation is centralized within the `/docs` hierarchy.
- Automation, tooling, and repository configuration are consistently organized.
- Repository structure supports scalability without requiring major reorganization.
- Structural changes are governed through Architecture Governance.
- AI-generated implementations preserve the approved repository organization.
- All repository assets remain aligned with the enterprise architecture.

---

# Related Architecture Documents

This specification must remain consistent with:

- Master Architecture
- Engineering Standards
- Coding Standards
- Enterprise Glossary
- Domain Ownership Matrix
- Domain Event Catalog
- Enterprise Data Dictionary
- API Design Standards
- Database Design Standards
- Event Schema Standards
- Security Architecture
- Integration Architecture
- Observability Architecture
- Deployment Architecture
- Performance & Scalability Architecture
- Testing & Quality Architecture
- Business Continuity & Disaster Recovery Architecture
- Data Governance & Information Lifecycle Architecture
- Output Contract
- AI Operating Rules
- All approved Architecture Decision Records (ADRs)

---

# Revision History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | July 2026 | Initial Repository Structure specification |

---

# Guiding Statement

The Repository Structure defines the authoritative organization of the Project Zero-Loss codebase. Every application, service, library, infrastructure component, document, automation script, and AI-generated artifact must reside in a predictable, well-governed location that reflects the enterprise architecture. By maintaining a consistent repository structure, Project Zero-Loss enables scalable development, efficient collaboration, simplified onboarding, reliable automation, and long-term maintainability while preserving clear ownership and architectural integrity across the platform.

