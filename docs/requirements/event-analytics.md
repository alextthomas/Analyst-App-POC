# PRD: Event Analytics Platform (feature id: event-analytics)

Status: DRAFT (revision 5: Product Owner round 3 answers and Q-30 incorporated), submitted for HG-1 review | Author: @alextthomasagent | Date: 2026-10-21
Approval: not approved (HG-1 is held by the Product Owner, @alextthomas)
Inputs: `docs/project-charter.md` (HG-0), `CLAUDE.md`, `docs/governance/role-register.md`, Product Owner business goal, confirmed facts, and answers to Q-1 to Q-30 (rounds 1 to 3). Classification: greenfield. Risk tier: 3, confirmed by the PO (Q-15) because raw PII transits the system and pseudonymous ids are still personal data under GDPR; formal confirmation is at HG-4.

Convention: **[confirmed]** means accepted by the PO. **Deferred (PO, 2026-10-21)** means the PO chose to decide later. No proposed-only values remain. This PRD states behaviours in technology-neutral terms. Technology and design choices belong to Phase 4 ADRs.

Charter note: the charter statement "events will include personal data" is being amended through HG-C in a separate PR handled by the orchestrator (Q-19). This PRD depends on that amendment.

## 1. Problem statement

Departments build one-off tracking for each application. Data is fragmented, inconsistent, and hard to compare. The business wants one shared analytics tool, similar in spirit to Google Analytics, usable by all departments. Applications send data as **events over a messaging system**, with no HTTP ingestion API, so that no API rate limit caps how much data can be sent. The tool must be reusable: a future application integrates without any change to the analytics service.

## 2. Personas

| ID  | Persona                   | Description and goals                                                                                                                                                                    |
| :-- | :------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-1 | Producer-app developer    | Builds an Innovation Incubator application. Wants to emit events with minimal effort, a stable contract, no rate limits.                                                                 |
| P-2 | Department dashboard user | Department staff. Wants to see aggregate usage of the applications they are entitled to. Platform role: "user".                                                                          |
| P-3 | Platform admin            | Operates the platform through the admin screen: accounts, tenants, entitlements, producer credentials, retention, health, dead-letter handling, GDPR requests, audit log. Role: "admin". |
| P-4 | Data subject (indirect)   | End user of a producer application. Appears in analytics only as a pseudonymous id. Has GDPR rights. Does not use the tool directly.                                                     |

## 3. Scope summary

In scope for v1: messaging-based ingestion; versioned event contract; reusable producer client kit (TypeScript, Node.js, Python); simulator producer applications built by this project as the O-1 samples; PII stripping at intake with a per-tenant pseudonymous user id; validation, deduplication and dead-letter handling; multi-tenant storage and query; web dashboard (aggregates only) for users; **admin screen** for accounts, tenants, entitlements, producer credentials, retention, ingestion health, dead-letter handling, GDPR requests and an audit log viewer; audit; local Docker and staging-like environments. Only deployment configuration remains file-based.
Out of scope: see Section 10.

## 4. Requirements

