<!-- Saved verbatim from critical-reviewer round 4 output (bound to cf5c048). Findings JSON regenerated from the reviewer script; sha256 ca803cdf8f821556d8c9dc56422e6f6b854512b61750586844ab9cf1c7a97737 -->

(3) REPORT: Critical review round 4 (final) of the event-analytics PRD at cf5c048

Verdict: PASS WITH NON-BLOCKING FINDINGS. Nothing open is Critical or High. Under Section 9.4, the open Medium findings (CR-029, CR-036, CR-048) must be fixed before release, or tracked with an owner and a due date. This is the last review round for this phase, so the Product Owner must record that owner and due date, or a decision, at HG-1. None of these findings blocks HG-1.

Re-verification of the six reworked findings (all verified-fixed)

| ID | Result | Evidence (cf5c048) |
| :-- | :-- | :-- |
| CR-034 | verified-fixed | REQ-30 (l.62) and AC-11.5 (l.177) name the same readers (intake and replay checks) and the same single writer. The checks match erased (tenant, event id) values only. AC-11.9 (l.181) tests both cases. Leftover note, not raised as a finding: "purge process" is never defined, but AC-11.2 has the admin-run erasure writing to the ledger. The design must treat the erasure as part of the purge process. |
| CR-035 | verified-fixed | REQ-15 (l.47), AC-10.6 (l.167) and AC-11.7 (l.179) now agree that unparseable bodies are never revealable. AC-11.2 (l.174) deletes the erased subject's parseable dead-letter messages immediately, and AC-11.10 (l.182) tests this. |
| CR-037 | verified-fixed | REQ-27 (l.59) and AC-8.5 (l.143) carry the same list of 16 actions, now described as a minimum. MFA reset is included. R-4 (l.344) says "at least 16". |
| CR-038 | verified-fixed | Recording an objection now also runs the erasure, in the same flow (REQ-33 l.65, AC-18.1 l.263). AC-18.7 (l.269) records the outcome for each store and allows a re-run. This review is not legal advice; D-5 sign-off still applies. |
| CR-039 | verified-fixed | Restriction is now a product feature (REQ-34 l.66, US-19 l.275-281). Rectification is stated as not applicable, pending the DPO (D-5 l.332). Manual changes run as audited scripts (AC-14.7 l.219), which are listed in REQ-20 (l.52). Remaining gaps are raised as CR-048 and CR-051. |
| CR-040 | verified-fixed | NFR-26 (l.312) sets RPO 0 for the privacy-control stores. NFR-7 (l.293) now applies to the event store only. AC-4.6 (l.107) and AC-19.7 (l.281) test the restore. A remaining test gap is raised as CR-049. |

Findings that were not reworked

| ID | Status | Basis |
| :-- | :-- | :-- |
| CR-023 | fix-proposed (carried forward) | The role register has no D-5 entry on origin/main (head d808267). PR #2 is not merged. |
| CR-041 | verified-fixed | On the HG-C branch (7465f52), charter l.64-68 now matches REQ-16 and R-2. That commit is not on main yet; PR #4 is still awaiting decision. |
| CR-047 | verified-fixed | At cf5c048 the state file binds HG-1 to revision 9 (3d33397), so the old binding to revision 5 is gone. ORCHESTRATOR ACTION: re-bind HG-1 and artifacts.prd to revision 11 (cf5c048) in this round's review commit. |
| CR-029 | open | The rework touched AC-8.3 (l.141), but only to add step-up for account unlock. The "never applies to an established session" clause is unchanged, and no AC tests failed step-up attempts. |
| CR-036 | open | AC-8.8 (l.146) is unchanged apart from whitespace. |
| CR-042, CR-044, CR-046 | open | REQ-28, AC-15.3, AC-14.6, NFR-25, REQ-6, AC-15.4 and AC-15.8 are unchanged apart from whitespace. |
| CR-043 | open | REQ-20 was extended, but re-processing is still not listed or specified. |
| CR-045 | open | Unchanged. The new AC-19.6 (l.280) repeats the same self-attested check for restriction. |

The other 29 findings that were already verified-fixed show no regression in the delta. Q-46/R-14 was not re-raised.

New findings

| ID | Sev | Title | Key evidence |
| :-- | :-- | :-- | :-- |
| CR-048 | Medium | Restriction list has no erasure, retention-purge or subject-access semantics | Erasure scope (REQ-18 l.50, AC-11.2 l.174) leaves out the restriction list, so entries for erased subjects stay forever with no stated purpose. Retention purge (AC-12.1 l.188) destroys restricted data, although Art. 18(1)(b) and (c) restriction exists to keep it. It is not stated whether an access export (AC-11.1 l.173) includes restricted events. |
| CR-049 | Low | RPO 0 tested only against event-store failure; the 5 s audit write contradicts RPO 0 | AC-4.6 and AC-19.7 do not fail the store that holds the privacy-control lists, and no AC covers a joint failure. AC-14.1 (l.213) allows a 5-second audit write delay. |
| CR-050 | Low | Step-up minimum omits account disable, credential revocation and dead-letter replay or discard | AC-16.6 (l.243) only protects the last admin. A hijacked session can disable every other admin without step-up. |
| CR-051 | Low | Reviewed-script control is self-review under R-5, and its no-direct-edit clause cannot be tested | AC-14.7 (l.219), R-5 (l.345), AC-16.7 (l.244). |

New contradictions or regressions: none found. C-15 to C-19 (l.509-513) agree with the requirement text. The traceability rows for REQ-30, REQ-33, REQ-34 and NFR-26 are present (l.546-552).

Coverage statement
- Reviewed:
  - The full PRD at cf5c048 (554 lines), compared with 3d33397. Rows with only whitespace changes were found with a normalised comparison.
  - Section 11.1, rounds 8 and 9 (l.462-477).
  - All 47 prior findings.
  - The HG-C branch charter at 7465f52, lines 58-74.
  - .sdlc/state/event-analytics.json at cf5c048.
  - The role register on origin/main and at cf5c048.
- Not reviewed:
  - .sdlc/findings/event-analytics.json.
  - Everything in the guide outside Sections 9.4 to 9.6.
  - The PR comments and rulesets for CR-023 (gh was not used).
  - The merits of the PO risk acceptances.
- Scanners: none were run (gitleaks, semgrep, npm audit, trivy). This is a requirements review with no code in scope.

This review is not a penetration test, a compliance assessment or legal advice. The GDPR points in CR-038 and CR-048 need DPO or legal confirmation under D-5.

Files:
- C:\Users\alext\Innovation Incubator\Projects\Analyst-App-POC\Analyst-App-POC\docs\requirements\event-analytics.md (reviewed at cf5c048)
- C:\Users\alext\Innovation Incubator\Projects\Analyst-App-POC\Analyst-App-POC\reports\review\event-analytics-critical-3d33397.json (the script's input)
- Script copy: C:\Users\alext\AppData\Local\Temp\claude\c--Users-alext-Innovation-Incubator-Projects-Analyst-App-POC-Analyst-App-POC\45a35388-675f-4780-98a1-e5a3099c664a\scratchpad\r4build.js
- Output copy: C:\Users\alext\AppData\Local\Temp\claude\c--Users-alext-Innovation-Incubator-Projects-Analyst-App-POC-Analyst-App-POC\45a35388-675f-4780-98a1-e5a3099c664a\scratchpad\r4out.json
