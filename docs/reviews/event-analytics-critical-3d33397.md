count: 47

# Critical Review — event-analytics (PRD) — round 3
Reviewed SHA: 3d33397   Base: d87700d   Date (UTC): 2026-10-21   Reviewer: critical-reviewer (Claude Opus 5.5, claude-opus-5-5)
Inputs: PRD docs/requirements/event-analytics.md@3d33397 (revision 9, covering revisions 7, 8 and 9), prior findings reports/review/event-analytics-critical-d87700d.json and docs/reviews/event-analytics-critical-d87700d.md, pending charter amendment docs/project-charter.md@1afb371, role register docs/governance/role-register.md@3d33397 and @origin/chore/role-register-d5 (ad9e5b3), .sdlc/state/event-analytics.json@3d33397. No ADR, OpenAPI, CI run or scans (requirements-only phase).

## Verdict
PASS WITH NON-BLOCKING FINDINGS

Both blocking findings from round 2 (CR-024, CR-025) and the open Medium/Low findings CR-012, CR-026 to CR-028 and CR-030 to CR-033 are verified-fixed at 3d33397. Nothing Critical or High is open. CR-029 is still open (Medium) on the step-up part. CR-023 is fix-proposed (PR #2 not merged). There are 14 new findings: 8 Medium and 6 Low. Four of the Mediums are internal contradictions or gaps that the rework itself introduced: CR-034, CR-035, CR-037 and CR-040. I recommend fixing those before HG-1 approval, because Phase 4 cannot design against a contradiction. CR-038 and CR-039 need a DPO position (D-5). This review is not legal advice and not a compliance assessment.

## Prior findings re-verified
| ID | Previous status | Result on this SHA | Evidence |
| :-- | :-- | :-- | :-- |
| CR-001 to CR-011, CR-013 to CR-022 | verified-fixed | verified-fixed (no regression) | Re-read at 3d33397; lines updated in JSON (e.g. REQ-18 l.50, REQ-30 l.62, AC-11.2 l.172, AC-12.4 l.187, REQ-27 l.59) |
| CR-012 | open | verified-fixed | REQ-15 l.47 masks all values; AC-10.4 l.163 and AC-10.6 l.165 cover unlisted keys and unparseable bodies; REQ-20 l.52 |
| CR-023 | open | fix-proposed (still open in effect) | State file l.14-16 still has only the "PR #1 comment" record. Role register on 3d33397 has D-1 to D-4 only. origin/chore/role-register-d5 (ad9e5b3) l.33 adds D-5, but PR #2 is not merged and the confirmation is cited as "in the orchestrator session". I did not check the PR comment or the ruleset (gh not used). |
| CR-024 | open (High) | verified-fixed | REQ-18 l.50 (pairs, coverage), REQ-23 l.55, AC-11.1 l.171, AC-11.6 l.176, AC-7.2 l.131, D-8 l.316, A-9 l.305 |
| CR-025 | open (High) | verified-fixed | REQ-33 l.65, US-18 l.258-263, REQ-18 manual process l.50, D-5 LIA l.313, Q-38 l.408 |
| CR-026 | open | verified-fixed | REQ-30 l.62 content, retention and access; REQ-7 l.39; AC-11.5 l.175; AC-11.8 l.178; AC-13.1 l.194. Residual raised as CR-034 |
| CR-027 | open | verified-fixed | REQ-18 l.50 per-store bounds; AC-11.2 l.172; AC-11.7 l.177. Residual raised as CR-035 |
| CR-028 | open | verified-fixed | REQ-26 l.58; AC-14.6 l.214; NFR-25 l.293. Residual raised as CR-044 |
| CR-029 | open | still-open (partly fixed) | AC-8.6 to AC-8.8 l.142-144 fix sign-in. Step-up failures are still unbounded because AC-8.3 l.139 exempts established sessions from lockout |
| CR-030 | open | verified-fixed | The 11 actions in REQ-27 l.59 and AC-8.5 l.141 are identical item for item. Residual raised as CR-037 |
| CR-031 | open | verified-fixed | REQ-29 l.61; AC-5.1 l.111; AC-5.6 l.116; AC-5.7 l.117; R-14 l.335 and Q-46 l.439 accept the residual risk |
| CR-032 | open | verified-fixed | REQ-16 l.48 purpose (Q-47); AC-13.1 l.194; R-2 l.323; AC-13.10 l.203. Residual raised as CR-043 |
| CR-033 | open | verified-fixed | REQ-5 l.37; AC-9.4 l.153; AC-9.5 l.154; NFR-23 l.291 |

## New findings
| ID | Severity | Category | Location | Title | Blocking |
| :-- | :-- | :-- | :-- | :-- | :-- |
| CR-034 | Medium | requirements/contradiction | PRD l.39,62,172,175,226 | Deletion ledger readable only by the purge process, yet intake and replay must check it | No |
| CR-035 | Medium | privacy/gdpr-erasure | PRD l.47,163,165,172,177 | Erased subjects' dead-letter bodies remain revealable; AC-11.7 contradicts AC-10.6 | No |
| CR-036 | Medium | security/availability | PRD l.52,59,144,278 | Global sign-in throttle lets an attacker lock out all staff | No |
| CR-037 | Medium | security/authorization | PRD l.59,141,241,325 | Step-up list declared exact omits MFA reset | No |
| CR-038 | Medium | privacy/legal-basis | PRD l.65,258,313 | Objection leaves stored data in processing; Art. 17(1)(c) not addressed | No |
| CR-039 | Medium | privacy/gdpr-dsar | PRD l.50,52,212,263 | Manual rectification and restriction need unaudited direct store changes | No |
| CR-040 | Medium | privacy/data-integrity | PRD l.62,65,104,187,259,275 | Restore can lose ledger and suppression entries within the 5-minute RPO | No |
| CR-041 | Medium | requirements/consistency | docs/project-charter.md@1afb371 l.62-68 | Pending HG-C amendment understates raw-PII retention in the messaging layer | No |
| CR-042 | Low | requirements/validation | PRD l.35,60,222 | Future-timestamp bound relative to producer-controlled send time | No |
| CR-043 | Low | privacy/minimisation | PRD l.39,48,52,199,440 | Re-processing capability that justifies 24 h raw-PII retention is unspecified | No |
| CR-044 | Low | requirements/testability | PRD l.214,293 | AC-14.6 count of 10 records is off by one | No |
| CR-045 | Low | requirements/ambiguity | PRD l.50,171,262,316,326,336 | Verification-reference coverage is self-attested | No |
| CR-046 | Low | security/resource-exhaustion | PRD l.38,223,227 | Dead-letter bounds count messages, not bytes | No |
| CR-047 | Low | governance/evidence | .sdlc/state/event-analytics.json l.10,15,25 | Gate state binds HG-1 to revision 5 (59d8755) | No |

## Details
Full evidence, rationale, fix and verification for every finding are in the JSON above. Key points:

- **CR-034:** The CR-026 fix made the ledger readable only by the purge process. The CR-027 fix requires a ledger check at intake and replay. AC-11.2 deletes dedup entries, so the ledger is the only thing that stops an erased event being stored again on redelivery. The PRD also does not say whether the check matches erased event ids or the subject hash. Matching on the subject hash would turn every erasure into a 70-day objection.
- **CR-035:** AC-11.7 says no unparseable body "is displayed or replayable", but AC-10.6 allows an audited reveal. Separately, an erased subject's parseable dead-letter messages can still be opened and revealed for up to 7 days after erasure.
- **CR-036:** Spreading failures across 11 or more sources stays under the per-source limit but triggers the global limit of 10 sign-ins per minute. The attacker then competes with every legitimate user. The AC-8.8 clause that a legitimate admin can still sign in cannot be tested. "Source" is undefined (office NAT), and throttle engagement is neither audited nor alerted.
- **CR-037:** REQ-27 says "exactly these actions", yet requires step-up for MFA reset in the same requirement and in AC-16.9. MFA reset is not one of the 11 actions listed.
- **CR-038:** On an Art. 21 objection, stored data is explicitly left unchanged (AC-18.1). The DPO must decide between erasure on objection and recorded compelling grounds.
- **CR-039:** Restriction has no mechanism. An operator with deployment access edits stores directly, and nothing in REQ-20 audits that.
- **CR-040:** No RPO or separate durability is stated for the ledger, suppression list and audit log. A restore can silently undo a recent erasure or objection.
- **CR-041:** The amendment at 1afb371 says "never persisted" and "at most 24 h after stripping". PRD revision 9 allows 24 h after acknowledgement and 7 days if never acknowledged. This concerns the pending amendment only; the main-branch mismatch is not raised, as instructed.
- **CR-042:** This is a side effect of the round 2 suggestion to measure future skew against the kit's send time. Nothing bounds the send time itself against ingest time.

Comments on risk-accepted items (not raised): R-14/Q-46 accepts cross-query differencing, which I respect. Note that AC-6.2 shows a percentage change for the previous period. When one period's cell is suppressed and the other is shown, the percentage change gives the suppressed value directly, in the same view. Q-46 lists "previous-period comparison" as accepted, so I have not raised it. The PO may want to confirm that the acceptance was meant to cover direct calculation and not only inference. Q-41 keeps suppression-list entries until they are removed, with no retention review. That is a confirmed PO decision; it is noted, not raised.

Notes on method:
- Fingerprints for new findings are sha1("category|file|lowercased title"), as instructed. Round 2 also stripped punctuation, so the convention differs slightly. Prior fingerprints are unchanged.
- `blocking` follows severity, as in earlier rounds. Only Critical or High findings with status open block.
- For the 21 findings that were already verified-fixed, the evidence field is prefixed with a round 3 no-regression note and line numbers are updated to 3d33397. Their original rationale and fix text are kept as history.
- The JSON was built by a script from the d87700d file and checked with JSON.parse: 47 entries, unique ids and fingerprints, all schema-required fields present.

## Coverage statement
**Reviewed:**
- The whole PRD at 3d33397, l.1-512: REQ-1 to REQ-33, US-1 to US-18, NFR-1 to NFR-25, Sections 7 to 13, and Section 11.1 rounds 4 to 7.
- All 33 prior findings, with the open ones re-verified in detail.
- The pending charter amendment at 1afb371, Section 6.
- The role register at 3d33397 and on origin/chore/role-register-d5 (ad9e5b3), for CR-023.
- .sdlc/state/event-analytics.json at 3d33397 and its git history.
- The diff file list d87700d..3d33397.

**Not reviewed:**
- The PR #1 and PR #2 comments and branch-protection ruleset 25569090 (gh not used), so the human-confirmation evidence for CR-023 is unverified.
- .sdlc/findings/event-analytics.json: statuses listed but not reconciled field by field.
- The rest of the charter amendment beyond Section 6.
- CLAUDE.md.
- Any code, ADR or OpenAPI (none exist in this phase).

**Security scanning:** gitleaks, semgrep and trivy are not installed, so none was run. npm audit does not apply (no package manifest in the diff). I ran a regex check for secrets over the d87700d..3d33397 diff, which contains documentation and JSON only; it found nothing.

This is a requirements review. It is not a penetration test, a DPIA, or a GDPR compliance or legal assessment. CR-038, CR-039 and REQ-31/D-5 need a DPO or legal decision.

**Files:**
- Built findings, pretty-printed: C:\Users\alext\AppData\Local\Temp\claude\c--Users-alext-Innovation-Incubator-Projects-Analyst-App-POC-Analyst-App-POC\45a35388-675f-4780-98a1-e5a3099c664a\scratchpad\findings-3d33397.json
- Built findings, compact (identical to the block above): C:\Users\alext\AppData\Local\Temp\claude\c--Users-alext-Innovation-Incubator-Projects-Analyst-App-POC-Analyst-App-POC\45a35388-675f-4780-98a1-e5a3099c664a\scratchpad\findings-3d33397.compact.json
- Build script: C:\Users\alext\AppData\Local\Temp\claude\c--Users-alext-Innovation-Incubator-Projects-Analyst-App-POC-Analyst-App-POC\45a35388-675f-4780-98a1-e5a3099c664a\scratchpad\build.js