| ID     | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Persona  | Objective  |
| :----- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- | :--------- |
| REQ-1  | The platform shall accept analytics data only as events published to a messaging system. It shall expose no HTTP (or other request/response) endpoint for event ingestion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | P-1      | O-1, O-2   |
| REQ-2  | The platform shall impose no per-producer or global request-rate limit on event publishing. Overload shall be handled by back-pressure and buffering (REQ-8), not by rejecting producers at a rate threshold.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | P-1      | O-2        |
| REQ-3  | The platform shall define a versioned event contract (envelope plus per-event-type payload schema), published as documentation and machine-readable schema. The contract has no consent field (REQ-19) and defines the allow-listed free-form property keys (REQ-16).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | P-1      | O-3        |
| REQ-4  | The platform shall provide a reusable producer client kit for **TypeScript, Node.js and Python** (confirmed, Q-7), which validates events against the contract and publishes them, with no analytics-service code change needed per producer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | P-1      | O-3        |
| REQ-5  | A new producer application or tenant shall be onboardable through configuration only, via the admin screen (no code change or rebuild of the analytics service), using published docs and the client kit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | P-1, P-3 | O-3        |
| REQ-6  | The platform shall validate every received event against the contract and tenant authorisation. Invalid or unauthorised events shall be diverted to a dead-letter store with a machine-readable reason, never silently dropped and never stored as valid data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | P-1, P-3 | O-1        |
| REQ-7  | The platform shall tolerate redelivery and duplicates: an event with the same unique event id shall be counted once.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | P-1      | O-1        |
| REQ-8  | The platform shall provide delivery with no loss of acknowledged events, and shall apply back-pressure and buffering when the analytics side is slow or unavailable, so producers are not blocked or failed by analytics outages (NFR-5, NFR-6).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | P-1      | O-2        |
| REQ-9  | The platform shall separate data per tenant (application / department) in storage and queries. A user shall only ever see data of tenants they are entitled to.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | P-2, P-3 | O-4        |
| REQ-10 | The platform shall store events in a form that supports analytics aggregation (counts, unique users counted by pseudonymous id, time series, grouping by event attributes including country and browser/OS family) over time ranges.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | P-2      | O-5        |
| REQ-11 | The web dashboard shall let an authenticated user view an overview for an entitled application: total events, unique users, events over time, and top event types. The dashboard shows **aggregates only**: no per-user view, and neither the raw user id nor the pseudonymous id is ever shown (confirmed, Q-25).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | P-2      | O-5        |
| REQ-12 | The web dashboard shall let the user filter by application, date range and event type, and compare to the previous period. Maximum query range is 13 months (confirmed, Q-12).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | P-2      | O-5        |
| REQ-13 | Dashboard users shall authenticate with platform-managed accounts. There are exactly two roles, "user" and "admin" (confirmed, Q-8). Every dashboard query shall be authorised against the user's tenant entitlements. Admin functions are available to role "admin" only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | P-2, P-3 | O-4        |
| REQ-14 | An **admin screen** shall let an admin manage tenants, user entitlements, producer credentials (create, rotate, revoke, and the permissions each producer uses to publish) and per-tenant retention settings (default 13 months) (confirmed, Q-9 reversed by Q-20/Q-21; Q-28). On rotation, old and new credentials are both accepted for up to 24 hours; a revoked credential stops being accepted within 60 seconds (confirmed, Q-30). Nothing admin-facing remains file-based except deployment configuration. Changes to deployment configuration are audited by the Git commit or PR plus an audit entry written when the service loads the change (confirmed, Q-22).                                                                                                                                                                                                    | P-3      | O-3, O-4   |
| REQ-15 | The admin screen shall show ingestion health (throughput, lag, dead-letter count per tenant) and let an admin inspect and replay or discard dead-lettered events (confirmed, Q-21).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | P-3      | O-1        |
| REQ-16 | **No raw PII shall be persisted.** Stripping happens at the point of intake, before anything is stored in the event store (confirmed, Q-16). PII fields: email, name, phone, raw IP, precise location and raw device id (confirmed, Q-17); the producer's user id is replaced by the pseudonymous id (REQ-23). Raw IP, truncated IP and precise location are dropped. The platform keeps only country (derived from IP), browser/OS family and a per-tenant hashed device id (confirmed, Q-26). Free-form properties are filtered against an allow-list of keys; unlisted keys are dropped (confirmed, Q-17). Raw PII is allowed transiently in the client buffer, in transit and in dead-letter messages; dead-letter messages shall be stripped or expire within 7 days (confirmed, Q-16). Which component strips (client kit, ingest, other) is a Phase 4 design decision. | P-4, P-1 | Compliance |
| REQ-17 | The platform shall enforce a configurable retention period per tenant, default 13 months (confirmed, Q-4), and automatically purge expired data, including from backups within 35 days (confirmed, Q-4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | P-4, P-3 | Compliance |
| REQ-18 | The platform shall support GDPR data-subject access and deletion requests by pseudonymous id, run by an admin through the admin screen (confirmed, Q-12a/Q-18, Q-21). The pseudonymous id is personal data under GDPR, so these requests apply. The pseudonymous id is used only for unique-user counts and these requests (Q-25).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | P-4, P-3 | Compliance |
| REQ-19 | The platform shall not record, store or process end-user consent (confirmed, Q-5). Personal data is stripped always, regardless of consent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | P-4, P-1 | Compliance |
| REQ-20 | The platform shall record an audit trail of security- and privacy-relevant actions (sign-in, account/entitlement/tenant/producer-credential/retention changes, dead-letter replay or discard, subject access, deletion). Only admins may read it, through an audit log viewer in the admin screen where they can read and filter it (confirmed, Q-6b, Q-29).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | P-3      | Compliance |
| REQ-21 | The platform shall never write raw personal data to application logs, metrics or traces.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | P-4      | Compliance |
| REQ-22 | The platform shall run in local Docker (docker-compose) and a staging-like Docker environment. Production hosting is not part of v1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | P-3      | Charter    |
| REQ-23 | The pseudonymous id shall be a stable, per-tenant, keyed hash of the producer's user id (confirmed, Q-12a/Q-18). The same user id in the same tenant always yields the same id; the same user id in different tenants yields different ids. The raw user id is stored nowhere.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | P-4, P-2 | Compliance |
| REQ-24 | An admin shall be able to create, reset and disable platform user accounts through the admin screen (confirmed, Q-20). The first admin is created by a one-time setup command. Passwords shall be at least 12 characters and checked against a breached-password list. An admin-triggered reset issues a one-time link shown to the admin; v1 sends no email (confirmed, Q-27).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | P-3      | O-4        |
| REQ-25 | The dashboard shall expose aggregate data only through its query interface: no response to a role "user" request contains per-user records, raw user ids or pseudonymous ids (confirmed, Q-25).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | P-2, P-4 | Compliance |

## 5. User stories and acceptance criteria

### US-1 (P-1, REQ-1, REQ-2, REQ-4)

As a producer-app developer, I want to publish events using the client kit, so that my application is tracked without calling an analytics API or hitting rate limits.

- AC-1.1: Given an onboarded producer with valid credentials, when it publishes a contract-valid event via the client kit (TypeScript, Node.js or Python), then the event is accepted by the messaging layer and becomes queryable in the dashboard within 10 seconds at p95 [confirmed] under nominal load.
- AC-1.2: Given a deployed environment, when a port scan and route inventory of all analytics-platform components is run, then no endpoint accepts event data over HTTP, and an HTTP POST of an event to any exposed service returns 404 or 405 and stores nothing.
- AC-1.3: Given a load test of 5,000 events/second sustained for 10 minutes [confirmed] from at least 3 simulator producers, when events are published, then 0 events are rejected for rate reasons and 100% of valid events are ultimately stored.

### US-2 (P-1, P-3, REQ-5, REQ-14)

As a producer-app developer, I want to onboard a new application using configuration only, so that I do not need analytics-team code changes.

- AC-2.1: Given a new application not previously known, when a platform admin adds a tenant and a producer credential in the admin screen and the developer follows the published docs, then the first valid event from that app appears in the dashboard with no change to analytics-service source code and no rebuild of its images.
- AC-2.2: Given the onboarding docs and client kit, when a developer who has not worked on the platform follows them in a timed trial, then the first event is visible in 60 minutes or less [confirmed, Q-7b] (objective O-3).
- AC-2.3: Given the two simulator producer applications built by this project, when they run, then events from both are recorded in separate tenants (objective O-1).

### US-3 (P-1, REQ-3)

As a producer-app developer, I want a versioned event contract, so that my integration keeps working as the platform evolves.

- AC-3.1: Given the contract, when it is published, then every event envelope carries a contract version and every event type has a machine-readable schema in the repository with a changelog.
- AC-3.2: Given a producer using contract version N, when the platform releases a backward-compatible version N+1, then the producer's events continue to be accepted and stored with 0 failures in a contract compatibility test run in CI, for each supported client kit language.
- AC-3.3: Given a breaking change to the contract, when it is proposed, then it is released only as a new major version, and the previous major version is supported for at least 6 months [confirmed].

### US-4 (P-1, REQ-8)

As a producer-app developer, I want events to survive analytics-side slowness or outages without breaking my application, so that tracking never impacts my users.

- AC-4.1: Given the analytics consumer side is stopped for 15 minutes [confirmed], when producers keep publishing at nominal load, then after restart 100% of events published during the outage are stored, and 0 are lost.
- AC-4.2: Given the messaging layer is unreachable, when the client kit publishes an event, then the host application call returns without throwing and without blocking for more than 50 ms at p99 [confirmed, Q-23], and the client kit buffers events up to a configured limit.
- AC-4.3: Given the client kit buffer limit is reached during a prolonged outage, when further events are emitted, then the kit drops the oldest buffered events first [confirmed, Q-13], exposes a dropped-event counter, and logs one warning per interval without personal data.

### US-5 (P-2, REQ-10, REQ-11, REQ-25)

As a department dashboard user, I want an overview of an application's usage, so that I can understand what is happening.

- AC-5.1: Given an authenticated user entitled to application A with stored events, when they open the overview for a date range, then total events, unique users (distinct pseudonymous ids), an events-over-time series and the top 10 event types are shown, and event totals equal a direct count of stored events for that range (tolerance 0).
- AC-5.2: Given a 30-day range on a dataset of 10 million events [confirmed], when the overview loads, then it renders within 2 seconds at p95 [confirmed].
- AC-5.3: Given an entitled application with no events in the range, when the overview loads, then an empty-state message is shown instead of an error, and no error is logged.
- AC-5.4: Given a user with role "user", when they use any dashboard screen or call any query endpoint, then every response contains aggregates only: no per-user records, no raw user id and no pseudonymous id (confirmed, Q-25).

### US-6 (P-2, REQ-12)

As a department dashboard user, I want to filter by application, date range and event type, so that I can answer specific questions.

- AC-6.1: Given the overview, when the user selects an application, a date range and an event type, then all figures reflect exactly that filter and the active filters are visible and can be cleared.
- AC-6.2: Given a selected range, when the user enables comparison with the previous period, then both periods are shown with percentage change, and an invalid range (end before start, or longer than 13 months [confirmed]) shows a validation message and does not run the query.

### US-7 (P-2, REQ-9, REQ-13)

As a department dashboard user, I want to see only data for applications I am entitled to, so that data stays separated between departments.

- AC-7.1: Given user U entitled to tenant A only, when U requests data for tenant B (via UI or by calling the query API directly with tenant B's id), then the response is 403 or 404 and contains no tenant B data.
- AC-7.2: Given an automated isolation test suite with at least 2 tenants and seeded events, when run in CI, then 0 cross-tenant records appear in any query, and a user with no entitlements sees an empty application list.

### US-8 (P-2, P-3, REQ-13)

As a dashboard user or admin, I want to sign in with my platform account, so that only authorised staff see analytics.

- AC-8.1: Given a user without a session, when they open any dashboard or admin page or call any query endpoint, then access is refused (redirect to sign-in or 401) and no analytics data is returned.
- AC-8.2: Given a user with a valid platform-managed account and role "user" or "admin", when they sign in, then they reach the application list showing only entitled applications (admins also see the admin screen), and the session expires after 30 minutes idle [confirmed, Q-14].
- AC-8.3: Given failed sign-in attempts, when 5 consecutive failures occur within 15 minutes [confirmed, Q-23], then further attempts are throttled or locked and an audit entry is written.

### US-9 (P-3, REQ-5, REQ-9, REQ-14, REQ-20)

As a platform admin, I want to manage tenants and user entitlements in the admin screen, so that access is controlled per application and department.

- AC-9.1: Given an admin creates a tenant in the admin screen with a unique id and a department owner, when a producer publishes to its own tenant, then the event is accepted, and when it publishes to another tenant, then the event is rejected and dead-lettered with reason "unauthorised".
- AC-9.2: Given an admin grants or revokes a user entitlement in the admin screen, when the change is saved, then it takes effect for new queries within 60 seconds [confirmed, Q-23] and an audit entry records who, what and when.
- AC-9.3: Given a user with role "user", when they open an admin screen or call an admin function, then it is refused (403) and an audit entry is written.
- AC-9.4: Given an admin submits a tenant with a duplicate or missing id or department owner, when saved, then it is rejected with a field-level validation message and nothing is changed.

### US-10 (P-3, REQ-15)

As a platform admin, I want to monitor ingestion health and handle dead-lettered events in the admin screen, so that data problems are found and fixed.

- AC-10.1: Given running ingestion, when an admin opens the health view, then current throughput, consumer lag, and dead-letter count per tenant are shown, refreshed at least every 30 seconds [confirmed, Q-23].
- AC-10.2: Given dead-lettered events, when the admin selects replay or discard, then replayed events that now validate are stored exactly once (after stripping at intake), discarded events are removed from the store, and each action writes an audit entry with the admin id and event ids.
- AC-10.3: Given a dead-letter message that has not been replayed or discarded, when 7 days have passed since it was dead-lettered, then it is no longer present in the dead-letter store, or contains no raw PII (confirmed, Q-16).

### US-11 (P-3, P-4, REQ-18, REQ-23, REQ-20)

As a platform admin, I want to run GDPR access and deletion requests by pseudonymous id in the admin screen, so that we meet our privacy obligations.

- AC-11.1: Given a verified request identifying the subject by the producer's user id (resolved to the per-tenant pseudonymous id and not stored or logged raw), when an admin runs a subject access request, then an export of all stored data linked to that pseudonymous id is produced across all tenants within 10 days [confirmed internal target; GDPR limit one month], and contains no other subject's data.
- AC-11.2: Given a verified deletion request, when the admin executes it, then 0 records linked to the subject's pseudonymous ids remain in primary storage, and aggregates are recomputed or confirmed non-identifying, verified by a post-deletion query.
- AC-11.3: Given a subject access or deletion run, when it completes, then an audit entry records the request id, admin id, time and counts, without the raw user id or other raw identifier.
- AC-11.4: Given a request for which no data is linked to the subject, when the admin runs it, then the screen states that no data is held, and an audit entry records the request and outcome.

### US-12 (P-3, REQ-14, REQ-17)

As a platform admin, I want to set retention per tenant in the admin screen, so that data is not kept longer than allowed.

- AC-12.1: Given a tenant with retention of N days (default 13 months [confirmed]), when the purge job runs (at least daily [confirmed, Q-23]), then events older than N days are not returned by any query and are physically removed within 24 hours [confirmed, Q-23] of the purge run, and from backups within 35 days [confirmed].
- AC-12.2: Given an admin changes a tenant's retention in the admin screen, when saved, then an audit entry is written and the change applies to existing data at the next purge run; shortening is applied, and lengthening never resurrects purged data.
- AC-12.3: Given an admin enters a missing or non-numeric retention value, when saved, then it is rejected with a field-level validation message and the existing value is unchanged.

### US-13 (P-4, P-1, REQ-16, REQ-19, REQ-23)

As a data subject, I want raw personal data never stored and my user id only kept as a pseudonym, so that my privacy is protected.

- AC-13.1: Given events carrying email, name, phone, raw IP, truncated IP, precise location, raw device id and the producer's user id, when they are processed end to end, then no raw value of those fields is present in the event store, audit records, logs, metrics, traces or backups, verified by a scan of those stores in tests.
- AC-13.2: Given the event contract, when it is reviewed, then it contains no consent field, and the platform performs no consent lookup or recording; stripping applies identically to every event.
- AC-13.3: Given an event with free-form properties, when it is received, then only properties whose keys are on the allow-list are stored, unlisted keys are dropped, and a dropped-key count per tenant is recorded without the dropped values.
- AC-13.4: Given the same producer user id in tenant A on two events, when stored, then both carry the identical pseudonymous id; and given the same user id in tenant B, then the pseudonymous id differs from tenant A's; and the raw user id appears in no store.
- AC-13.5: Given an event with an IP address, a user agent and a device id, when stored, then the stored record has country (derived from the IP), browser/OS family and a hashed device id that differs between tenants for the same device, and contains no raw IP, truncated IP, precise location or raw device id (confirmed, Q-26).

### US-14 (P-3, REQ-20)

As a platform admin, I want an audit trail and an audit log viewer, so that I can show who did what.

- AC-14.1: Given any action listed in REQ-20, when it occurs, then an append-only audit record is written with actor, action, target, tenant, timestamp (UTC) and outcome, within 5 seconds [confirmed, Q-23], and contains no raw personal data.
- AC-14.2: Given audit records, when anyone attempts to edit or delete one through the application, then it is impossible or refused, and records are retained 12 months [confirmed, Q-6].
- AC-14.3: Given an admin opens the audit log viewer in the admin screen, when they filter by actor, action, tenant and date range, then only matching records are shown; and given a user with role "user", when they request the audit log, then access is refused (403) (confirmed, Q-6b, Q-29).
- AC-14.4: Given a change to deployment configuration (the only file-based admin-relevant configuration), when the service loads it, then an audit entry is written, and the change has a Git commit or PR as evidence (confirmed, Q-22).

### US-15 (P-1, REQ-6, REQ-7)

As a producer-app developer, I want invalid events rejected visibly and duplicates ignored, so that data quality is trustworthy.

- AC-15.1: Given an event that violates the schema (missing required field, wrong type, unknown event type or unsupported version), when it is received, then it is not stored as valid data, it is dead-lettered with a reason code and the offending field path, and a rejection counter for the tenant increments.
- AC-15.2: Given the same event id delivered 3 times, when processed, then exactly 1 record is stored and counts in the dashboard increase by 1.

### US-16 (P-3, REQ-13, REQ-24)

As a platform admin, I want to create, reset and disable user accounts in the admin screen, so that only the right staff can sign in.

- AC-16.1: Given an admin creates an account with a role of "user" or "admin", when saved, then the person can sign in with it and sees only entitlements granted, and an audit entry records who created what.
- AC-16.2: Given an admin disables an account, when saved, then the account cannot sign in, its existing sessions are refused on the next request, and an audit entry is written; and given an admin triggers a credential reset, then a one-time link is shown to the admin (no email is sent), it works once only, and an audit entry is written.
- AC-16.3: Given account creation, reset or disable, when it completes, then no password or credential value appears in logs, audit records or screens after creation, and invalid input (missing role, duplicate username) shows a field-level validation message.
- AC-16.4: Given a new or changed password, when it is shorter than 12 characters or appears in the breached-password list, then it is rejected with a validation message, and a password of 12 or more characters not in the list is accepted (confirmed, Q-27).
- AC-16.5: Given a fresh environment with no accounts, when the one-time setup command is run, then exactly one admin account is created; and when the command is run again after an admin exists, then it refuses and creates nothing (confirmed, Q-27).

### US-17 (P-3, P-1, REQ-14)

As a platform admin, I want to create, rotate and revoke producer credentials and their publish permissions in the admin screen, so that only authorised producers publish to their own tenant.

- AC-17.1: Given an admin creates a producer credential for a tenant with its permissions, when saved, then the secret is shown once only, a producer using it can publish to that tenant only, and an audit entry is written without the secret.
- AC-17.2: Given an admin rotates a producer credential, when saved, then both the old and the new credential are accepted for up to 24 hours (confirmed, Q-30) so producers can redeploy, and an audit entry is written recording the rotation and the overlap expiry time, without secrets.
- AC-17.3: Given a rotation whose 24-hour overlap has elapsed, when a producer publishes with the old credential, then the event is rejected and dead-lettered with reason "unauthorised", while the new credential continues to be accepted (confirmed, Q-30).
- AC-17.4: Given an admin revokes a producer credential, when 60 seconds have passed since saving [confirmed, Q-30], then events published with it are rejected and dead-lettered with reason "unauthorised", and an audit entry records who revoked it.

## 6. Non-functional requirements

| ID     | Category               | Requirement                                                                                                                                                                                    | Target                                                                                                                                                                                                       | Status                                                        |
| :----- | :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------ |
| NFR-1  | Performance            | Sustained ingest throughput                                                                                                                                                                    | 5,000 events/s sustained for 10 min                                                                                                                                                                          | Confirmed (Q-1)                                               |
| NFR-2  | Performance            | Burst ingest                                                                                                                                                                                   | 20,000 events/s for 60 s without loss, drained within 5 min                                                                                                                                                  | Confirmed (Q-1)                                               |
| NFR-3  | Performance            | Ingest-to-queryable latency (freshness)                                                                                                                                                        | p95 <= 10 s, p99 <= 60 s at nominal load                                                                                                                                                                     | Confirmed (Q-2)                                               |
| NFR-4  | Performance            | Dashboard query latency (30-day range, 10M events)                                                                                                                                             | p95 <= 2 s, p99 <= 5 s                                                                                                                                                                                       | Confirmed (Q-2)                                               |
| NFR-5  | Durability             | No loss of acknowledged events, including consumer outage and restart                                                                                                                          | 0 lost events in outage tests; test outage of 15 min                                                                                                                                                         | Confirmed (Q-3)                                               |
| NFR-6  | Availability           | Dashboard availability in staging-like environment (v1)                                                                                                                                        | 99.5% monthly; ingest never blocks producer applications (AC-4.2)                                                                                                                                            | Confirmed (Q-3). Production target: Deferred (PO, 2026-10-21) |
| NFR-7  | Recoverability         | Recovery after store failure                                                                                                                                                                   | RPO <= 5 min, RTO <= 4 h                                                                                                                                                                                     | Confirmed (Q-3)                                               |
| NFR-8  | Scalability            | Producers and tenants supported without code change; event size                                                                                                                                | >= 20 producers, >= 10 tenants, event size up to 64 KB                                                                                                                                                       | Confirmed (Q-1)                                               |
| NFR-9  | Tenant isolation       | No cross-tenant read or write                                                                                                                                                                  | 0 cross-tenant records in isolation tests; enforced in storage and query layer                                                                                                                               | Requirement                                                   |
| NFR-10 | Security               | Transport and authentication; credential change propagation                                                                                                                                    | Encrypted in transit (TLS 1.2+) outside local dev; producers and users authenticated; per-producer publish permission limited to own tenant; revocation effective within 60 s; rotation overlap at most 24 h | Requirement; credential timings confirmed (Q-30)              |
| NFR-11 | Security               | Secrets and dependencies                                                                                                                                                                       | 0 secrets in repository; 0 open critical/high dependency or SAST findings at HG-5; password min 12 characters with breached-list check                                                                       | Requirement; password rule confirmed (Q-27)                   |
| NFR-12 | Security               | Encryption at rest for stored data and backups                                                                                                                                                 | Enabled in staging-like environment; algorithm set by ADR                                                                                                                                                    | Requirement                                                   |
| NFR-13 | Audit                  | Audit coverage, completeness, retention, access                                                                                                                                                | 100% of REQ-20 actions recorded; append-only; retained 12 months; readable and filterable by admin only                                                                                                      | Confirmed (Q-6, Q-6b, Q-29)                                   |
| NFR-14 | Accessibility          | Dashboard and admin screen conformance                                                                                                                                                         | WCAG 2.2 AA; 0 critical automated axe violations; keyboard-only operation of all journeys                                                                                                                    | Requirement                                                   |
| NFR-15 | Privacy: retention     | Default and per-tenant retention; purge from backups                                                                                                                                           | Default 13 months; backups purged within 35 days                                                                                                                                                             | Confirmed (Q-4, GDPR)                                         |
| NFR-16 | Privacy: GDPR requests | Subject access and deletion turnaround                                                                                                                                                         | Within the GDPR deadline (one month); internal target 10 days                                                                                                                                                | Confirmed (Q-4, Q-18)                                         |
| NFR-17 | Privacy: minimisation  | No raw PII persisted; stripping at intake; only country, browser/OS family and per-tenant hashed device id kept from IP/device data; 0 raw PII in logs/traces; dead-letter stripped or expired | 100% of PII-class fields stripped before storage; 0 raw PII found in event store, backups, logs, traces (scan test); dead-letter messages stripped or expired within 7 days                                  | Confirmed (Q-5, Q-16, Q-17, Q-26)                             |
| NFR-18 | Privacy: residency     | Data location                                                                                                                                                                                  | No residency requirement for v1 (local Docker); revisit when production hosting is decided                                                                                                                   | Deferred (PO, 2026-10-21; Q-24)                               |
| NFR-19 | Observability          | Metrics and health: ingest rate, lag, dead-letter, errors; health endpoints; trace correlation                                                                                                 | Alert-ready metrics present for all four; health check responds <= 1 s                                                                                                                                       | Requirement                                                   |
| NFR-20 | Reusability            | Time to integrate a new producer; compatibility across TypeScript, Node.js, Python kits                                                                                                        | <= 60 min to first event; 0 compatibility test failures in CI                                                                                                                                                | Confirmed (Q-7b)                                              |
| NFR-21 | Maintainability        | Test and quality bar from `CLAUDE.md` Definition of Done                                                                                                                                       | Diff coverage >= 80%; mutation testing on changed modules (Tier 3)                                                                                                                                           | Requirement                                                   |

## 7. Assumptions

- A-1: Producer applications are written in TypeScript, Node.js or Python (confirmed, Q-7).
- A-2: Staging-like environment is Docker-based, as in the charter.
- A-3: A single organisation owns all tenants; no external customers.
- A-4: Dashboard users are internal staff with platform-managed accounts. Staff account data (username and similar) is separate from event data; its privacy treatment is not defined here.
- A-5: Messaging infrastructure is operated by the platform team within the same environments.
- A-6: GDPR is the only applicable regulation (Q-4). The pseudonymous id is treated as personal data (Q-19).
- A-7: Sample producers for O-1 are simulators built by this project (Q-10).
- A-8: v1 sends no email; credential resets use a one-time link shown to the admin (Q-27).

## 8. Dependencies

- D-1: HG-1 approval by the Product Owner. No open questions remain.
- D-2: Phase 4 ADRs: messaging technology, event store, contract format, where PII is stripped, pseudonymisation and device-hash key handling, authentication and account storage, breached-password list source.
- D-3: Charter amendment through HG-C (Q-19), handled separately.
- D-4: Simulator producer applications to be built (Q-10).

## 9. Risks

| ID   | Risk                                                                                                           | Impact | Mitigation direction (not a design decision)                    |
| :--- | :------------------------------------------------------------------------------------------------------------- | :----- | :-------------------------------------------------------------- |
| R-1  | Pseudonymous ids and hashed device ids remain personal data; key compromise or reversal re-identifies subjects | High   | Key handling decided at Phase 4; Security Lead review at HG-3   |
| R-2  | Raw PII exists transiently in client buffers, messaging layer and dead-letter messages (accepted by PO)        | Medium | 7-day dead-letter limit (REQ-16); NFR-17 scans                  |
| R-3  | No rate limit invites a noisy producer to degrade others                                                       | Medium | Fairness and isolation to be assessed in Phase 4 (REQ-2, REQ-8) |
| R-4  | Admin screen is a high-privilege surface (accounts, credentials, entitlements, deletion)                       | High   | Admin-only access, audit, tests (US-9, US-16, US-17, AC-9.3)    |
| R-5  | Single human holds all roles, so weak independent review                                                       | Medium | Compensating controls in role register                          |
| R-6  | Event contract lock-in: breaking changes hurt all producers and three kit languages                            | Medium | Versioning rules in US-3                                        |
| R-7  | Dropping oldest events on kit buffer overflow loses data by design                                             | Low    | Accepted by PO (Q-13); dropped-event counter in AC-4.3          |
| R-8  | Admin screen reverses the earlier "files only" answer, so scope and effort grow                                | Medium | Recorded as a scope change; PO reviews at HG-1                  |
| R-9  | One-time reset link shown to the admin is a sensitive secret handled by a human                                | Medium | Single use (AC-16.2); never logged (AC-16.3)                    |
| R-10 | A leaked rotated credential stays valid for up to 24 hours during overlap                                      | Medium | Admin can revoke within 60 s (AC-17.4)                          |

## 10. Out of scope (v1)

- Any HTTP ingestion API (explicit in the business goal).
- Production hosting, production availability targets (Deferred, PO, 2026-10-21) and data residency (Deferred, PO, 2026-10-21).
- Billing, external customers, third-party data sharing.
- Alerting, funnels, cohorts, custom report builder, and data export from the dashboard (confirmed out of scope, Q-11). GDPR subject access export (REQ-18) is in scope.
- Per-user views in the dashboard (Q-25).
- Email sending of any kind in v1 (Q-27).
- Recording or processing of user consent (Q-5).
- Mobile or native dashboard clients; A/B testing; real-time (sub-second) streaming dashboards.
- Naming of specific real applications as sample producers (Deferred, PO, 2026-10-21; Q-10b).

## 11. Questions

### 11.1 Answered by the Product Owner

| #     | Answer recorded                                                                                                                                                                                                                           |
| :---- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1   | Accepted: 5,000 events/s sustained, 20,000 burst, >= 20 producers, >= 10 tenants, 64 KB max event.                                                                                                                                        |
| Q-2   | Accepted: freshness p95 10 s; dashboard p95 2 s on 30 days / 10M events.                                                                                                                                                                  |
| Q-3   | Accepted for v1 staging-like: 99.5%, RPO 5 min, RTO 4 h, 15 min outage tolerance.                                                                                                                                                         |
| Q-4   | GDPR; 13-month default retention, 35-day backup purge, DSAR internal target 10 days within GDPR deadline.                                                                                                                                 |
| Q-5   | Consent is not recorded. PII is always stripped. The user id is kept as an identifier via the pseudonymous id (Q-12a/Q-18).                                                                                                               |
| Q-6   | Audit log retained 12 months. Q-6b: admin only can read.                                                                                                                                                                                  |
| Q-7   | Client kit supports TypeScript, Node.js, Python. Q-7b: 60-minute onboarding target confirmed.                                                                                                                                             |
| Q-8   | Platform-managed accounts; roles "user" and "admin" only.                                                                                                                                                                                 |
| Q-9   | Original answer: tenants and entitlements by files, no admin UI. **Reversed** by Q-20 and Q-21 (below).                                                                                                                                   |
| Q-10  | Sample producers are simulators built by this project.                                                                                                                                                                                    |
| Q-11  | Alerting, funnels, cohorts, custom reports and export are out of scope.                                                                                                                                                                   |
| Q-12  | 13-month maximum query range accepted.                                                                                                                                                                                                    |
| Q-12a | Unique users are counted by the pseudonymous id: a stable per-tenant keyed hash of the producer's user id.                                                                                                                                |
| Q-13  | Client kit drops the oldest events when its buffer is full.                                                                                                                                                                               |
| Q-14  | 6-month contract deprecation period and 30-minute idle session timeout.                                                                                                                                                                   |
| Q-15  | Risk Tier 3 confirmed; formal confirmation remains at HG-4.                                                                                                                                                                               |
| Q-16  | Stripping at point of intake, before anything is stored. Transient raw PII allowed in client buffer, in transit and in dead-letter messages; dead-letter stripped or expired within 7 days.                                               |
| Q-17  | PII fields: email, name, phone, raw IP, precise location, raw device id. Free-form properties filtered by an allow-list of keys; unlisted keys dropped.                                                                                   |
| Q-18  | DSAR access and deletion work by the pseudonymous id (same approach as Q-12a).                                                                                                                                                            |
| Q-19  | Accepted: charter amended through HG-C in a separate PR (orchestrator). Tier 3 kept.                                                                                                                                                      |
| Q-20  | Admin screen for accounts (create, reset, disable) instead of files.                                                                                                                                                                      |
| Q-21  | Admin screen for tenants, entitlements, health, dead-letter handling and GDPR runs instead of files.                                                                                                                                      |
| Q-22  | Audit evidence for any file/config change: the Git commit or PR plus an audit entry written when the service loads the change. Now applies only to deployment configuration.                                                              |
| Q-23  | All listed proposals confirmed: 50 ms p99 publish overhead; lockout after 5 failures in 15 min; entitlement change in 60 s; health refresh 30 s; purge job daily with removal within 24 h; audit write within 5 s.                        |
| Q-25  | "Counts + GDPR only": the pseudonymous id is used only for unique-user counts and for admin-run GDPR access/deletion. The dashboard shows aggregates only; the raw user id is never shown.                                                |
| Q-26  | "Country + hashed device": keep country (derived from IP), browser/OS family and a per-tenant hashed device id. Drop raw IP, truncated IP and precise location.                                                                           |
| Q-27  | "Seed command + policy": first admin created by a one-time setup command; passwords at least 12 characters and checked against a breached-password list; admin-triggered reset issues a one-time link shown to the admin; no email in v1. |
| Q-28  | The admin screen also manages producer credentials (create, rotate, revoke, and publish permissions) and per-tenant retention (default 13 months). Only deployment configuration remains file-based.                                      |
| Q-29  | The admin screen includes an audit log viewer: admins read and filter it.                                                                                                                                                                 |
| Q-30  | "60s; 24h overlap on rotate": a revoked credential stops being accepted within 60 seconds. On rotation, old and new credentials are both accepted for up to 24 hours so producers can redeploy; the old one then stops being accepted.    |

### 11.2 Deferred by the Product Owner (not open)

| #     | Item                                                                                             | Status                    |
| :---- | :----------------------------------------------------------------------------------------------- | :------------------------ |
| Q-3b  | Production availability, RPO and RTO targets                                                     | Deferred (PO, 2026-10-21) |
| Q-10b | Names of specific real applications as sample producers (v1 uses simulators)                     | Deferred (PO, 2026-10-21) |
| Q-24  | Data residency: no requirement for v1 (local Docker); revisit when production hosting is decided | Deferred (PO, 2026-10-21) |

### 11.3 Open questions

None. All questions are answered (11.1) or deferred by the PO (11.2).

## 12. Contradictions and consequences

Resolved by PO answers:

- C-1 (always strip PII vs charter "events include PII"): resolved by Q-19. Charter amended via HG-C separately; Tier 3 kept.
- C-2 (DSAR with no identifier stored): resolved by Q-18; DSAR works by pseudonymous id. AC-11.4 covers a no-match result.
- C-3 (unique-user counts with no raw id): resolved by Q-12a; counts use pseudonymous id.
- C-4 (transient raw PII boundary): resolved by Q-16; intake is the boundary; dead-letter limited to 7 days.
- C-5 ("admin files only" vs audit and admin functions): resolved by Q-20/Q-21/Q-28/Q-29 (admin screen) and Q-22 (audit rule for deployment configuration only).
- C-6 (residency value never proposed): resolved by deferral (Q-24).
- C-7 (scope of "maintain user ID"): resolved by Q-25; aggregates only.
- C-8 (coarse IP/device derivatives): resolved by Q-26.

Remaining: no unresolved contradictions. Scope reversal Q-9 to admin screen is recorded (R-8).

## 13. Traceability summary (REQ to US)

| REQ                 | US                                        |
| :------------------ | :---------------------------------------- |
| REQ-1, REQ-2, REQ-4 | US-1                                      |
| REQ-3               | US-3, US-13 (AC-13.2, 13.3)               |
| REQ-5               | US-2, US-9                                |
| REQ-6, REQ-7        | US-15                                     |
| REQ-8               | US-4                                      |
| REQ-9               | US-7, US-9                                |
| REQ-10, REQ-11      | US-5                                      |
| REQ-12              | US-6                                      |
| REQ-13              | US-7, US-8, US-16                         |
| REQ-14              | US-2, US-9, US-12, US-14 (AC-14.4), US-17 |
| REQ-15              | US-10                                     |
| REQ-16, REQ-19      | US-13, US-10 (AC-10.3)                    |
| REQ-17              | US-12                                     |
| REQ-18              | US-11                                     |
| REQ-20              | US-9, US-11, US-14                        |
| REQ-21              | US-13 (AC-13.1)                           |
| REQ-22              | NFR-6, A-2 (environment; no user story)   |
| REQ-23              | US-13 (AC-13.4), US-11                    |
| REQ-24              | US-16                                     |
| REQ-25              | US-5 (AC-5.4)                             |

UI-facing stories for Phase 3 (UX spec, after HG-1): US-5, US-6, US-7, US-8, US-9, US-10, US-11, US-12, US-14, US-16, US-17. Not UI-facing: US-1, US-2 (docs and kit), US-3, US-4, US-13, US-15. Note AC-16.5 (setup command) is command-line, not a screen, and will be listed as a coverage gap in the UX spec.
