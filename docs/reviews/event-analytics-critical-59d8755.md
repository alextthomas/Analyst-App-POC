# Critical Review — event-analytics (PRD) — round 1

Reviewed SHA: 59d8755 Base: d808267 Date (UTC): 2026-10-21 Reviewer: critical-reviewer, claude-opus-5-5
Inputs: PRD docs/requirements/event-analytics.md@59d8755, charter docs/project-charter.md@59d8755, CLAUDE.md@59d8755, docs/governance/role-register.md@59d8755, guide Sections 7.4 (Phase 2), 9.4 and 9.6, .claude/skills/review-findings/schema.json. There is no CI run or ADR (Phase 2).

Findings JSON: `reports/review/event-analytics-critical-59d8755.json`

## Verdict

BLOCKED (5 High, 13 Medium, 5 Low). Phase 2 has no merge to block, so in practice the PO should not approve HG-1 until the Highs are resolved or explicitly accepted.

## Prior findings re-verified

None. This is round 1 (`review_rounds: 0`).

## New findings

| ID                     | Severity | Category                   | Title                                                                    | Blocking |
| ---------------------- | -------- | -------------------------- | ------------------------------------------------------------------------ | -------- |
| CR-event-analytics-001 | High     | privacy/gdpr-erasure       | Erasure scope excludes backups, dead-letter, messaging layer and restore | yes      |
| CR-event-analytics-002 | High     | privacy/minimisation       | Messaging layer persists raw PII without limit, contradicting REQ-16     | yes      |
| CR-event-analytics-003 | High     | security/authentication    | Unauthorised and revoked publishers accepted into the dead-letter store  | yes      |
| CR-event-analytics-004 | High     | privacy/legal-basis        | Lawful basis, ePrivacy, DPIA and transparency not stated                 | yes      |
| CR-event-analytics-005 | High     | security/authentication    | Admin role protected by password only                                    | yes      |
| CR-event-analytics-006 | Medium   | requirements/contradiction | No-loss durability contradicts RPO 5 min                                 | no       |
| CR-event-analytics-007 | Medium   | requirements/ambiguity     | Dedup scope and window undefined                                         | no       |
| CR-event-analytics-008 | Medium   | requirements/ambiguity     | Event time, time zone and late-arrival semantics undefined               | no       |
| CR-event-analytics-009 | Medium   | requirements/testability   | Unmeasurable or disjunctive ACs                                          | no       |
| CR-event-analytics-010 | Medium   | privacy/minimisation       | Hashed device id has no purpose and is outside DSAR                      | no       |
| CR-event-analytics-011 | Medium   | privacy/minimisation       | PII in allow-listed values and raw UA; allow-list owner vs REQ-5         | no       |
| CR-event-analytics-012 | Medium   | security/audit             | Dead-letter inspection exposes raw PII; audit list incomplete            | no       |
| CR-event-analytics-013 | Medium   | privacy/gdpr-dsar          | DSAR export handling, verification and rights coverage undefined         | no       |
| CR-event-analytics-014 | Medium   | security/account-lifecycle | Last-admin recovery, reset-link TTL, role change                         | no       |
| CR-event-analytics-015 | Medium   | privacy/re-identification  | No minimum group size for aggregates                                     | no       |
| CR-event-analytics-016 | Medium   | requirements/ambiguity     | Revocation checked at publish or consume time                            | no       |
| CR-event-analytics-017 | Medium   | requirements/validation    | Retention unit and bounds                                                | no       |
| CR-event-analytics-018 | Medium   | requirements/missing-nfr   | No fairness or oversize/poison event requirement                         | no       |
| CR-event-analytics-021 | Medium   | privacy/staff-data         | Staff personal data treatment undefined                                  | no       |
| CR-event-analytics-019 | Low      | requirements/traceability  | REQ and NFRs without ACs; alerting scope ambiguity                       | no       |
| CR-event-analytics-020 | Low      | requirements/testability   | AC-1.2 status codes overconstrained                                      | no       |
| CR-event-analytics-022 | Low      | requirements/testability   | Mutation threshold and onboarding trial not measurable                   | no       |
| CR-event-analytics-023 | Low      | governance/evidence        | HG-0 flipped to approved in PRD commit without in-repo evidence          | no       |

## Details

Each finding's evidence, rationale, fix and verification are in the JSON above. The cross-cutting theme is that "transient" raw PII (broker, dead-letter, client buffer) is in practice durable storage. That one gap drives CR-001, CR-002, CR-003, CR-006 and CR-012.

## Coverage statement

**Reviewed:**

- All 377 lines of the PRD at 59d8755, every REQ, US, AC, NFR, A, D, R, Q and C item. I checked ID sequences: no duplicates or gaps in REQ, US, AC or NFR, and the stated counts match. I also checked the traceability table.
- The charter, CLAUDE.md, the role register, and the `.sdlc/state` diff in the same commit.
- Guide Sections 7.4 (Phase 2), 9.4 and 9.6.

**Not reviewed:**

- The rest of the guide and the `.claude/agents` and skills content beyond the review and security skills.
- Whether the PR #1 comment exists. I did not use `gh`, so CR-023 is unconfirmed.
- I did not raise the known charter PII mismatch (C-1/Q-19, HG-C pending) as a finding.

**Security scans:** none ran. `gitleaks`, `semgrep` and `trivy` are not installed, and there is no `package.json` for `npm audit`. The commit is documentation only.

**Legal caveat:** this is a requirements review, not a penetration test, GDPR/ePrivacy compliance assessment or DPIA. CR-004 in particular needs qualified legal/DPO review.
