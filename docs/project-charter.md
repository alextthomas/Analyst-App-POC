# Project Charter: Event Analytics Platform (Analyst-App-POC)

Status: Submitted for HG-0 | Owner: @alextthomas (Engineering Lead, Product Owner) | Author: @alextthomasagent | Date: 2026-10-21

## 1. Business goal

Give every department one shared analytics tool, similar in spirit to Google
Analytics, so teams stop building one-off tracking for each application. Any
current or future Innovation Incubator application can send events to it and
department users can see what is happening in those applications.

## 2. Objectives

| #   | Objective                                                                                   | How we will know                                                   |
| :-- | :------------------------------------------------------------------------------------------ | :----------------------------------------------------------------- |
| O-1 | Collect usage data from many applications through **events**, not a request/response API    | Events from at least two sample producer applications are recorded |
| O-2 | Avoid the throughput ceiling of a rate-limited HTTP API                                     | Measurable ingest target set in the PRD NFRs and met in load tests |
| O-3 | Be **reusable**: a new application integrates without changes to the analytics service      | A new producer is onboarded using only published docs + client kit |
| O-4 | Department-agnostic: data is separated per application / department, with access controlled | Users see only data for applications they are entitled to          |
| O-5 | Department users view reports in a web dashboard                                            | Dashboard journeys accepted at HG-2                                |

## 3. Scope

In scope (v1, proof of concept):

- Event ingestion over a messaging system. NATS is the stated preference; the
  final choice (NATS / JetStream or an alternative) is a Solution Architect
  decision recorded in an ADR at Phase 4.
- A versioned event contract and a reusable client package that producer
  applications embed.
- Storage and querying of events suitable for analytics aggregation.
- A web dashboard for department users (UI in scope: Phase 3 / HG-2 applies).
- Multi-tenant separation by application / department.

Out of scope (v1) unless added through HG-C:

- Public HTTP ingestion API (explicitly excluded by the business goal).
- Production hosting; v1 targets local Docker and a staging-like environment.
- Billing, external customers, and third-party data sharing.

## 4. Stakeholders

| Role                                     | Who                                               |
| :--------------------------------------- | :------------------------------------------------ |
| Sponsor, Product Owner, Engineering Lead | @alextthomas (see role register)                  |
| All other gate roles                     | @alextthomas (`docs/governance/role-register.md`) |
| Producer applications                    | Future Innovation Incubator applications          |
| Dashboard users                          | Department staff (personas defined in the PRD)    |

## 5. Constraints

- Data enters only as events over a messaging system; no HTTP ingestion API.
- Must be packaged so it can be reused in future applications (client kit,
  documented contract, configuration rather than code changes per producer).
- Stack defaults from the SDLC guide (Section 4.2) unless an ADR justifies a
  change; see `CLAUDE.md`.
- Single-human team; deviations and compensating controls are recorded in the
  role register.

## 6. Compliance and data classification

- Events **will include personal data** (for example user identifiers, IP
  addresses, device identifiers). The work is therefore classified
  **Risk Tier 3** (PII / regulated data) pending confirmation at HG-4: HG-4 is
  mandatory, Security Lead approval is required at HG-3 and HG-5, and mutation
  testing applies to changed modules.
- The PRD must state the applicable privacy obligations (retention, consent,
  deletion / subject-access requests, minimisation, pseudonymisation) as NFRs
  or open questions. Which regulations apply (for example GDPR, CCPA) is an
  open question for the Product Owner.

## 7. Target environments

| Environment | Purpose                              | Notes                                 |
| :---------- | :----------------------------------- | :------------------------------------ |
| local       | Development                          | docker-compose                        |
| staging     | Smoke tests before the HG-6 decision | Docker-based, staging-like            |
| production  | Not in v1                            | Hosting decision deferred (open item) |

## 8. Repository and system context

- Repository: https://github.com/alextthomas/Analyst-App-POC
- Classification: **greenfield** (no existing application code).
- Lifecycle: `II Agentic_SDLC_with_Claude_Guide-Draft-v2.md`, orchestrated by
  `/sdlc-feature`. Feature id: `event-analytics`.

## 9. Connectors and scopes

| Connector     | Identity          | Scope                                                  |
| :------------ | :---------------- | :----------------------------------------------------- |
| GitHub (`gh`) | @alextthomasagent | Write role: branches, commits, PRs, issues; no approve |
| Others        | none              | None configured                                        |

## 10. Open items for HG-0

1. Branch protection on `main` (role register Section 3) must be configured by
   @alextthomas; the agent account cannot read or verify it.
2. Production hosting target is deferred beyond v1.
