# UX Specification: Event Analytics Platform (feature id: event-analytics)

Status: DRAFT (revision 3: prototype gap analysis G-1 to G-18 applied, 2026-10-29; revision 2 applied PO/UX Lead answers to UX-Q-1 to UX-Q-30, round 1), submitted for HG-2 review | Author: @alextthomasagent | Date: 2026-10-29
Approval: not approved (this document is never self-approved; HG-2 is held by the Product Owner)
Source: approved PRD `docs/requirements/event-analytics.md` (revision 11, HG-1, content as of commit cf5c048), `docs/project-charter.md`, `CLAUDE.md`, `reports/ux/event-analytics-prototype-gaps.md` (G-1 to G-18). Proposed PRD revision 12 (HG-C-2, PR #6, not yet approved) is read for dependencies only; where this document depends on it, the text says "PRD rev 12 (proposed)". The change log of revision 3 is Section 10. Review findings referenced: `reports/review/event-analytics-critical-cf5c048.json` (the report writes ids as `CR-event-analytics-029`; this document writes CR-029).

Scope rules for this document:

- It specifies screens, flows, states, message text and accessibility behaviour. It does not decide visual design, layout, component library, chart type or technology.
- Questions the PRD left open were asked as UX-Q-n. The answers are in the decisions log (Section 7, written UX-D-n for the answer to UX-Q-n). Three questions remain open and are deferred to Phase 4 (Section 6.1). Revision 3 adds UX-Q-31 to UX-Q-63 (Section 6.2), raised from the prototype gap analysis; text that depends on one of them is marked "pending UX-Q-n" and is not a decision. Where a UX answer conflicts with or adds to a PRD requirement, the UX answer is kept here and the conflict is listed in Section 8 (HG-C candidates); it is not resolved here and no PRD file is modified.
- All on-screen message text below is **draft copy**, accepted as a draft; final copy is approved at HG-2; the product is English only (UX-D-1). The PRD requires a message in several places but does not give the words. Rules and numbers inside messages come from the PRD or from the decisions log.
- Tracked findings CR-029, CR-036 and CR-048 are not resolved here (UX-Q-3, UX-Q-5 and UX-Q-20 are deferred to Phase 4). Where a screen touches them it shows a "pending design" placeholder state.

## 1. Roles, navigation scope and conventions

| Role                       | Reaches                                                                                                                                                              | Source                 |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| Unauthenticated            | Sign-in (S-1) and set-password-by-link (S-19) only                                                                                                                   | AC-8.1                 |
| user (password only)       | Application list (S-4), Overview (S-5), Not found / access refused (S-18)                                                                                            | AC-8.2, AC-5.4, REQ-13 |
| admin (password plus TOTP) | Dashboard screens (S-4, S-5, S-18) and admin screens S-6 to S-17 after MFA; landing is Ingestion health (S-8); persistent side navigation in the admin area (UX-D-2) | AC-8.4, REQ-13         |

Conventions that apply to every screen unless a screen says otherwise:

- C-1 Times and dates are shown in UTC and labelled "UTC" (REQ-28, REQ-12).
- C-2 Admin screens are reachable only with a valid TOTP-verified admin session. A "user" opening one gets S-18 (AC-9.3).
- C-3 Actions on the REQ-27 / AC-8.5 list open step-up (S-3) when the last authentication is older than 5 minutes. The list is a minimum that design may extend, so this document marks the 16 listed actions only. S-3 is shown as a dialog over the blocked action; when the last authentication is 5 minutes or less old it is not shown at all (G-7). After step-up the interrupted action resumes with its input kept (UX-D-8). "Stay signed in" on the idle warning is not an authentication and does not renew the 5-minute step-up age (AC-8.5: the age is that of the last password and TOTP authentication) (G-6). The 16 actions, enumerated from the AC-8.5 text (G-8):

| #   | AC-8.5 / REQ-27 action                            | Screen and control                                            |
| :-- | :------------------------------------------------ | :------------------------------------------------------------ |
| 1   | DSAR export                                       | S-10 Run access; Download export                              |
| 2   | DSAR deletion                                     | S-10 Run erasure; Re-run erasure for failed stores            |
| 3   | Dead-letter inspection                            | S-9 Open                                                      |
| 4   | Reveal of a masked value                          | S-9 Reveal                                                    |
| 5   | Producer-credential creation                      | S-16 Create                                                   |
| 6   | Producer-credential rotation                      | S-16 Rotate                                                   |
| 7   | Admin account creation                            | S-15 Create account (role "admin")                            |
| 8   | Role change                                       | S-15 Change role                                              |
| 9   | Reset-link issue                                  | S-15 Reset credential                                         |
| 10  | Retention shortening                              | S-13 Save when data would be destroyed                        |
| 11  | Adding or removing an objection suppression entry | S-11 Record objection; Remove entry; Re-run erasure (AC-18.7) |
| 12  | MFA reset                                         | S-15 Reset MFA                                                |
| 13  | Entitlement grant                                 | S-7 Grant                                                     |
| 14  | Account unlock                                    | S-15 Unlock                                                   |
| 15  | Allow-list changes                                | S-14 Add key; Remove key                                      |
| 16  | Adding or removing a restriction-list entry       | S-12 Add; Remove                                              |

Not on the list, so no step-up from the PRD list: Replay and Discard (S-9, Discard has the C-7 confirmation), revoke an entitlement (S-7, AC-9.2 names grant only), revoke a credential (S-16), disable an account (S-15, C-7 confirmation), edit a tenant's privacy-notice URL (S-6). Create account with role "user" (S-15): whether it needs step-up is PRD rev 12 (proposed) Q-50, open; if the PO answers yes, "setup-link issue" joins this list and S-15, J-16 and PI-4 follow that answer. Order of validation, reason entry, step-up and confirmation: pending UX-Q-43 (the only fixed order is step-up then confirmation, AC-12.5). Further confirmations for irreversible actions: pending UX-Q-44.

- C-4 Raw user ids typed into admin forms are never echoed in a success message, audit view or screen after submission. User ids are visible only during entry; lists show only counts and a masked request reference (UX-D-17; AC-11.3, AC-18.3, AC-19.3).
- C-5 Passwords, TOTP codes, credential secrets and one-time links never appear in any screen after their single display (AC-16.3, AC-17.1, AC-16.2).
- C-6 Generic states used in every screen table:
  - Loading: a visible and announced busy indicator in place of the content; controls that depend on the data are disabled. On a write screen this applies to the table and to the form together: the form controls are disabled while either is loading (G-18).
  - Generic error (server or network failure): "Something went wrong. Your change was not saved. Try again. If the problem continues, contact a platform admin." (read-only screens: "Something went wrong. The data could not be loaded. Try again.") with a Retry action. No stack trace, no identifiers. What Retry does on a write action (re-submit, input kept, step-up again): pending UX-Q-62; on a read-only screen Retry repeats the failed read.
  - Idle warning (UX-D-6): 2 minutes before the 30-minute idle timeout (AC-8.2) a dialog states "Your session will end in 2 minutes because of inactivity." with the action "Stay signed in". Choosing it keeps the session. It is announced to assistive technology when it opens and focus moves to the action. How it behaves when a step-up, confirmation or one-time secret dialog is already open: pending UX-Q-42.
  - Session ended (idle 30 minutes, AC-8.2, or account disabled, AC-16.2): on every screen the user is taken to S-1, which shows the banner "Your session has ended. Sign in again." (C-6 as written; the per-screen "Session ended" rows in the screen tables mean this redirect and define no in-place variant) (G-6). Unsaved form input is not preserved (UX-D-6); this applies to session end only, while a live session keeps input across step-up (UX-D-8). A one-time secret or link on display when the session ends is lost and cannot be re-shown (C-5, UX-D-13). Signing out by choice also goes to S-1, with an empty form and without the banner, because the banner is for idle or disabled-account endings only.
  - Pending design: a placeholder notice "This behaviour is pending design." used only where a deferred question (UX-Q-3, UX-Q-5, UX-Q-20) applies. No other copy is defined for those states.
- C-7 Confirmation step (UX-D-13, UX-D-18). A confirmation dialog, in addition to step-up where step-up applies (order: step-up, then confirmation, as in AC-12.5), is required for the actions below. Buttons: "Confirm" and "Cancel"; Cancel changes nothing. "Revoke" in UX-D-18 is applied to producer credentials (S-16) and to user entitlements (S-7); this reading is recorded in Section 7.

| Action                                               | Draft confirmation text                                                                                                                                                                                                                                                                                                                                                                                               |
| :--------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discard dead-lettered events (S-9)                   | "Discard <n> events? This cannot be undone."                                                                                                                                                                                                                                                                                                                                                                          |
| Revoke a producer credential (S-16)                  | "Revoke this credential? Publishes with it are refused within 60 seconds."                                                                                                                                                                                                                                                                                                                                            |
| Revoke a user entitlement (S-7)                      | "Revoke access to <tenant> for <username>?"                                                                                                                                                                                                                                                                                                                                                                           |
| Disable an account (S-15)                            | "Disable account <username>? The account cannot sign in."                                                                                                                                                                                                                                                                                                                                                             |
| Remove a suppression-list entry (S-11)               | "Remove this entry from the suppression list? New events for the subject will be stored again."                                                                                                                                                                                                                                                                                                                       |
| Remove a restriction-list entry (S-12)               | "Remove this entry from the restriction list? The subject's events will be included in queries again."                                                                                                                                                                                                                                                                                                                |
| Reset an admin's authenticator (S-15)                | "Reset the authenticator for <username>? They must set it up again at next sign-in."                                                                                                                                                                                                                                                                                                                                  |
| Leave a one-time secret or link display (S-15, S-16) | "You cannot see this again. Make sure you have copied it. Leave now?" The confirmation is unconditional: it is shown whether or not Copy was used, because copying cannot be detected reliably (G-16; UX-D-13 and this row state no condition). Which exits count as leaving, and the visible "Done" control: pending UX-Q-58. The secret or link is never re-shown; a lost secret means issuing a new one (UX-D-13). |

## 2. Screen inventory

| ID   | Screen                                              | Roles          | Stories                                                     |
| :--- | :-------------------------------------------------- | :------------- | :---------------------------------------------------------- |
| S-1  | Sign-in                                             | all            | US-8                                                        |
| S-2  | Authenticator code (TOTP) challenge and enrolment   | admin          | US-8, US-16                                                 |
| S-3  | Step-up re-authentication                           | admin          | US-8, US-9, US-10, US-11, US-12, US-16, US-17, US-18, US-19 |
| S-4  | Application list                                    | user, admin    | US-7, US-8                                                  |
| S-5  | Application overview (filters, comparison)          | user, admin    | US-5, US-6, US-7                                            |
| S-6  | Admin: Tenants                                      | admin          | US-9                                                        |
| S-7  | Admin: User entitlements                            | admin          | US-9                                                        |
| S-8  | Admin: Ingestion health (admin landing)             | admin          | US-10                                                       |
| S-9  | Admin: Dead-letter events                           | admin          | US-10, US-11                                                |
| S-10 | Admin: Data-subject access and erasure              | admin          | US-11                                                       |
| S-11 | Admin: Objection (suppression list)                 | admin          | US-18                                                       |
| S-12 | Admin: Restriction list                             | admin          | US-19                                                       |
| S-13 | Admin: Tenant retention                             | admin          | US-12                                                       |
| S-14 | Admin: Tenant allow-listed property keys            | admin          | (US-13, AC-13.8)                                            |
| S-15 | Admin: Accounts                                     | admin          | US-16, US-8                                                 |
| S-16 | Admin: Producer credentials                         | admin          | US-17                                                       |
| S-17 | Admin: Audit log viewer                             | admin          | US-14                                                       |
| S-18 | Not found (shared refusal page)                     | user, any      | US-7, US-9, US-14                                           |
| S-19 | Set password via one-time link (and TOTP enrolment) | account holder | US-16                                                       |

S-14 is included because REQ-14 and AC-13.8 place allow-list management in the admin screen; US-13 is not in the UI-facing list, so it is shown for completeness and not counted in coverage.

## 3. Journeys (one per UI-facing story)

### J-5 (US-5): View the overview of an application

- Entry: S-4 after sign-in, selecting an entitled application.
- Steps: 1. Select application. 2. S-5 loads with the application selected in step 1 (a selection always wins); the other defaults are the last 7 days (definition pending UX-Q-32) and all event types (UX-D-7). The default application, the first alphabetically by application name (the tenant id, S-4), applies only when S-5 is opened with no application selected, for example by direct entry (UX-D-7 "defaults on first open"; G-2). 3. Total events, unique users, events-over-time and top 10 event types appear. 4. Suppressed cells show the suppressed marker and a statement that displayed cells may sum to less than the total.
- Exit: user changes filters (J-6), picks another application, or signs out.
- Error branches: no events in range, empty state (AC-5.3); query failure, generic error with Retry; range shorter than one whole UTC day, not selectable (AC-5.6; how the date control enforces it: pending UX-Q-33); session ended, S-1; application not entitled, S-18 (J-7).

### J-6 (US-6): Filter and compare

- Entry: S-5.
- Steps: 1. Choose application, start date, end date, event type. 2. Apply. 3. All figures reflect exactly the filter; active filters are listed and each can be cleared, plus "Clear all" (what clearing means for filters that always have a value: pending UX-Q-36). 4. Turn on "Compare with previous period" (the same length immediately before the range, UX-D-9; whether the toggle acts at once or after Apply: pending UX-Q-37). 5. Both periods and percentage change are shown.
- Exit: filters cleared or user leaves.
- Error branches: end before start, or range longer than 13 months (unit: pending UX-Q-34), validation message, query not run (AC-6.2); a start and end on the same day is valid (VM-7 refuses only an end before the start); a previous period that begins before the data retention horizon: pending UX-Q-35; percent change from a zero previous value shows "n/a" (UX-D-9); a suppressed compared cell shows "—" with an explanatory tooltip (UX-D-10); query failure, generic error.

### J-7 (US-7): See only entitled applications

- Entry: S-4 or a direct URL or API call for another tenant.
- Steps: 1. S-4 lists only entitled applications. 2. Selecting one opens S-5.
- Exit: S-5, or S-4 empty state.
- Error branches: user entitled to none, empty application list (AC-7.2); request for tenant B by a user entitled to A only, S-18 (the same "not found" page, UX-D-29) and no tenant B data (AC-7.1); entitlement revoked mid-session, next query shows S-18 (effect within 60 s, AC-9.2).

### J-8 (US-8): Sign in, MFA, step-up, lockout

- Entry: any dashboard or admin URL without a session.
- Steps (user): 1. Redirect to S-1 (AC-8.1). 2. Enter username and password. 3. S-4 with entitled applications only and no admin function (AC-8.2).
- Steps (admin): 1. S-1 password. 2. S-2 TOTP code. 3. Ingestion health (S-8), with side navigation to the other admin screens (UX-D-2). 4. On a REQ-27 action with last authentication older than 5 minutes, S-3 opens; on success the action continues with its input kept, on failure it stays blocked (AC-8.5, UX-D-8).
- Exit: signed in; or locked out; or signed out; session ends after 30 minutes idle, with a warning 2 minutes before and a "Stay signed in" action (AC-8.2, UX-D-6).
- Error branches: wrong password, generic failure; 5 consecutive failures in 15 minutes, account refused for 15 minutes then allowed automatically (AC-8.3), and the screen shows the same generic sign-in failure without revealing the lock or the remaining time (UX-D-4); wrong TOTP counts together with password failures (AC-8.6); reused TOTP code rejected (AC-8.7); source throttle and global throttle refusal: pending design (AC-8.8, CR-036, UX-Q-5 deferred to Phase 4); correct password with no valid TOTP, no admin access (AC-8.4); failed step-up attempts: pending design (CR-029, UX-Q-3 deferred to Phase 4); unlock by another admin after step-up (S-15).

### J-9 (US-9): Manage tenants and entitlements

- Entry: admin side navigation, Tenants (S-6) or Entitlements (S-7).
- Steps (tenant): 1. New tenant. 2. Enter unique id, department owner, privacy-notice URL. 3. Save. 4. Tenant appears in list with the privacy-notice URL (AC-9.5).
- Steps (entitlement): 1. Choose user and tenant. 2. Grant (step-up) or revoke (confirmation, C-7). 3. Save. 4. Message states it takes effect for new queries within 60 seconds.
- Exit: list updated.
- Error branches: duplicate or missing field, field-level messages and nothing changes (AC-9.4); step-up fails, action not performed; user role opens an admin screen, S-18 and an audit entry (AC-9.3).

### J-10 (US-10): Monitor health and handle dead letters

- Entry: Ingestion health (S-8, the admin landing), then Dead-letter events (S-9).
- Steps: 1. S-8 shows throughput, lag, dead-letter count and refused-publish count per tenant, auto-refreshed every 30 seconds with a pause control (UX-D-19). 2. Open a tenant's dead letters in S-9. 3. Select an event, step-up, view masked payload. 4. Optionally reveal one masked value with a reason of 10 to 500 characters and step-up; it is visible for 60 seconds and can be re-hidden (UX-D-21). 5. Replay, or discard (confirmation, C-7), selected events.
- Exit: list updated; actions audited.
- Error branches: unparseable body, never displayed and cannot be revealed (AC-10.6; whether such an event can be selected for replay or discard: pending UX-Q-51); replay of an event that still fails validation or is already stored (AC-10.2, AC-15.6); health data unavailable, error state, an unavailable tenant shows "unknown"; step-up fails; reason missing or out of length on reveal.

### J-11 (US-11): Run access and erasure for a subject

- Entry: Data-subject requests (S-10).
- Steps (access): 1. Enter verification reference (free text, up to 100 characters). 2. Enter 1 to 20 (tenant, user id) pairs and tick, per pair, that the reference covers that tenant (UX-D-24). 3. Step-up. 4. Run access. 5. Status while generating (within 15 minutes): queued, generating, ready or failed, updated every 10 seconds (UX-D-22). 6. Download JSON; expires and is deleted after 7 days.
- Steps (erasure): as above, run erasure. Outcome per store is shown; note on unparseable dead letters (AC-11.7).
- Exit: result shown; audit entry written.
- Error branches: pair whose tenant is not covered by the verification reference, refused with message and listed (AC-11.1, UX-D-24; what the system checks the reference against, and the all-pairs-refused outcome: pending UX-Q-45); no data held, "no data is held" (AC-11.4); one store fails, per-store outcome shown and the failed stores can be re-run for erasure (UX-D-23; how a re-run, status check and expiry are anchored to a past request without showing user ids: pending UX-Q-47). One access request yields one export (AC-11.1 "the export") and one per-store outcome table for the request (AC-11.2, UX-D-23); step-up fails; same user id in another tenant, untouched (AC-11.6); effect of restriction on access and erasure: pending design (CR-048, UX-Q-20 deferred to Phase 4).

### J-12 (US-12): Set retention per tenant

- Entry: Tenant retention (S-13); the tenant is chosen with the shared tenant selector (pending UX-Q-48).
- Steps: 1. Choose tenant, current value in days shown. 2. Enter new value 1 to 396. 3. Save. 4. If shortening would destroy data (at least one stored event is older than the new retention; AC-12.5 wording "such that data would be destroyed"): step-up, then a confirmation that states the number of events and the date range that will be purged (the ingest-time dates of the oldest and newest affected events, because retention is measured from ingest time, AC-12.1); nothing is purged until confirmed (AC-12.5, UX-D-25). If no stored event is older than the new value, nothing would be destroyed, so there is no step-up and no confirmation (G-13). 5. Success message states the change applies at the next purge run.
- Exit: saved or cancelled.
- Error branches: invalid value, field-level message and existing value unchanged (AC-12.3); confirmation cancelled, nothing changes; step-up fails; retention of restricted data: pending design (CR-048, UX-Q-20).

### J-14 (US-14): Read the audit log

- Entry: Audit log (S-17).
- Steps: 1. Open viewer (the viewing is audited). 2. Filter by actor, action, tenant, date range. 3. Read matching records, 50 per page, newest first (UX-D-28).
- Exit: leave viewer.
- Error branches: no matches, empty state; invalid date range, message; user role requests it, S-18 (AC-14.3).

### J-16 (US-16): Manage accounts

- Entry: Accounts (S-15).
- Steps: 1. Create account (username, role); there is no initial password: a one-time setup link valid 24 hours is shown once to the admin (UX-D-12); admin creation needs step-up; for a "user" account step-up is open in PRD rev 12 (proposed) Q-50. 2. The holder opens the link on S-19, sets a password and, for an admin, enrols TOTP (UX-D-12, UX-D-14). 3. Disable (confirmation), reset (step-up, one-time link shown once, 24 h, no email), change role (step-up; role selector and promotion or demotion steps pending UX-Q-55), reset MFA of another admin (step-up, confirmation; how that admin re-enrols, and whether a link is issued, pending UX-Q-56), unlock account (step-up). Which actions are offered for which account status: pending UX-Q-54. 4. The holder of a reset link sets a password in S-19.
- Exit: list updated.
- Error branches: missing role or duplicate username (AC-16.3); password under 12 characters or on the breached list (AC-16.4); last active admin disable, delete or demote refused (AC-16.6); step-up fails; link used twice or after 24 hours, or enrolment page older than 10 minutes (S-19; whether opening the link consumes it: pending UX-Q-57).

### J-17 (US-17): Manage producer credentials

- Entry: Producer credentials (S-16).
- Steps: 1. Create credential for a tenant (one fixed permission, "Publish events to this tenant", UX-D-27) (step-up). 2. Secret shown once. 3. Rotate (step-up): both credentials accepted up to 24 hours, overlap expiry time shown. 4. Revoke (confirmation): refused within 60 seconds.
- Exit: list updated, secret never shown again.
- Error branches: step-up fails; leaving the secret screen triggers the confirmation of C-7 (unconditional, whether or not it was copied; exits pending UX-Q-58) and the secret can never be re-shown (UX-D-13); revoke confirmation cancelled.

### J-18 (US-18): Record an objection

- Entry: Objection (S-11).
- Steps: 1. Enter verification reference and (tenant, user id) pair with the per-pair coverage checkbox. 2. Step-up. 3. Record. 4. Pair is on the suppression list and the erasure of AC-11.2 runs in the same flow. 5. Outcome per store is shown. 6. Removal of an entry needs a verification reference, step-up and a confirmation (C-7); how the admin identifies the entry and what the removal reference is checked against: pending UX-Q-46. Whether Record objection needs a C-7 confirmation: pending UX-Q-44.
- Exit: outcome shown.
- Error branches: missing tenant or user id, tenant not covered, pair already listed (AC-18.5); erasure fails in one store, suppression stays in force and the erasure can be re-run after step-up (AC-18.7); removal without reference, refused.

### J-19 (US-19): Restrict processing of a subject

- Entry: Restriction list (S-12).
- Steps: 1. Enter verification reference and pair with the per-pair coverage checkbox. 2. Step-up. 3. Add. 4. Stored events are excluded from every query started afterwards and kept. 5. Removal needs a verification reference, step-up and a confirmation (C-7); entry identification: pending UX-Q-46.
- Exit: list updated.
- Error branches: missing field, tenant not covered, duplicate pair (AC-19.6); removal without reference refused (AC-19.5). The relation of restriction to erasure, retention and access is pending design (CR-048, UX-Q-20 deferred to Phase 4).

## 4. Screens

Message ids: VM-n. Every message is draft copy; final copy is approved at HG-2 (UX-D-1).

### S-1 Sign-in

Purpose: authenticate a platform-managed account (AC-8.1, AC-8.2).
Data shown: username field, password field, messages. No analytics data.

| Field    | Source                                      |
| :------- | :------------------------------------------ |
| Username | REQ-13 (platform-managed accounts), AC-16.3 |
| Password | AC-8.2                                      |

Actions: Sign in. (No self-service reset: v1 sends no email, A-8.)

| State                         | Behaviour                                                                                                                                                               |
| :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading                       | Sign in button shows busy state and is disabled; announced "Signing in".                                                                                                |
| Empty                         | Empty form. Reached by redirect: no message, no analytics data in the page (AC-8.1).                                                                                    |
| Error: wrong credentials      | VM-1                                                                                                                                                                    |
| Error: locked                 | The same generic failure VM-1 is shown; the lock and the remaining time are not revealed (UX-D-4). The lock never disables the account (AC-8.3).                        |
| Pending design: throttled     | Source and global throttle refusal (AC-8.8) is pending design (CR-036, UX-Q-5 deferred to Phase 4). Placeholder: C-6 "pending design"; VM-3 is a provisional text only. |
| Error: system                 | Generic error (C-6).                                                                                                                                                    |
| Success (user)                | S-4.                                                                                                                                                                    |
| Success (admin password step) | S-2.                                                                                                                                                                    |
| Session ended                 | Banner "Your session has ended. Sign in again."                                                                                                                         |
| Permission-denied             | Not applicable; unauthenticated users are redirected here (AC-8.1).                                                                                                     |

Validation and messages:

| Id    | Field and rule                       | Text                                                                                                                 | AC             |
| :---- | :----------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :------------- |
| VM-1  | Credentials wrong, or account locked | "Sign-in failed. Check your username and password."                                                                  | AC-8.2, AC-8.3 |
| VM-1a | Username empty                       | "Enter your username."                                                                                               | AC-8.2         |
| VM-1b | Password empty                       | "Enter your password."                                                                                               | AC-8.2         |
| VM-2  | 5 consecutive failures in 15 minutes | Not shown to the user; the generic VM-1 is used (UX-D-4). The refusal and the audit entry still occur (AC-8.3).      | AC-8.3         |
| VM-3  | Source or global throttle            | Provisional only, pending design: "Too many sign-in attempts. Try again in a few minutes." (CR-036, UX-Q-5 deferred) | AC-8.8         |

Accessibility: both fields have visible labels and programmatic labels; first field receives focus on load; Enter submits; errors appear in a summary at the top that receives focus, plus text linked to the field with `aria-describedby`; error is not colour-only; password field allows paste and password managers (WCAG 3.3.8 accessible authentication); the busy state is announced politely.
Findings touched: CR-036 (throttle presentation pending design), CR-029.

### S-2 Authenticator code (TOTP) challenge and enrolment

Purpose: second factor for admins (AC-8.4). First-time enrolment of a new admin happens on S-19 and uses the enrolment content of UX-D-14 (UX-D-12). Where an admin re-enrols after an MFA reset (AC-16.9) is pending UX-Q-56: S-19 needs a one-time link, and neither the approved PRD (AC-16.9 "on next sign-in") nor PRD rev 12 (proposed) AC-16.9 and AC-16.10 say that an MFA reset issues one (G-15).
Data shown: 6-digit code field (UX-D-14).

Actions: Verify; Cancel and return to S-1.

| State                          | Behaviour                                                                                                             |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| Loading                        | Verify disabled and busy.                                                                                             |
| Empty                          | Empty code field.                                                                                                     |
| Error: wrong code              | VM-4; counts towards lockout (AC-8.6).                                                                                |
| Error: replayed code           | VM-5 (AC-8.7).                                                                                                        |
| Error: locked                  | The generic failure VM-1 (lock not revealed, UX-D-4) (AC-8.6).                                                        |
| Pending design: repeated fails | Behaviour of repeated TOTP and step-up failures beyond AC-8.6 is pending design (CR-029, UX-Q-3 deferred to Phase 4). |
| Error: no code supplied        | Admin cannot reach any admin function (AC-8.4); stays on S-2.                                                         |
| Error: system                  | Generic error.                                                                                                        |
| Success                        | Ingestion health (S-8) (UX-D-2).                                                                                      |
| Permission-denied              | A user-role account never sees S-2.                                                                                   |

| Id    | Rule                                   | Text                                                                              | AC              |
| :---- | :------------------------------------- | :-------------------------------------------------------------------------------- | :-------------- |
| VM-4  | Code wrong or expired                  | "That code is not valid. Check the code in your authenticator app and try again." | AC-8.4, AC-8.6  |
| VM-4a | Code empty or not exactly 6 digits     | "Enter the 6-digit code from your authenticator app."                             | AC-8.4, UX-D-14 |
| VM-5  | Code already used within its time step | "That code was already used. Wait for the next code and try again."               | AC-8.7          |

Accessibility: label "Authenticator code" with hint "6 digits"; numeric entry allowed with `autocomplete="one-time-code"`; error summary receives focus.
Findings touched: CR-029 (attempt limits and session effect pending design).

### S-3 Step-up re-authentication

Purpose: re-confirm password and TOTP when the last authentication is older than 5 minutes before one of the 16 REQ-27 actions (AC-8.5; listed in C-3). S-3 is a modal dialog shown over the blocked action, not a page (its accessibility rules below already require this); it has no "Not required" or "Success" state of its own: when step-up is not required the dialog is not opened (C-3), and on success it closes and the action resumes (G-7).
Data shown: the action being confirmed (name only, no sensitive values), password field, TOTP field.
Actions: Confirm; Cancel (the action is not performed).

| State                             | Behaviour                                                                                                                                   |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading                           | Confirm disabled and busy.                                                                                                                  |
| Empty                             | Empty fields; text "Confirm it is you to continue: <action>".                                                                               |
| Not required (not a dialog state) | When the last authentication is 5 minutes or less old, S-3 is not opened (C-3).                                                             |
| Error: wrong password or code     | VM-6.                                                                                                                                       |
| Error: replayed code              | VM-5.                                                                                                                                       |
| Pending design: repeated failure  | Whether five failed step-ups end the session and lock the account is pending design (CR-029, UX-Q-3 deferred to Phase 4). Placeholder only. |
| Error: system                     | Generic error.                                                                                                                              |
| Success                           | Returns to the blocked action, which resumes with its input kept; step-up is audited (AC-8.5, UX-D-8).                                      |
| Permission-denied                 | A user-role session cannot reach it.                                                                                                        |

| Id    | Rule                                                                                                                                                                      | Text                                                                             | AC             |
| :---- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------- | :------------- |
| VM-6  | Password or code wrong (form-level message in the dialog's error summary, linked to no single field, because it does not say which value was wrong; same pattern as VM-1) | "Confirmation failed. Check your password and authenticator code and try again." | AC-8.5, AC-8.6 |
| VM-6a | Either field empty                                                                                                                                                        | "Enter your password and your authenticator code."                               | AC-8.5         |

Accessibility: presented so keyboard focus moves into it when it opens and returns to the triggering control on close; background content is not operable while it is open; Escape cancels; labels as in S-1 and S-2; the action name is announced when it opens.
Findings touched: CR-029.

### S-4 Application list

Purpose: show the entitled applications (AC-8.2, AC-7.2).
Data shown: application name and department owner only (UX-D-11; REQ-9, AC-9.1). In v1 an application is a tenant (REQ-9: "tenant (application / department)"), one application per tenant, and AC-9.1 gives a tenant no field other than its id, owner and privacy-notice URL, so the "application name" is the tenant id and S-6 needs no separate name field; sorting by name is sorting by tenant id (G-1). Whether an admin holds entitlements, or sees all tenants, on this list: pending UX-Q-31 (UX-D-2 says "same entitlement rule"; Section 8, PI-1).
Actions: open an application (S-5); sign out.

| State                   | Behaviour                                                                                      |
| :---------------------- | :--------------------------------------------------------------------------------------------- |
| Loading                 | Busy indicator in the list area.                                                               |
| Empty (no entitlements) | "You are not entitled to any application yet. Ask a platform admin for access." (AC-7.2)       |
| Error                   | Generic read-only error with Retry.                                                            |
| Success                 | List of entitled applications only; for the role "user" no admin function is visible (AC-8.2). |
| Partial                 | Not applicable.                                                                                |
| Permission-denied       | Unauthenticated: S-1 (AC-8.1).                                                                 |

Accessibility: list is a real list with links; heading identifies the page; focus lands on the main heading on load; empty text is not conveyed only by an icon.

### S-5 Application overview (filters, comparison)

Purpose: aggregate usage of one application: total events, unique users, events over time, top 10 event types, with filters and previous-period comparison (REQ-11, REQ-12).

| Data shown                                                      | PRD source                                                                                         |
| :-------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| Total events                                                    | AC-5.1, REQ-11; counts events by event time in the UTC range, excluding restricted subjects        |
| Unique users                                                    | AC-5.1, REQ-10 (distinct pseudonymous ids, never displayed); anonymous events add nothing (AC-5.7) |
| Events over time (daily series)                                 | AC-5.1, AC-5.5 (event-time UTC day)                                                                |
| Top 10 event types                                              | AC-5.1                                                                                             |
| Breakdowns (for example country, browser/OS family, event type) | AC-5.6, REQ-10                                                                                     |
| Previous-period values and percentage change                    | AC-6.2; previous period = same length immediately before the range (UX-D-9)                        |
| Active filters list                                             | AC-6.1                                                                                             |
| Suppressed marker and sum statement                             | AC-5.1, AC-5.6, AC-5.7, REQ-29                                                                     |
| Never shown                                                     | per-user records, raw user id, pseudonymous id (AC-5.4, REQ-11, REQ-25)                            |

Filters: application, start date, end date (whole UTC days only), event type, compare toggle. Defaults when S-5 is opened without a selected application: first application alphabetically by application name (tenant id), last 7 days, all event types (UX-D-7); when opened from S-4 the selected application is used and only the other defaults apply (G-2). S-5 can be opened from navigation with no application selected; the default application then applies. "Last 7 days": whether it includes the current, incomplete UTC day: pending UX-Q-32. Date control type and entry format: pending UX-Q-33. A start date equal to the end date (one whole day) is valid (G-3; VM-7). Actions: apply, clear one filter, clear all, toggle comparison; the meaning of "clear" for the application, start and end filters and of "Clear all": pending UX-Q-36; compare toggle timing: pending UX-Q-37; the "Top 10 event types" panel when one event type is selected: pending UX-Q-38.

| State                 | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading               | Busy indicator for the figures; announced; target render within 2 seconds at p95 for 30 days (AC-5.2, measured, not enforced by the screen).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Empty                 | "No events were recorded for this application in the selected range." No error shown and none logged (AC-5.3).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Error                 | Generic read-only error with Retry. A 403 or 404 for a tenant goes to S-18.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Success               | All four figures and series.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Partial (suppression) | Suppressed cells show the marker "Suppressed (fewer than 5 users)" instead of a number, in every view of that cell (AC-5.6), including the current-period and previous-period value cells in comparison mode (G-5); for anonymous-only cells the marker reads "Suppressed (fewer than 5 events)" (AC-5.7). When exactly one cell of a breakdown is suppressed, the smallest other cell is also suppressed (AC-5.6); that cell may hold 5 or more users, so the text "fewer than 5 users" would be untrue for it, and its marker text is pending UX-Q-39. Which figures and breakdown dimensions are subject to suppression, and how an anonymous-only cell is laid out: pending UX-Q-40. Statement shown whenever any suppression applies: "Some values are suppressed to protect privacy, so the values shown may add up to less than the total." (AC-5.1) |
| Partial (comparison)  | Percent change from a zero previous value shows "n/a" (UX-D-9); precedence when the previous value is zero and a compared cell is also suppressed: pending UX-Q-41. If either compared cell is suppressed, the comparison shows "—" with a tooltip: "Not shown because one of the compared values is suppressed to protect privacy." (UX-D-10)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Permission-denied     | Not entitled to the application: S-18; no tenant data (AC-7.1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Session ended         | Redirect to S-1 with the banner (C-6).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Validation messages:

| Id    | Field and rule                 | Text                                                                                                                                            | AC             |
| :---- | :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------- |
| VM-7  | End date before start date     | "The end date must be on or after the start date."                                                                                              | AC-6.2         |
| VM-8  | Range longer than 13 months    | "The date range can be at most 13 months. Choose a shorter range."                                                                              | AC-6.2, REQ-12 |
| VM-9  | Date empty or not a valid date | "Enter a valid date."                                                                                                                           | AC-6.1         |
| VM-10 | Sub-day range attempted        | Not possible: the controls select whole UTC days only; if a time portion is entered the text is "Dates are whole days in UTC. Remove the time." | AC-5.6         |

In VM-7, VM-8, VM-9 the query is not run (AC-6.2). VM-8 and VM-36 use different units today ("13 months" here, 396 days in S-13); the unit of the range limit is pending UX-Q-34 (G-3). VM-10 applies only if the date control accepts text with a time portion; it is pending UX-Q-33 (it is dropped if the control cannot take one). The previous period for comparison is bounded by the retention horizon: pending UX-Q-35.

Accessibility: filter controls have labels and are in a logical order before the figures; date entry works by keyboard and, if the control accepts typed text, by typing (WCAG 2.5.7 no drag-only; control type pending UX-Q-33); every chart has a data-table alternative (UX-D-15); series and breakdown values are not conveyed by colour alone (1.4.1, 1.4.11 non-text contrast 3:1); the suppressed marker has the same text for assistive technology as it shows (not an ellipsis or dash alone); the "—" comparison marker has an accessible name "Not available, suppressed" and its tooltip is reachable by keyboard focus and dismissible (WCAG 1.4.13); result updates after Apply are announced in a polite live region ("Results updated for <range>"); each active-filter chip's clear control has a name such as "Clear filter: event type"; focus is kept on the control used after update; error summary links to the failing field; UTC is stated in text next to dates; layout reflows at 400% zoom (UX-D-30; the "desktop and tablet" part of UX-D-30 depends on PRD rev 12 (proposed) Q-51, open).
Findings touched: none directly; REQ-29 behaviour only.

### S-6 Admin: Tenants

Purpose: list and create tenants; show the privacy-notice URL (AC-9.1, AC-9.4, AC-9.5).

| Data shown                      | PRD source                           |
| :------------------------------ | :----------------------------------- |
| Tenant id (unique, immutable)   | AC-9.1; UX-D-16                      |
| Department owner                | AC-9.1                               |
| Privacy-notice URL              | AC-9.5, REQ-5; URL only (UX-D-16)    |
| Created and changed times (UTC) | AC-9.5 (creation and change audited) |

Actions: New tenant, Save, Cancel; edit the privacy-notice URL (editable, change is audited, AC-9.5, UX-D-16). The tenant id cannot be changed after creation (UX-D-16). The tenant is the application (S-4), so this form has no separate application-name field (G-1). Tenant id is case-sensitive input: an uppercase letter is refused by VM-14a, never folded to lowercase (UX-D-16 "lowercase letters"; G-18). Accepted URL schemes: pending UX-Q-63. These rules are in PRD rev 12 (proposed) AC-9.5 and AC-9.6 (PI-7); until HG-C-2 is approved they are UX-only.

| State             | Behaviour                                                                 |
| :---------------- | :------------------------------------------------------------------------ |
| Loading           | Busy indicator in table and form.                                         |
| Empty             | "No tenants exist yet. Create the first tenant."                          |
| Error             | Generic error; on save failure nothing is changed.                        |
| Success           | "Tenant <id> saved." Row appears in the list with its privacy-notice URL. |
| Permission-denied | S-18 (AC-9.3).                                                            |
| Step-up           | Not required for tenant creation by the PRD list.                         |

| Id     | Field and rule                                                            | Text                                                                                           | AC                      |
| :----- | :------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------- | :---------------------- |
| VM-11  | Tenant id missing                                                         | "Enter a tenant id."                                                                           | AC-9.4                  |
| VM-12  | Tenant id duplicate                                                       | "A tenant with this id already exists. Enter a different id."                                  | AC-9.4                  |
| VM-13  | Department owner missing                                                  | "Enter the department owner."                                                                  | AC-9.4                  |
| VM-14  | Privacy-notice URL missing                                                | "Enter the privacy-notice URL. It is required."                                                | AC-9.4, AC-9.5          |
| VM-14a | Tenant id not 3 to 40 characters of lowercase letters, digits and hyphens | "The tenant id must be 3 to 40 characters and use only lowercase letters, digits and hyphens." | AC-9.4, UX-D-16         |
| VM-14b | Department owner longer than 100 characters                               | "The department owner can be at most 100 characters."                                          | AC-9.4, UX-D-16         |
| VM-14c | Privacy notice not a valid URL                                            | "Enter the privacy notice as a valid URL."                                                     | AC-9.4, AC-9.5, UX-D-16 |

Accessibility: table with column headers; form labels and required marking in text ("required"), not asterisk alone; hint under the tenant id field states the format; field-level errors linked by `aria-describedby`, summary focused on failed submit; success message in a status region; privacy-notice URL is a link with a meaningful name.

### S-7 Admin: User entitlements

Purpose: grant and revoke a user's access to a tenant (AC-9.2).

| Data shown                                                         | PRD source |
| :----------------------------------------------------------------- | :--------- |
| User account (name or username)                                    | REQ-14     |
| Tenants granted                                                    | AC-9.2     |
| Effect-time note: "takes effect for new queries within 60 seconds" | AC-9.2     |

Actions: Grant (step-up), Revoke (confirmation, C-7), Save. Whether admin accounts can hold entitlements and appear in the user list of this screen: pending UX-Q-31 (G-1).

| State             | Behaviour                                                                                                                                                  |
| :---------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Busy indicator.                                                                                                                                            |
| Empty             | "This user has no entitlements."                                                                                                                           |
| Error             | Generic error; nothing changes.                                                                                                                            |
| Success           | "Entitlement saved. It takes effect for new queries within 60 seconds."                                                                                    |
| Step-up-required  | Grant opens S-3 if last authentication older than 5 minutes (AC-9.2, AC-8.5). Revoke is not on the step-up list but has the confirmation of C-7 (UX-D-18). |
| Permission-denied | S-18.                                                                                                                                                      |

Validation: user or tenant not chosen: VM-15 "Choose a user." and VM-16 "Choose a tenant." (no AC states these texts; they are derived from the form).
Accessibility: select controls are native or equivalent with labels; success message announced; revoke control name includes the tenant and user.

### S-8 Admin: Ingestion health (admin landing)

Purpose: view throughput, lag, dead-letter count and refused-publish count per tenant (AC-10.1). It is the landing screen after admin sign-in (UX-D-2).

| Data shown                                                                      | PRD source                                  |
| :------------------------------------------------------------------------------ | :------------------------------------------ |
| Throughput per tenant                                                           | AC-10.1, REQ-15                             |
| Consumer lag per tenant                                                         | AC-10.1                                     |
| Dead-letter count per tenant (link to S-9)                                      | AC-10.1                                     |
| Refused-publish count per tenant; unknown-credential refusals at platform level | AC-10.1, REQ-26                             |
| Last refreshed time (UTC)                                                       | AC-10.1 (refresh at least every 30 seconds) |
| Wrong-tenant dead letters shown against the credential's own tenant             | AC-9.1                                      |

Actions: open dead letters of a tenant; pause and resume auto-refresh. The view auto-refreshes every 30 seconds (UX-D-19). Units of throughput and lag are pending UX-Q-50 (AC-10.1 gives none). State combinations (G-12; AC-10.7 in PRD rev 12 (proposed), UX-D-19): while paused the view makes no requests, so no refresh error can occur and "last refreshed" is the time of the data on screen; Resume triggers a refresh; "Partial" is a per-tenant "unknown" inside an otherwise successful refresh, while "Error" is a failed refresh of the whole view.

| State             | Behaviour                                                                                                                                                                                                                                     |
| :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Busy indicator on first load only; later refreshes do not blank the page.                                                                                                                                                                     |
| Empty             | "No ingestion activity has been recorded yet."                                                                                                                                                                                                |
| Error             | "Health data could not be refreshed. Showing data from <time> UTC." with Retry (stale data kept, marked). If no earlier data exists: "Something went wrong. The data could not be loaded. Try again." with Retry (C-6 read-only error; G-18). |
| Success           | Figures per tenant plus platform-level refusals.                                                                                                                                                                                              |
| Paused            | "Auto-refresh is paused. Data is from <time> UTC." with a Resume action (UX-D-19).                                                                                                                                                            |
| Partial           | One tenant's data unavailable: that row shows "unknown"; others show (UX-D-19).                                                                                                                                                               |
| Permission-denied | S-18.                                                                                                                                                                                                                                         |

Validation: none.
Accessibility: refresh must not move focus or reset scroll; the auto-update is a polite live region only for the "last refreshed" text, not every number (avoid flooding); the pause control satisfies WCAG 2.2.2 and is keyboard operable; numbers have units in text; status is not colour-only.

### S-9 Admin: Dead-letter events

Purpose: inspect, reveal, replay, discard dead-lettered events (AC-10.2, AC-10.4, AC-10.6, AC-11.10).

| Data shown                                                                                             | PRD source               |
| :----------------------------------------------------------------------------------------------------- | :----------------------- |
| List: tenant (the credential's own tenant), reason code, field path, dead-lettered time (UTC)          | AC-10.4, AC-15.1, AC-9.1 |
| Parseable event detail: keys visible, all payload values masked whatever the key                       | AC-10.4, REQ-15          |
| Unparseable event detail: reason code, tenant and timestamps only; body never shown, no reveal control | AC-10.6, REQ-15          |
| Expiry: expires within 7 days of dead-lettering                                                        | AC-10.3                  |

Actions: Open (step-up), Reveal one value (reason plus step-up, limited to that event), Replay, Discard (confirmation, C-7). The tenant whose dead letters are listed is chosen with the shared tenant selector (pending UX-Q-48). Pending: whether an unparseable event can be selected for Replay or Discard (UX-Q-51); whether several values can be revealed at once (UX-Q-52); whether the expiry is shown as an exact time and how a long list is paged (UX-Q-53). The placement of the opened event (page, panel or drawer) is visual layout, which this document does not decide (scope rules). The order of reason entry and step-up on Reveal: pending UX-Q-43.

Reveal behaviour (UX-D-21): the revealed value is visible for 60 seconds, then masked again automatically; the admin can re-hide it sooner; every reveal is audited. The re-masking is announced and the remaining time is available as text. The automatic 60-second hide is a security time limit; its treatment under WCAG 2.2.1 (essential exception) is to be confirmed at HG-2.

| State             | Behaviour                                                                                                                                                                         |
| :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Busy indicator.                                                                                                                                                                   |
| Empty             | "There are no dead-lettered events for this tenant." Also the state after the subject's messages were erased: those entries are no longer listed and cannot be opened (AC-11.10). |
| Error             | Generic error.                                                                                                                                                                    |
| Success: replay   | "Replay requested for <n> events." Outcome per event shown (stored, still invalid, already stored and not stored again, AC-10.2, AC-15.6).                                        |
| Success: discard  | "<n> events discarded."                                                                                                                                                           |
| Step-up-required  | Open and Reveal each trigger S-3 when needed (AC-10.4, AC-8.5).                                                                                                                   |
| Unparseable       | Notice "This message could not be read. Its content is never shown and cannot be revealed. It expires within 7 days." No Reveal control rendered (AC-10.6).                       |
| Partial           | Event removed (expired, discarded or erased) between list and open: "This event is no longer available."                                                                          |
| Permission-denied | S-18.                                                                                                                                                                             |

| Id     | Field and rule                                              | Text                                       | AC               |
| :----- | :---------------------------------------------------------- | :----------------------------------------- | :--------------- |
| VM-17  | Reveal reason empty                                         | "Enter a reason to reveal this value."     | AC-10.4          |
| VM-17a | Reveal reason shorter than 10 or longer than 500 characters | "The reason must be 10 to 500 characters." | AC-10.4, UX-D-21 |
| VM-18  | Replay or discard with nothing selected                     | "Select at least one event."               | AC-10.2          |

Accessibility: masked values have the text "Masked" (not a row of symbols read character by character) and an accessible name that includes the key; the Reveal control names the key it reveals; the discard confirmation (C-7) is a focus-managed dialog; multi-select by checkboxes with a "select all" and a count announced; table has headers; a revealed value is announced and can be hidden again by keyboard.

### S-10 Admin: Data-subject access and erasure

Purpose: run access (Art. 15) and erasure (Art. 17) for verified requests (REQ-18, AC-11.1 to AC-11.10).

| Data entered or shown                                                                                                               | PRD source                |
| :---------------------------------------------------------------------------------------------------------------------------------- | :------------------------ |
| Verification reference (recorded; free text up to 100 characters)                                                                   | AC-11.1, AC-11.3, UX-D-24 |
| 1 to 20 (tenant, user id) pairs, each with a checkbox confirming the reference covers that tenant                                   | AC-11.1, AC-11.6, UX-D-24 |
| Run mode: access or erasure                                                                                                         | AC-11.1, AC-11.2          |
| Access result: JSON export, download only by the requesting admin, expires and is deleted after 7 days, generated within 15 minutes | AC-11.1                   |
| Export status: queued, generating, ready, failed (updated every 10 seconds)                                                         | AC-11.1, UX-D-22          |
| Erasure outcome per store: event store, aggregates, dead-letter store, messaging layer, deduplication state, exports                | AC-11.2                   |
| Note on unparseable dead-letter messages                                                                                            | AC-11.7                   |
| Request id (shown as a masked request reference), counts, time; user ids are not shown after entry                                  | AC-11.3, UX-D-17          |

Actions: Add pair, Remove pair, Run access (step-up), Run erasure (step-up), Re-run erasure for failed stores (step-up), Download export (audited). Pending: the check behind VM-22 and the outcome when every pair is refused (UX-Q-45); past requests, re-run without re-entering user ids, status and expiry anchor (UX-Q-47); whether Run erasure needs a C-7 confirmation (UX-Q-44). Failed export, draft copy (UX-D-1): "The export could not be generated." (VM-53); the recovery action is pending UX-Q-47. Tenant choice per pair uses the tenant select of each pair row; there is no screen-level tenant selector on S-10.

| State             | Behaviour                                                                                                                                                                             |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | Busy indicator; during access generation "Generating the export. This takes up to 15 minutes." with status queued, generating, ready or failed, refreshed every 10 seconds (UX-D-22). |
| Empty             | Blank form; the "no data" result: "No data is held for the subject. The request and outcome were recorded." (AC-11.4)                                                                 |
| Error             | Generic error; a failed erasure run shows the per-store outcome and offers re-run for the failed stores after step-up (UX-D-23, as AC-18.7 for objection).                            |
| Success: access   | "Export ready. It is available until <time> UTC and is then deleted." Download action.                                                                                                |
| Success: erasure  | Outcome per store plus "Unparseable dead-letter messages cannot be matched to a subject. They are never displayed or revealable and expire within 7 days." (AC-11.7)                  |
| Step-up-required  | Both runs and the download of the export are guarded as listed (DSAR export, DSAR deletion; AC-8.5).                                                                                  |
| Partial           | Pairs whose tenant is not covered are refused and listed with VM-22; the other pairs follow AC-11.1 (UX-D-24).                                                                        |
| Expired           | Download no longer available: "This export has expired and was deleted."                                                                                                              |
| Pending design    | Whether an access export includes restricted events, and what erasure does to a restriction entry, are pending design (CR-048, UX-Q-20 deferred to Phase 4). Placeholder notice only. |
| Permission-denied | S-18.                                                                                                                                                                                 |

| Id     | Field and rule                                    | Text                                                                                                             | AC               |
| :----- | :------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------- | :--------------- |
| VM-19  | Verification reference missing                    | "Enter the verification reference."                                                                              | AC-11.1          |
| VM-19a | Verification reference longer than 100 characters | "The verification reference can be at most 100 characters."                                                      | AC-11.1, UX-D-24 |
| VM-20  | Tenant missing in a pair                          | "Choose a tenant for each pair."                                                                                 | AC-11.1          |
| VM-21  | User id missing in a pair                         | "Enter a user id for each pair."                                                                                 | AC-11.1          |
| VM-22  | Tenant not covered by the verification reference  | "The verification reference does not cover tenant <tenant>. Remove this pair or use a reference that covers it." | AC-11.1          |
| VM-22a | Per-pair coverage checkbox not ticked             | "Confirm that the verification reference covers tenant <tenant>."                                                | AC-11.1, UX-D-24 |
| VM-22b | More than 20 pairs                                | "A request can include at most 20 pairs. Remove pairs or submit a second request."                               | UX-D-24          |
| VM-53  | Access export failed (draft copy, G-18)           | "The export could not be generated."                                                                             | AC-11.1, UX-D-22 |
| VM-22c | No pair entered                                   | "Add at least one pair."                                                                                         | AC-11.1          |

Accessibility: pairs are rows with labelled fields, a labelled coverage checkbox and "Remove pair n" controls; the user id field is not auto-completed and is not placed in the URL or page title (C-4); outcome table has headers and text status (not icon only); long-running status in a polite live region; download link names file type and expiry; a pair refused is linked from the summary to its row.
Findings touched: CR-048 (pending design placeholder).

### S-11 Admin: Objection (suppression list)

Purpose: record objections (Art. 21), erase in the same flow, manage entries (REQ-33, US-18).

| Data entered or shown                                                                                    | PRD source                |
| :------------------------------------------------------------------------------------------------------- | :------------------------ |
| Verification reference (free text up to 100 characters)                                                  | AC-18.1, AC-18.3, UX-D-24 |
| (tenant, user id) pair with coverage checkbox                                                            | AC-18.1, UX-D-24          |
| Suppression list per tenant: counts and masked request reference only, no user id; date added, who added | AC-18.3, REQ-33, UX-D-17  |
| Erasure outcome per store, including failure                                                             | AC-18.7                   |
| Dropped-new-event count per tenant                                                                       | AC-18.1                   |

Actions: Record objection (step-up), Remove entry (verification reference, step-up, confirmation), Re-run erasure for failed stores (step-up). The list tenant is chosen with the shared tenant selector (pending UX-Q-48). Pending: entry identification on removal, the coverage checkbox on removal and the success text of a removal (UX-Q-46; there is no "Success: remove" row until answered); check behind VM-25 (UX-Q-45); confirmation for Record objection (UX-Q-44); re-run without re-entering user ids (UX-Q-47).

| State                    | Behaviour                                                                                                                                 |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| Loading                  | Busy indicator; erasure running status.                                                                                                   |
| Empty                    | "No objections are recorded for this tenant."                                                                                             |
| Error                    | Generic error; nothing changed.                                                                                                           |
| Success                  | "Objection recorded. New events for this subject are no longer stored. Erasure outcome:" and the per-store table (AC-18.1, AC-18.7).      |
| Partial (erasure failed) | "Erasure did not finish for: <stores>. The suppression is in effect. Re-run the erasure." with the Re-run action after step-up (AC-18.7). |
| Step-up-required         | Add, remove and re-run (AC-8.5).                                                                                                          |
| Permission-denied        | S-18.                                                                                                                                     |

| Id     | Field and rule                                 | Text                                                               | AC               |
| :----- | :--------------------------------------------- | :----------------------------------------------------------------- | :--------------- |
| VM-23  | Tenant missing                                 | "Choose a tenant."                                                 | AC-18.5          |
| VM-24  | User id missing                                | "Enter a user id."                                                 | AC-18.5          |
| VM-25  | Tenant not covered by the reference            | "The verification reference does not cover tenant <tenant>."       | AC-18.5          |
| VM-26  | Pair already on the list                       | "This subject is already on the suppression list for this tenant." | AC-18.5          |
| VM-27  | Verification reference missing (add or remove) | "Enter the verification reference. It is required."                | AC-18.3          |
| VM-27a | Reference longer than 100 characters           | "The verification reference can be at most 100 characters."        | AC-18.3, UX-D-24 |
| VM-27b | Coverage checkbox not ticked                   | "Confirm that the verification reference covers tenant <tenant>."  | AC-18.5, UX-D-24 |

Accessibility: as S-10; the per-store outcome includes text "Completed" or "Failed"; the list of entries has remove controls named by tenant and date (not by user id); the removal confirmation is a focus-managed dialog (C-7).
Findings touched: none directly; CR-048 relates to restriction (S-12).

### S-12 Admin: Restriction list

Purpose: restrict a subject's stored events from analytics without deleting them (REQ-34, US-19).

| Data entered or shown                                                                                                              | PRD source                |
| :--------------------------------------------------------------------------------------------------------------------------------- | :------------------------ |
| Verification reference (free text up to 100 characters)                                                                            | AC-19.3, AC-19.5, UX-D-24 |
| (tenant, user id) pair with coverage checkbox                                                                                      | AC-19.1, UX-D-24          |
| Restriction list per tenant (counts and masked request reference, no user id; date added, who added)                               | AC-19.3, UX-D-17          |
| Statement of effect: stored events are kept and excluded from totals, unique users and breakdowns for queries started after saving | AC-19.1, AC-19.2          |

Actions: Add (step-up), Remove (verification reference, step-up, confirmation). The list tenant is chosen with the shared tenant selector (pending UX-Q-48). Entry identification and the coverage checkbox on removal: pending UX-Q-46; check behind VM-30: pending UX-Q-45.

| State             | Behaviour                                                                                                                                                                                                      |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Busy indicator.                                                                                                                                                                                                |
| Empty             | "No restrictions are recorded for this tenant."                                                                                                                                                                |
| Error             | Generic error; nothing changed.                                                                                                                                                                                |
| Success: add      | "Restriction added. The subject's events are kept and excluded from queries started from now."                                                                                                                 |
| Success: remove   | "Restriction removed. Queries started from now include the subject's events again." (AC-19.5)                                                                                                                  |
| Step-up-required  | Add and remove (AC-8.5).                                                                                                                                                                                       |
| Pending design    | The effect of erasure, retention purge and subject access on restricted data is pending design (CR-048, UX-Q-20 deferred to Phase 4). The screen shows the placeholder notice and makes no statement on these. |
| Permission-denied | S-18.                                                                                                                                                                                                          |

| Id     | Field and rule                         | Text                                                               | AC               |
| :----- | :------------------------------------- | :----------------------------------------------------------------- | :--------------- |
| VM-28  | Tenant missing                         | "Choose a tenant."                                                 | AC-19.6          |
| VM-29  | User id missing                        | "Enter a user id."                                                 | AC-19.6          |
| VM-30  | Tenant not covered by the reference    | "The verification reference does not cover tenant <tenant>."       | AC-19.6          |
| VM-31  | Pair already on the list               | "This subject is already on the restriction list for this tenant." | AC-19.6          |
| VM-32  | Removal without verification reference | "Enter the verification reference to remove a restriction."        | AC-19.5          |
| VM-32a | Reference longer than 100 characters   | "The verification reference can be at most 100 characters."        | AC-19.3, UX-D-24 |
| VM-32b | Coverage checkbox not ticked           | "Confirm that the verification reference covers tenant <tenant>."  | AC-19.6, UX-D-24 |

Accessibility: as S-11.
Findings touched: CR-048 (pending design placeholder).

### S-13 Admin: Tenant retention

Purpose: set retention per tenant in days (REQ-17, US-12).

| Data shown                                                 | PRD source       |
| :--------------------------------------------------------- | :--------------- |
| Tenant                                                     | AC-12.2          |
| Retention in days (default 396, minimum 1, maximum 396)    | REQ-17, AC-12.3  |
| Note that a change applies at the next purge run           | AC-12.2          |
| Number of events and date range to be purged on shortening | AC-12.5, UX-D-25 |

Actions: Save, Cancel; the confirmation dialog uses the C-7 buttons "Confirm" and "Cancel" (there is no separate "Confirm purge" button) (G-13). The tenant is chosen with the shared tenant selector (pending UX-Q-48). "Would destroy data" means at least one stored event is older than the new value (AC-12.5); step-up and confirmation apply only then; the event count and the ingest-date range are computed and shown in the confirmation after step-up (AC-12.5 order: save, step-up, confirmation). The retention limit unit is 396 days (VM-36); the matching range limit on S-5 is pending UX-Q-34.

| State             | Behaviour                                                                                                                                                                                 |
| :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Busy indicator.                                                                                                                                                                           |
| Empty             | Not applicable (a value always exists, default 396).                                                                                                                                      |
| Error             | Generic error; value unchanged.                                                                                                                                                           |
| Success           | "Retention saved. It applies to existing data at the next purge run." (AC-12.2) Lengthening note: "Data already purged is not restored." (AC-12.2)                                        |
| Step-up-required  | Only when shortening would destroy data (AC-12.5; list item "retention shortening").                                                                                                      |
| Confirmation      | "Saving this value will purge <n> events recorded from <start date> to <end date> UTC at the next purge run. Nothing is purged until you confirm." Confirm and Cancel (AC-12.5, UX-D-25). |
| Pending design    | Whether retention purge applies to restricted data is pending design (CR-048, UX-Q-20 deferred to Phase 4); the confirmation makes no statement on restricted data.                       |
| Permission-denied | S-18.                                                                                                                                                                                     |

| Id    | Rule                      | Text                                             | AC      |
| :---- | :------------------------ | :----------------------------------------------- | :------ |
| VM-33 | Missing                   | "Enter the retention in days."                   | AC-12.3 |
| VM-34 | Non-numeric or fractional | "Enter a whole number of days."                  | AC-12.3 |
| VM-35 | Zero, negative, below 1   | "Retention must be at least 1 day."              | AC-12.3 |
| VM-36 | Above 396                 | "Retention can be at most 396 days (13 months)." | AC-12.3 |

On any of VM-33 to VM-36 the existing value is unchanged. 1 and 396 are accepted.
Accessibility: numeric input with label "Retention (days)" and hint "1 to 396"; confirmation is a focus-managed dialog with the counts and dates in text; errors linked to field.

### S-14 Admin: Tenant allow-listed property keys

Purpose: add or remove free-form property keys accepted from a tenant (REQ-14, AC-13.8; outside the UI-facing story list).
Data shown: tenant, allowed keys, dropped-key count per tenant (AC-13.3), and a personal-data warning next to the key field (UX-D-26). Actions: Add key (step-up), Remove key (step-up; both are "allow-list changes").
Warning text: "Do not allow keys that carry personal data, such as email, name or phone. Values that look like personal data are not stored."
States: Loading busy; Empty "No keys are allow-listed for this tenant. Free-form properties are dropped."; Error generic; Success "Key <key> added. It is accepted from this tenant now." (no rebuild, AC-13.8); Success: remove, draft copy (UX-D-1), VM-54: "Key <key> removed. It is no longer accepted from this tenant." (the removal effect is not stated in the PRD text read; wording to be checked at HG-2); Step-up-required as stated (add and remove are both "allow-list changes", AC-8.5); whether removal needs a C-7 confirmation: pending UX-Q-44; the tenant is chosen with the shared tenant selector (pending UX-Q-48); first-character rule of VM-50: pending UX-Q-63; Permission-denied S-18.

| Id    | Rule                          | Text                                                                                          | AC               |
| :---- | :---------------------------- | :-------------------------------------------------------------------------------------------- | :--------------- |
| VM-48 | Key missing                   | "Enter a property key."                                                                       | AC-13.8          |
| VM-49 | Key already allow-listed      | "This key is already allow-listed."                                                           | AC-13.8          |
| VM-50 | Key not lowercase snake_case  | "Use lowercase snake_case: lowercase letters, digits and underscores, for example page_name." | AC-13.8, UX-D-26 |
| VM-51 | Key longer than 64 characters | "The key can be at most 64 characters."                                                       | AC-13.8, UX-D-26 |

Accessibility: as S-6; add and remove controls named by key; the warning is text associated with the key field through `aria-describedby`.

### S-15 Admin: Accounts

Purpose: create, reset, disable accounts, change roles, reset MFA, unlock (REQ-24, AC-16.x, AC-8.3).

| Data shown                                                                                | PRD source               |
| :---------------------------------------------------------------------------------------- | :----------------------- |
| Username, role ("user" or "admin"), status (active, disabled, locked)                     | AC-16.1, AC-16.2, AC-8.3 |
| One-time setup or reset link, shown once, valid 24 hours, single use, no email sent       | AC-16.2, UX-D-12         |
| Admin MFA status (enrolled, reset required)                                               | AC-16.1, AC-16.9         |
| Never shown after creation: any password or credential value (no initial password exists) | AC-16.3, UX-D-12         |

Actions: Create account (admin role needs step-up; for role "user" step-up is open in PRD rev 12 (proposed) Q-50, and the link issue follows that answer); Disable (confirmation); Reset credential (step-up); Change role (step-up); Reset MFA (step-up, confirmation); Unlock (step-up). Pending: which action is offered for which status (active, disabled, locked) and whether a disabled account can be enabled (UX-Q-54); role selector and promotion or demotion steps (UX-Q-55); what Reset MFA issues and what Reset credential does for an admin's TOTP (UX-Q-56); username rules (UX-Q-63). The S-15 control for deleting an account does not exist in v1: AC-16.6 guards "disable, delete or demote" for any admin action, and the only deletion in the PRD is the automated 12-month deletion of disabled-account personal data (AC-14.5), which is not a screen action (G-14).

| State                | Behaviour                                                                                                                                                                                                                                                                                                                                   |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading              | Busy indicator.                                                                                                                                                                                                                                                                                                                             |
| Empty                | Not applicable (at least one admin exists).                                                                                                                                                                                                                                                                                                 |
| Error                | Generic error; nothing changes.                                                                                                                                                                                                                                                                                                             |
| Success: create      | "Account <username> created." followed by the one-time setup link, shown once, with "Copy link" and: "Give this link to the account holder. It works once and expires in 24 hours. It is not shown again. No email is sent." For an admin: "<username> will set a password and set up an authenticator using this link." (AC-16.1, UX-D-12) |
| Success: disable     | "Account disabled. Existing sessions end on the next request."                                                                                                                                                                                                                                                                              |
| Success: reset       | "Reset link created for <username>." (draft copy, VM-55, G-18) followed by the link displayed once with "Copy link" and the same text as for create (AC-16.2).                                                                                                                                                                              |
| Success: role change | "Role changed. It takes effect on the next request and other sessions of this account are ended." (AC-16.8)                                                                                                                                                                                                                                 |
| Success: MFA reset   | "Authenticator reset. <username> must set it up again at next sign-in." (AC-16.9; pending UX-Q-56: if the PO decides that a one-time link is issued, this text and the C-7 reset row add the link display of "Success: reset")                                                                                                              |
| Success: unlock      | "Account unlocked." (AC-8.3)                                                                                                                                                                                                                                                                                                                |
| Step-up-required     | Admin creation, reset link, role change, MFA reset, account unlock (AC-8.5).                                                                                                                                                                                                                                                                |
| Leaving a link       | Confirmation of C-7; the link is never re-shown (UX-D-13).                                                                                                                                                                                                                                                                                  |
| Refused              | Last-admin guard VM-40.                                                                                                                                                                                                                                                                                                                     |
| Permission-denied    | S-18.                                                                                                                                                                                                                                                                                                                                       |

| Id    | Field and rule                                                                                  | Text                                                                                        | AC      |
| :---- | :---------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ | :------ |
| VM-37 | Role missing                                                                                    | "Choose a role."                                                                            | AC-16.3 |
| VM-38 | Username missing                                                                                | "Enter a username."                                                                         | AC-16.3 |
| VM-39 | Username duplicate                                                                              | "This username is already in use. Enter a different username."                              | AC-16.3 |
| VM-40 | Disable or demote the only active admin (AC-16.6 also names delete; S-15 has no delete control) | "This is the only active admin. Create or keep another admin before changing this account." | AC-16.6 |

No initial password exists, so password rules (VM-41, VM-42) apply on S-19 only (UX-D-12).
Accessibility: link is selectable text plus a Copy button with a status announcement "Link copied"; row actions have names including the username; confirmation dialogs (C-7) are focus-managed; status is text.

### S-16 Admin: Producer credentials

Purpose: create, rotate, revoke credentials (REQ-14, US-17).

| Data shown                                                                   | PRD source       |
| :--------------------------------------------------------------------------- | :--------------- |
| Credential name or id, tenant, status (active, in rotation overlap, revoked) | AC-17.1          |
| Permission: "Publish events to this tenant" (the only permission in v1)      | AC-17.1, UX-D-27 |
| Secret, shown once only at creation or rotation                              | AC-17.1          |
| Overlap expiry time (UTC) during rotation                                    | AC-17.2          |
| Revocation time, and statement "refused within 60 seconds"                   | AC-17.4          |

Actions: Create (step-up), Rotate (step-up), Revoke (confirmation). Pending: how a rotation overlap is shown (one row or two linked rows), which credential Revoke acts on during the overlap, and whether a credential has a name (UX-Q-59); whether the list is per tenant or all tenants (UX-Q-49; the Empty text below says "for this tenant" and is provisional until then). Rotation and revocation rules themselves are AC-17.2 and AC-17.4. A single permission only (PRD rev 12 (proposed) AC-17.7).

| State             | Behaviour                                                                                                                       |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | Busy indicator.                                                                                                                 |
| Empty             | "No producer credentials exist for this tenant."                                                                                |
| Error             | Generic error; nothing changes.                                                                                                 |
| Success: create   | "Credential created. Copy the secret now. It is shown once and cannot be shown again."                                          |
| Success: rotate   | "Credential rotated. The old and the new credential are both accepted until <time> UTC (up to 24 hours)." plus new secret once. |
| Success: revoke   | "Credential revoked. Publishes with it are refused within 60 seconds."                                                          |
| Step-up-required  | Create and rotate (AC-8.5).                                                                                                     |
| Leaving a secret  | Confirmation of C-7; the secret is never re-shown and a lost secret means a new one is issued (UX-D-13).                        |
| Permission-denied | S-18.                                                                                                                           |

| Id    | Rule              | Text               | AC      |
| :---- | :---------------- | :----------------- | :------ |
| VM-43 | Tenant not chosen | "Choose a tenant." | AC-17.1 |

There is no permission choice in v1; the former "no permission chosen" message is not needed (UX-D-27).
Accessibility: secret displayed as selectable text with a Copy button and "Secret copied" announcement; secret is not placed in the page title or URL; the once-only warning is text; confirmation dialogs (C-7) are focus-managed; status is text.

### S-17 Admin: Audit log viewer

Purpose: read and filter the audit trail (REQ-20, AC-14.3).

| Data shown                                                                          | PRD source       |
| :---------------------------------------------------------------------------------- | :--------------- |
| Columns: time (UTC), actor, action, target, outcome; 50 rows per page, newest first | AC-14.1, UX-D-28 |
| Aggregated refused-publish records with a count                                     | REQ-26, AC-14.6  |
| Filters: actor, action, tenant, date range                                          | AC-14.3          |
| Never shown: raw personal data, passwords, secrets, raw user ids                    | AC-14.1          |

Actions: Apply filters, Clear filters, next and previous page. No edit or delete control exists anywhere (AC-14.2). Pending: a tenant column and a count column for aggregated refused-publish records (UX-Q-60, also PI-17); the action and actor vocabulary of the filters, the content of "target" without raw user ids, and whether date filters are optional and inclusive (UX-Q-61); whether the viewer is global with a tenant filter or per tenant (UX-Q-49).

| State             | Behaviour                                                              |
| :---------------- | :--------------------------------------------------------------------- |
| Loading           | Busy indicator.                                                        |
| Empty             | "No audit records match these filters."                                |
| Error             | Generic read-only error with Retry.                                    |
| Success           | Matching records only. Opening the viewer is itself audited (AC-14.3). |
| Permission-denied | role "user" gets S-18 (403).                                           |
| Retention note    | "Audit records are kept for 12 months." (AC-14.2)                      |

| Id    | Rule                       | Text                                               | AC      |
| :---- | :------------------------- | :------------------------------------------------- | :------ |
| VM-45 | End date before start date | "The end date must be on or after the start date." | AC-14.3 |
| VM-46 | Date not valid             | "Enter a valid date."                              | AC-14.3 |

Accessibility: records in a table with headers; fixed newest-first order stated in text; filter labels; result count announced after filtering; pagination controls are keyboard operable and name the page; timestamps carry "UTC".

### S-18 Not found (shared refusal page)

Purpose: shared page for 403 or 404 on tenant data and admin functions (AC-7.1, AC-9.3, AC-14.3). Cross-tenant access always shows the same "not found" page (UX-D-29).
Data shown: heading and message only. No tenant name, no data.
Text: "Page not found. The page you asked for could not be found." Actions: go to S-4 (user) or S-8 (admin); sign out.
States: single state. The response status stays as the PRD states (403 or 404); only the page content is uniform. A refusal of an admin function by a "user" writes an audit entry (AC-9.3), invisible to the user.
Accessibility: heading receives focus on load; page title states "Page not found"; link names are descriptive.

### S-19 Set password via one-time link (and TOTP enrolment)

Purpose: landing for the one-time setup or reset link (AC-16.2, UX-D-12). The account holder sets a password and, for an admin, enrols TOTP (UX-D-12, UX-D-14). As written, S-19 always asks for a password and, for an admin, a code together. Whether it also needs a TOTP-only variant (for MFA reset) or a password-only variant (for an admin's credential reset) is pending UX-Q-56. This matches PRD rev 12 (proposed) AC-16.10 for the setup link, but AC-16.9 and AC-16.2 of that revision do not state what an MFA reset or an admin credential reset presents (G-15). Whether opening the link consumes it, the wording of the 10-minute notice, a visible countdown, and whether a password entered before expiry is kept: pending UX-Q-57. Until answered, VM-52 ("Open your setup link again") is provisional, because it assumes a link that is not yet consumed.
Data entered: new password, confirmation; for admins, the 6-digit code from the authenticator app. Enrolment content: a QR code and the key as text; the enrolment page expires after 10 minutes (UX-D-14).

| State                       | Behaviour                                                                          |
| :-------------------------- | :--------------------------------------------------------------------------------- |
| Loading                     | Busy indicator on submit; link validity checked on load.                           |
| Empty                       | Empty form.                                                                        |
| Error: link used or expired | "This link has expired or was already used. Ask an admin for a new one." (AC-16.2) |
| Error: password rule        | VM-41, VM-42.                                                                      |
| Error: mismatch             | VM-47 "The two passwords do not match." (derived from the form)                    |
| Error: TOTP code            | VM-4, VM-4a, VM-5 as on S-2.                                                       |
| Error: enrolment expired    | VM-52                                                                              |
| Success (user)              | "Password set. Sign in." then S-1. Other sessions of the account end (AC-16.8).    |
| Success (admin)             | "Password set and authenticator enrolled. Sign in." then S-1.                      |
| Permission-denied           | Not applicable (unauthenticated).                                                  |

| Id    | Rule                                 | Text                                                                                  | AC               |
| :---- | :----------------------------------- | :------------------------------------------------------------------------------------ | :--------------- |
| VM-41 | Password under 12 characters         | "The password must be at least 12 characters."                                        | AC-16.4          |
| VM-42 | Password on breached list            | "This password appears in a list of breached passwords. Choose a different password." | AC-16.4          |
| VM-47 | Confirmation differs                 | "The two passwords do not match."                                                     | AC-16.4          |
| VM-52 | Enrolment page older than 10 minutes | "This setup page has expired. Open your setup link again to restart."                 | AC-16.1, UX-D-14 |

Accessibility: both password fields labelled; the minimum length is stated in text before entry; paste and password managers allowed; errors linked to fields; no password in URL; the QR code has a text alternative and the key is copyable text (WCAG 1.1.1, 3.3.8); the 10-minute expiry is stated in text before it starts, and the user can restart it (WCAG 2.2.1).

## 5. Coverage

### 5.1 Story coverage

UI-facing stories: 13 (US-5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 17, 18, 19). Covered by a journey and at least one screen: 13. Coverage 100%.

| US      | Journey | Screens                  | ACs reachable on a screen                                                                                                 |
| :------ | :------ | :----------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| US-5    | J-5     | S-4, S-5                 | AC-5.1, 5.2 (loading, performance measured outside the UI), 5.3, 5.4 (screen part), 5.5, 5.6, 5.7                         |
| US-6    | J-6     | S-5                      | AC-6.1, 6.2                                                                                                               |
| US-7    | J-7     | S-4, S-5, S-18           | AC-7.1 (UI part), 7.2 (empty list part)                                                                                   |
| US-8    | J-8     | S-1, S-2, S-3, S-4, S-15 | AC-8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8 (AC-8.8 presentation and step-up failure limits pending design, CR-036, CR-029) |
| US-9    | J-9     | S-6, S-7, S-8, S-9, S-18 | AC-9.1 (tenant form; wrong-tenant dead letter shown in S-8, S-9), 9.2, 9.3, 9.4, 9.5                                      |
| US-10   | J-10    | S-8, S-9                 | AC-10.1, 10.2, 10.3 (expiry shown, removal observed), 10.4, 10.6                                                          |
| US-11   | J-11    | S-10, S-9, S-17          | AC-11.1, 11.2 (outcome display), 11.3 (via S-17), 11.4, 11.6, 11.7, 11.10                                                 |
| US-12   | J-12    | S-13                     | AC-12.2, 12.3, 12.5                                                                                                       |
| US-14   | J-14    | S-17, S-18               | AC-14.2 (no edit or delete control), 14.3                                                                                 |
| US-16   | J-16    | S-15, S-19, S-2          | AC-16.1, 16.2, 16.3, 16.4, 16.6, 16.8, 16.9                                                                               |
| US-17   | J-17    | S-16                     | AC-17.1, 17.2, 17.4 (action and message)                                                                                  |
| US-18   | J-18    | S-11                     | AC-18.1, 18.3, 18.4 (isolation shown by tenant-scoped list), 18.5, 18.7                                                   |
| US-19   | J-19    | S-12                     | AC-19.1, 19.3, 19.4 (tenant-scoped), 19.5, 19.6                                                                           |
| (US-13) | none    | S-14                     | AC-13.8 (not a listed UI-facing story, shown for information)                                                             |

### 5.2 ACs not reachable from a screen

Known non-UI gaps stated in the brief (not defects): AC-16.5 (one-time setup command), AC-16.7 (break-glass recovery), AC-14.7 (reviewed scripts).

Other ACs of UI-facing stories with no screen interaction, listed as gaps for verification by other means (API, CI, load, scan or restore tests), not defects:

| AC                                                                                 | Why no screen reaches it                                                                     |
| :--------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| AC-5.4 (API part)                                                                  | Contents of every query-endpoint response are an API test; the screens show no per-user data |
| AC-7.1 (direct API call part)                                                      | Direct call with tenant B id is an API test                                                  |
| AC-7.2 (CI suite, duplicate ids, DSAR isolation)                                   | Automated isolation suite; only the empty application list is visible                        |
| AC-8.1 (401 for API calls)                                                         | API behaviour; the redirect part is reachable (S-1)                                          |
| AC-9.1 (producer publish and dead-letter and nothing counted in the target tenant) | Messaging-layer behaviour; shown indirectly in S-8 and S-9                                   |
| AC-10.5                                                                            | Metrics scrape and health endpoint, no screen                                                |
| AC-11.5                                                                            | Backup purge after 35 days and ledger properties                                             |
| AC-11.8                                                                            | PII scan of export store and deduplication state                                             |
| AC-11.9                                                                            | Producer sends new events after erasure                                                      |
| AC-12.1                                                                            | Purge job and backups                                                                        |
| AC-12.4                                                                            | Restore procedure                                                                            |
| AC-14.1                                                                            | Audit write within 5 seconds (record content is visible in S-17, timing is not)              |
| AC-14.4                                                                            | Deployment-configuration load audit, no screen                                               |
| AC-14.5                                                                            | 12-month deletion of disabled-account personal data                                          |
| AC-14.6                                                                            | Load test of refused-publish audit rate                                                      |
| AC-17.3                                                                            | Publish with old credential after overlap, messaging layer                                   |
| AC-17.5                                                                            | Authorisation at publish time for in-flight events                                           |
| AC-17.6                                                                            | Unknown credential publish, messaging layer                                                  |
| AC-18.2                                                                            | Producer events after objection and restore                                                  |
| AC-18.6                                                                            | Rectification response is a documented process; no screen exists (PRD scope, Section 10)     |
| AC-19.2                                                                            | Producer sends new event for restricted subject                                              |
| AC-19.7                                                                            | Restore keeps restriction entries                                                            |

## 6. Open questions

### 6.1 Deferred to Phase 4

Three questions remain open from round 1. Each is deferred to Phase 4 and tied to a tracked finding; the affected screens show a "pending design" placeholder state (C-6). They are not resolved here.

| Id               | Question                                                                                                                                                                                                                                            | Status                                              | Screens with a pending-design state |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------- | :---------------------------------- |
| UX-Q-3 (CR-029)  | What happens when step-up (or TOTP) fails repeatedly: do failed step-up codes count to the 5-in-15-minutes lockout, does reaching the limit end the session, and what does S-3 show? AC-8.3 says a lockout never applies to an established session. | Deferred to Phase 4, tied to tracked finding CR-029 | S-2, S-3, J-8                       |
| UX-Q-5 (CR-036)  | What does a user see under the source and global throttle, how long should they wait, what is a "source", and how is throttle engagement shown to admins?                                                                                           | Deferred to Phase 4, tied to tracked finding CR-036 | S-1 (VM-3 provisional), J-8         |
| UX-Q-20 (CR-048) | Restriction list versus erasure, retention purge and subject access: does erasure or objection remove a restriction entry, does retention purge apply to restricted data, does an access export include restricted events?                          | Deferred to Phase 4, tied to tracked finding CR-048 | S-10, S-12, S-13, J-11, J-12, J-19  |

### 6.2 Open questions raised in revision 3 (from the prototype gap analysis)

Status of every question below: open, awaiting the Product Owner / UX Lead. The "proposed default" is the gap report's suggestion or the nearest reading of the PRD; it is a proposal, not a decision, and the affected spec text is marked "pending UX-Q-n". PRD Q-50 and Q-51 are questions in PRD rev 12 (proposed), written "PRD Q-n" to avoid confusion with UX-Q-n.

| Id      | Gap        | Question and options                                                                                                                                                                                                                                                                                                            | Proposed default                                                                                                                                                                                                                                                          | Pending in                    |
| :------ | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------- |
| UX-Q-31 | G-1        | Can admin accounts hold entitlements? (a) No: admins see all tenants in S-4/S-5 and S-7 lists user accounts only; (b) yes: admins need entitlements like users and S-7 lists admin accounts too.                                                                                                                                | (a) for S-7 listing user accounts only; the admin dashboard scope follows the PO answer (PI-1).                                                                                                                                                                           | S-4, S-5, S-7                 |
| UX-Q-32 | G-2        | Does "last 7 days" include the current, incomplete UTC day? (a) No: the 7 complete UTC days ending yesterday, today not selectable; (b) yes: includes today.                                                                                                                                                                    | (a)                                                                                                                                                                                                                                                                       | S-5, J-5                      |
| UX-Q-33 | G-3        | Which date control and format? (a) native date picker, ISO format YYYY-MM-DD, whole days only (VM-10 dropped); (b) free text with validation (VM-10 kept).                                                                                                                                                                      | (a)                                                                                                                                                                                                                                                                       | S-5, S-17                     |
| UX-Q-34 | G-3        | Unit of the range limit in VM-8: (a) 396 days, as retention (VM-36, Q-40); (b) 13 calendar months.                                                                                                                                                                                                                              | (a), one limit in days for S-5 and S-13                                                                                                                                                                                                                                   | S-5, J-6                      |
| UX-Q-35 | G-3        | When the comparison's previous period starts before the retention horizon: (a) show "n/a" for the comparison; (b) block the comparison with a message; (c) compare only the available part.                                                                                                                                     | (a)                                                                                                                                                                                                                                                                       | S-5                           |
| UX-Q-36 | G-4        | What does clearing a filter mean for application, start and end (always a value)? (a) reset to the UX-D-7 defaults, "Clear all" returns all filters to defaults, start and end are one "date range" chip; (b) "Clear all" keeps the chosen application.                                                                         | (a)                                                                                                                                                                                                                                                                       | S-5, J-6                      |
| UX-Q-37 | G-4        | Does the compare toggle act at once or only after Apply?                                                                                                                                                                                                                                                                        | Acts at once                                                                                                                                                                                                                                                              | S-5                           |
| UX-Q-38 | G-4        | When one event type is selected, does "Top 10 event types" (a) hide, or (b) show that single type?                                                                                                                                                                                                                              | (a) hide                                                                                                                                                                                                                                                                  | S-5                           |
| UX-Q-39 | G-5        | Marker text for a complementary-suppressed cell (which may hold 5 or more users).                                                                                                                                                                                                                                               | "Suppressed (to protect another value)"                                                                                                                                                                                                                                   | S-5                           |
| UX-Q-40 | G-5        | Which figures and breakdown dimensions can be suppressed in v1 (KPIs, daily series, top 10, which breakdowns), and how is an anonymous-only cell laid out (separate row or flag)?                                                                                                                                               | Every cell derived from fewer than 5 users or, for anonymous-only cells, fewer than 5 events (AC-5.6, AC-5.7, "every view of that cell"); v1 breakdowns: country, browser/OS family, event type; anonymous-only as a labelled row. The prototype only suppressed country. | S-5                           |
| UX-Q-41 | G-5        | When a compared cell is suppressed and the previous value is zero, which shows: "—" (suppressed) or "n/a"?                                                                                                                                                                                                                      | Suppressed wins: "—"                                                                                                                                                                                                                                                      | S-5                           |
| UX-Q-42 | G-6        | When the idle warning is due while a step-up, confirmation or one-time secret dialog is open: (a) the warning shows over it and the open dialog and its input stay; (b) it replaces it and discards the pending action; (c) it queues behind it. State also in the warning that a displayed secret is lost if the session ends. | (a), with the warning naming the loss of a displayed secret                                                                                                                                                                                                               | C-6, S-3, S-15, S-16          |
| UX-Q-43 | G-8        | Order of validation, reason entry, refusal check, step-up and confirmation.                                                                                                                                                                                                                                                     | Validate and reason first, then step-up, then confirmation, then execute                                                                                                                                                                                                  | C-3, S-9, S-10 to S-16        |
| UX-Q-44 | G-8        | Which further actions get a C-7 confirmation: Run erasure (S-10), Record objection (S-11), Remove allow-list key (S-14), Change role (S-15)?                                                                                                                                                                                    | Run erasure, Record objection and Remove allow-list key yes; Change role no                                                                                                                                                                                               | C-7, S-10, S-11, S-14, S-15   |
| UX-Q-45 | G-9        | What does the system check a verification reference against (VM-22, VM-25, VM-30), given coverage is also a per-pair checkbox? (a) nothing: the checkbox is the only control and VM-22/25/30 are dropped or server-only; (b) a server-side check defined in Phase 4. Also: outcome when every pair is refused.                  | (a) checkbox only in the UI; VM-22/25/30 kept as server-refusal texts; all refused: nothing runs, refused pairs listed, message "No pair could be processed. Nothing was run."                                                                                            | S-10, S-11, S-12              |
| UX-Q-46 | G-9        | Removal of a suppression or restriction entry: how is the entry identified, is a coverage checkbox needed, and what is the S-11 success text?                                                                                                                                                                                   | Identify by masked reference and date added; new verification reference required, no coverage checkbox; S-11 text "Entry removed. New events for the subject are stored again."                                                                                           | S-11, S-12, J-18, J-19        |
| UX-Q-47 | G-10       | Request list per tenant (masked reference, time, status, expiry) as the anchor for status, download, expiry and re-run? Does a re-run use the stored request without re-entering user ids? What can the admin do after a failed export?                                                                                         | Yes to the list; re-run uses the stored request; after a failed export the admin runs access again                                                                                                                                                                        | S-10, J-11                    |
| UX-Q-48 | G-11       | How is the tenant chosen on S-9, S-11, S-12, S-13, S-14? A shared selector: default, persistence between screens.                                                                                                                                                                                                               | One selector in the admin navigation, no default (must choose), kept for the session                                                                                                                                                                                      | S-9, S-11 to S-14             |
| UX-Q-49 | G-11       | Are S-16 and S-17 per tenant or global?                                                                                                                                                                                                                                                                                         | Both global: S-16 lists all tenants with a tenant column (Empty text "No producer credentials exist."); S-17 global with a tenant filter                                                                                                                                  | S-16, S-17                    |
| UX-Q-50 | G-12       | Units for throughput and lag in S-8.                                                                                                                                                                                                                                                                                            | Events per minute; seconds                                                                                                                                                                                                                                                | S-8                           |
| UX-Q-51 | G-12       | May an unparseable dead letter be selected for Replay or Discard?                                                                                                                                                                                                                                                               | Discard yes, Replay not offered                                                                                                                                                                                                                                           | S-9                           |
| UX-Q-52 | G-12       | May several masked values of one event be revealed at once?                                                                                                                                                                                                                                                                     | No: one at a time                                                                                                                                                                                                                                                         | S-9                           |
| UX-Q-53 | G-12       | Does S-9 show an exact expiry time (dead-lettered time plus 7 days) and how are very long lists paged?                                                                                                                                                                                                                          | Exact time in UTC; 50 per page as UX-D-28                                                                                                                                                                                                                                 | S-9                           |
| UX-Q-54 | G-14       | Which S-15 actions apply to which account status? Can a disabled account be enabled?                                                                                                                                                                                                                                            | No enable action in v1; Disable for active or locked; Reset credential and Change role for non-disabled; Unlock for locked only; Reset MFA for admins only                                                                                                                | S-15                          |
| UX-Q-55 | G-14       | Change role: role selector, and what promotion (user to admin: TOTP enrolment, link) and demotion require.                                                                                                                                                                                                                      | Role selector; promotion issues a one-time link for TOTP enrolment only (the TOTP-only variant of UX-Q-56); demotion removes admin access                                                                                                                                 | S-15, J-16                    |
| UX-Q-56 | G-14, G-15 | After an MFA reset (and for an admin credential reset), how does the holder re-enrol? (a) the reset issues a one-time link (24 h, shown once) and S-19 has a TOTP-only variant; password-only variant for credential reset of an existing admin; (b) enrolment happens at next sign-in on S-2 after the password, with no link. | (a): option (b) lets anyone with the password enrol a new device. Needs PRD change (PI-22)                                                                                                                                                                                | S-2, S-15, S-19, J-16         |
| UX-Q-57 | G-15       | Is the link consumed when opened or only on successful completion? Wording of the 10-minute notice, visible countdown, and is the password kept if enrolment expires?                                                                                                                                                           | Consumed only on success; notice "This setup page expires in 10 minutes. You can restart it."; no countdown; nothing saved until both steps succeed                                                                                                                       | S-19, VM-52                   |
| UX-Q-58 | G-16       | Which exits count as leaving a one-time secret or link display (Done control, in-app navigation, sign-out, reload, tab close, session end)?                                                                                                                                                                                     | A visible "Done" control, in-app navigation and sign-out trigger the confirmation; reload and tab close use the browser's generic prompt; session end loses the secret                                                                                                    | C-7, S-15, S-16               |
| UX-Q-59 | G-17       | S-16 rotation: one row or two linked rows; which row Revoke acts on; does a credential have a name?                                                                                                                                                                                                                             | Two linked rows (old: "in overlap until", new: active); Revoke acts on the chosen row; no name in v1, identified by id                                                                                                                                                    | S-16                          |
| UX-Q-60 | G-17       | Add a tenant column and a count column (aggregated refused-publish) to S-17?                                                                                                                                                                                                                                                    | Yes to both (resolves PI-17)                                                                                                                                                                                                                                              | S-17                          |
| UX-Q-61 | G-17       | Action and actor vocabulary of the S-17 filters, content of "target" without raw user ids, and are date filters optional and inclusive?                                                                                                                                                                                         | Vocabulary from the audit event catalogue (Phase 4); target is a masked reference; dates optional, inclusive, whole UTC days                                                                                                                                              | S-17                          |
| UX-Q-62 | G-18       | What does Retry do on a failed write?                                                                                                                                                                                                                                                                                           | Re-run the last request with input kept, asking step-up again if needed                                                                                                                                                                                                   | C-6                           |
| UX-Q-63 | G-14, G-18 | Format rules: privacy-notice URL schemes; allow-list key first character (VM-50); end-user id format; username length and characters.                                                                                                                                                                                           | https only; key `^[a-z][a-z0-9_]{0,63}$`; user id free text 1 to 200 characters; username 3 to 40 characters of lowercase letters, digits and hyphens (as tenant id, UX-D-16)                                                                                             | S-6, S-10 to S-12, S-14, S-15 |

Dependencies on PRD rev 12 (proposed, HG-C-2): PRD Q-50 (step-up for issuing the setup link of a "user" account) affects C-3, S-15, J-16 and PI-4; PRD Q-51 (tablet browsers in scope) affects UX-D-30, S-5 accessibility and PI-19. Both are unanswered; this document keeps its own text and does not assume either default.

## 7. Decisions log (round 1, 2026-10-29)

Source: Product Owner / UX Lead answered "Accept all" to the orchestrator's recommendations. UX-D-n is the answer to UX-Q-n. Interpretation notes are marked "Reading".

| Id      | Decision                                                                                                                                                                                                                                    | Applied in                                                      |
| :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------- |
| UX-D-1  | Proposed copy accepted as draft; final copy approved at HG-2; English only.                                                                                                                                                                 | Scope rules, Section 4                                          |
| UX-D-2  | Admins can also use the dashboard; admin landing is the health view (S-8); persistent side navigation in the admin area. Reading: an admin sees dashboard data under the same entitlement rule (REQ-9); not stated by the answer, see PI-1. | Section 1, S-4, S-5, S-8, J-8                                   |
| UX-D-3  | Deferred to Phase 4 (CR-029).                                                                                                                                                                                                               | Section 6                                                       |
| UX-D-4  | Generic sign-in failure message; a lock and the remaining time are not revealed.                                                                                                                                                            | S-1, S-2, J-8                                                   |
| UX-D-5  | Deferred to Phase 4 (CR-036).                                                                                                                                                                                                               | Section 6                                                       |
| UX-D-6  | Warning 2 minutes before the 30-minute idle timeout with a "Stay signed in" action; unsaved input is not preserved.                                                                                                                         | C-6, J-8                                                        |
| UX-D-7  | Overview defaults: first application alphabetically, last 7 days, all event types.                                                                                                                                                          | S-5, J-5                                                        |
| UX-D-8  | After step-up, the interrupted action resumes with its input kept.                                                                                                                                                                          | C-3, S-3, J-8                                                   |
| UX-D-9  | Previous period = same length immediately before the range; percent change from zero shows "n/a".                                                                                                                                           | S-5, J-6                                                        |
| UX-D-10 | If either compared cell is suppressed, the comparison shows "—" with a tooltip explaining suppression.                                                                                                                                      | S-5, J-6                                                        |
| UX-D-11 | Users see application name and department owner only.                                                                                                                                                                                       | S-4                                                             |
| UX-D-12 | No initial password; a new account gets a one-time setup link (24 h) shown once to the admin; on the S-19 landing the user sets a password and, for admins, enrols TOTP.                                                                    | S-15, S-19, J-16                                                |
| UX-D-13 | Confirmation before leaving a one-time secret or link display; it can never be re-shown; a lost secret means issuing a new one.                                                                                                             | C-7, S-15, S-16, J-17                                           |
| UX-D-14 | 6-digit TOTP; enrolment shows a QR code plus the key as text; the enrolment page expires after 10 minutes.                                                                                                                                  | S-2, S-19                                                       |
| UX-D-15 | Every chart has a data-table alternative.                                                                                                                                                                                                   | S-5                                                             |
| UX-D-16 | Tenant id: lowercase letters, digits and hyphens, 3 to 40 characters, immutable; department owner at most 100 characters; privacy notice is a URL, editable and audited.                                                                    | S-6 (VM-14a to VM-14c)                                          |
| UX-D-17 | User ids are visible only during entry; lists show only counts and a masked request reference.                                                                                                                                              | C-4, S-10, S-11, S-12                                           |
| UX-D-18 | Confirmation step (in addition to step-up) for discard, revoke, disable, list-entry removal and MFA reset. Reading: "revoke" applies to producer credentials and to user entitlements; order step-up then confirmation.                     | C-7, S-7, S-9, S-11, S-12, S-15, S-16                           |
| UX-D-19 | Health view auto-refreshes every 30 s with a pause control; an unavailable tenant shows as "unknown".                                                                                                                                       | S-8                                                             |
| UX-D-20 | Deferred to Phase 4 (CR-048).                                                                                                                                                                                                               | Section 6                                                       |
| UX-D-21 | Reveal reason 10 to 500 characters; revealed value visible for 60 s, can be re-hidden, every reveal audited.                                                                                                                                | S-9 (VM-17a)                                                    |
| UX-D-22 | Export status (queued, generating, ready, failed) updates every 10 s.                                                                                                                                                                       | S-10, J-11                                                      |
| UX-D-23 | Per-store outcome shown; failed stores can be re-run for erasure, matching objection.                                                                                                                                                       | S-10, J-11                                                      |
| UX-D-24 | Free-text verification reference up to 100 characters, plus a per-pair checkbox confirming the reference covers that tenant; at most 20 pairs per request; refused pairs are listed.                                                        | S-10, S-11, S-12 (VM-19a, VM-22a to VM-22c, VM-27a/b, VM-32a/b) |
| UX-D-25 | Retention confirmation shows the number of events and the date range to be purged.                                                                                                                                                          | S-13, J-12                                                      |
| UX-D-26 | Allow-list keys are lowercase snake_case, at most 64 characters; the screen shows a personal-data warning.                                                                                                                                  | S-14 (VM-50, VM-51)                                             |
| UX-D-27 | One producer-credential permission in v1: "publish events to this tenant".                                                                                                                                                                  | S-16, J-17                                                      |
| UX-D-28 | Audit log: 50 rows per page, newest first; columns time, actor, action, target, outcome.                                                                                                                                                    | S-17, J-14                                                      |
| UX-D-29 | Cross-tenant access always shows the same "not found" page. Reading: the same page is used for every refusal on S-18 (the HTTP status stays as in the PRD).                                                                                 | S-18, J-7                                                       |
| UX-D-30 | Latest two versions of Chrome, Edge, Firefox and Safari; desktop and tablet; reflow at 400% zoom (WCAG 2.2 AA).                                                                                                                             | S-5 accessibility; all screens                                  |

## 8. PRD impacts (HG-C candidates)

The UX answers below conflict with, or add to, approved PRD text. The UX answer is kept in this document. Nothing here is resolved, and `docs/requirements/**` is unchanged. Type: C = conflicts with PRD text, A = adds behaviour the PRD does not state.

| Id    | Decision                      | Type | Affected PRD IDs                                             | Note                                                                                                                                                                                                                                                                                                                                      |
| :---- | :---------------------------- | :--- | :----------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PI-1  | UX-D-2                        | A    | AC-8.2, AC-8.4, REQ-13, REQ-9, AC-9.2, US-8                  | PRD defines the landing for role "user" only and does not say admins use the dashboard or have entitlements. Admin landing on S-8 is new.                                                                                                                                                                                                 |
| PI-2  | UX-D-6                        | A    | AC-8.2                                                       | Adds a 2-minute warning and a "Stay signed in" action; unsaved input not preserved.                                                                                                                                                                                                                                                       |
| PI-3  | UX-D-9, UX-D-10               | A    | AC-6.2, AC-5.6                                               | Adds "n/a" and "—" rules for the comparison.                                                                                                                                                                                                                                                                                              |
| PI-4  | UX-D-12                       | C    | AC-16.1, AC-16.2, AC-16.9, REQ-24, REQ-27                    | PRD issues a one-time link only for reset, and says MFA enrolment occurs in the setup command and in admin account creation. UX: no initial password, setup link at creation, TOTP enrolment on S-19. Whether creating a "user" account (no step-up in AC-16.1) issuing a link needs step-up is not stated.                               |
| PI-5  | UX-D-13                       | A    | AC-16.2, AC-17.1                                             | Adds a leave-confirmation and "never re-shown".                                                                                                                                                                                                                                                                                           |
| PI-6  | UX-D-14                       | A    | AC-8.4, AC-16.1, AC-16.9, NFR-10                             | Adds 6-digit code and a 10-minute enrolment page expiry.                                                                                                                                                                                                                                                                                  |
| PI-7  | UX-D-16                       | C    | REQ-5, AC-2.1, AC-9.1, AC-9.4, AC-9.5, NFR-23                | PRD allows a privacy-notice "URL or reference"; UX allows a URL only. Also adds tenant id format and immutability, and a 100-character owner limit.                                                                                                                                                                                       |
| PI-8  | UX-D-18                       | A    | AC-10.2, AC-16.2, AC-16.9, AC-17.4, AC-18.3, AC-19.5, AC-9.2 | Confirmation steps in addition to step-up; the PRD specifies only AC-12.5.                                                                                                                                                                                                                                                                |
| PI-9  | UX-D-19                       | C    | AC-10.1                                                      | AC-10.1 requires refresh at least every 30 seconds; a pause control means a paused view is not refreshed.                                                                                                                                                                                                                                 |
| PI-10 | UX-D-21                       | A    | AC-10.4                                                      | Adds reason length 10 to 500, a 60-second visibility limit and re-hide.                                                                                                                                                                                                                                                                   |
| PI-11 | UX-D-22                       | A    | AC-11.1                                                      | Adds export status values and a 10-second update.                                                                                                                                                                                                                                                                                         |
| PI-12 | UX-D-23                       | A    | AC-11.2, AC-18.7                                             | AC-11.2 has no failure or re-run rule for plain erasure; AC-18.7 has it for objection.                                                                                                                                                                                                                                                    |
| PI-13 | UX-D-24                       | A    | AC-11.1, AC-18.5, AC-19.6, REQ-18, D-8                       | Adds a 100-character reference, a per-pair attestation checkbox, a 20-pair limit. The PRD requires the reference itself to cover each tenant; how the system verifies coverage beyond the checkbox is not stated.                                                                                                                         |
| PI-14 | UX-D-25                       | A    | AC-12.5                                                      | Defines "how much data" as number of events and date range.                                                                                                                                                                                                                                                                               |
| PI-15 | UX-D-26                       | A    | AC-13.8, AC-13.7, REQ-16                                     | Adds allow-list key format and length (64), and a warning.                                                                                                                                                                                                                                                                                |
| PI-16 | UX-D-27                       | C    | REQ-14, AC-17.1                                              | PRD refers to "the permissions each producer uses to publish"; v1 has a single permission.                                                                                                                                                                                                                                                |
| PI-17 | UX-D-28                       | A    | AC-14.1, AC-14.3                                             | Audit records carry tenant and the viewer filters by tenant, but the listed columns omit tenant.                                                                                                                                                                                                                                          |
| PI-18 | UX-D-29                       | A    | AC-7.1, AC-9.3, AC-14.3                                      | Uniform "not found" page; AC-9.3 and AC-14.3 speak of a refusal (403).                                                                                                                                                                                                                                                                    |
| PI-19 | UX-D-30                       | C    | NFR-14, Section 10 (out of scope: mobile clients)            | Adds supported browsers, tablet support and 400% reflow. Tablet support should be checked against "Mobile or native dashboard clients" being out of scope.                                                                                                                                                                                |
| PI-20 | UX-D-17                       | A    | AC-11.3                                                      | "Masked request reference" is not defined in the PRD; AC-11.3 names a request id.                                                                                                                                                                                                                                                         |
| PI-21 | UX-Q-47 (G-10)                | A    | AC-11.1, AC-11.3, AC-18.7                                    | If the PO accepts a per-tenant request list (masked reference, time, status, expiry) as the anchor for export status, download, expiry and re-run, the PRD needs a rule for it and for re-running erasure without the user id being entered again. Not decided.                                                                           |
| PI-22 | UX-Q-56, UX-Q-57 (G-14, G-15) | A    | AC-16.9, AC-16.2, AC-16.10                                   | PRD rev 12 (proposed) AC-16.9 says the admin re-enrols "on next sign-in (enrolment as in AC-16.10)" and AC-16.10 describes a link only for account creation. If the PO chooses a one-time link for MFA reset, a TOTP-only enrolment page, or consumption of the link only on success, AC-16.9 and AC-16.10 need those rules. Not decided. |
| PI-23 | UX-Q-55 (G-14)                | A    | AC-16.1, AC-16.8                                             | Promotion of a "user" to "admin" (TOTP enrolment before first admin use) and demotion are not stated in AC-16.1 or AC-16.8. Not decided.                                                                                                                                                                                                  |
| PI-24 | UX-Q-34, UX-Q-35 (G-3)        | C    | REQ-12, AC-6.2                                               | The PRD gives the range limit as "13 months" while retention is defined as 396 days (Q-40); the two can differ by up to two days. The behaviour of a comparison whose previous period starts before the retention horizon is not stated. Not decided.                                                                                     |

Revision 3 notes on existing rows (no new row needed): PI-1 also covers whether admins hold entitlements (UX-Q-31). PI-8 would be extended by any confirmation added under UX-Q-44. PI-13 also covers the question of what the system checks a reference against, and the removal flow (UX-Q-45, UX-Q-46). PI-17 also covers the count column (UX-Q-60). Rows PI-4, PI-7, PI-9, PI-16 and PI-19 are applied in PRD rev 12 (proposed, HG-C-2, not yet approved); until that revision is approved by HG-C they remain candidates here, and PRD Q-50 and Q-51 are still open.

## 9. Appendix: questions as originally asked (superseded by Sections 6 and 7)

The wording of the thirty questions as first raised on 2026-10-28, kept for traceability. Answers are in Section 7; only UX-Q-3, UX-Q-5 and UX-Q-20 remain open (Section 6).

| Id               | Question                                                                                                      |
| :--------------- | :------------------------------------------------------------------------------------------------------------ |
| UX-Q-1           | Is the proposed on-screen copy acceptable, who owns copy approval, and is English the only language?          |
| UX-Q-2           | Can an admin use the dashboard and have entitlements; what is the admin landing screen and navigation?        |
| UX-Q-3 (CR-029)  | What happens when step-up fails repeatedly; do failures count to the lockout; does the limit end the session? |
| UX-Q-4           | Should the locked-account message reveal the lock and the remaining time?                                     |
| UX-Q-5 (CR-036)  | What does a user see under the global throttle; what is a "source"; how is throttle engagement shown?         |
| UX-Q-6           | Idle expiry warning and preservation of unsaved input.                                                        |
| UX-Q-7           | Default application, date range and event type on the overview.                                               |
| UX-Q-8           | After step-up, resume the action with input kept or restart.                                                  |
| UX-Q-9           | Definition of "previous period"; percent change against zero.                                                 |
| UX-Q-10          | Comparison cells when a cell is suppressed.                                                                   |
| UX-Q-11          | Which tenant fields users see.                                                                                |
| UX-Q-12          | Initial password handling and one-time link landing flow.                                                     |
| UX-Q-13          | Confirmation before leaving a one-time secret or link; re-show.                                               |
| UX-Q-14          | TOTP code format, enrolment material, enrolment time limit.                                                   |
| UX-Q-15          | Text alternative for the time series chart.                                                                   |
| UX-Q-16          | Format and length rules for tenant id, owner, privacy notice; editability.                                    |
| UX-Q-17          | How user ids are displayed after entry.                                                                       |
| UX-Q-18          | Which destructive actions need a confirmation step.                                                           |
| UX-Q-19          | Health view refresh, pause control, unavailable tenant.                                                       |
| UX-Q-20 (CR-048) | Restriction list versus erasure, retention purge and subject access.                                          |
| UX-Q-21          | Reveal reason rules, visibility duration, re-hide.                                                            |
| UX-Q-22          | Export generation progress presentation.                                                                      |
| UX-Q-23          | Partial failure of an erasure run; re-run for erasure.                                                        |
| UX-Q-24          | Verification reference format, coverage capture, pair limit, refused pairs.                                   |
| UX-Q-25          | Unit and measure of "how much data will be purged".                                                           |
| UX-Q-26          | Allow-list key format, length, privacy warning.                                                               |
| UX-Q-27          | Names and set of producer-credential permissions.                                                             |
| UX-Q-28          | Audit log page size, sorting, columns.                                                                        |
| UX-Q-29          | Whether 403 and 404 for another tenant must look the same.                                                    |
| UX-Q-30          | Supported browsers, responsive and zoom expectations.                                                         |

## 10. Revision 3 change log (2026-10-29)

Input: `reports/ux/event-analytics-prototype-gaps.md` (G-1 to G-18; D-1 to D-8 are prototype defects and need no spec change). No UX-D decision was changed or added; no ID was renumbered. New: UX-Q-31 to UX-Q-63 (Section 6.2), PI-21 to PI-24 (Section 8), VM-53 to VM-55 (draft copy only).

| Gap  | Outcome                                                                               | Detail                                                                                                                                                                                                                                                                                                                  |
| :--- | :------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-1  | Fixed (REQ-9, AC-9.1) and UX-Q-31                                                     | An application is a tenant, one per tenant; the application name is the tenant id; S-6 needs no name field (S-4, S-6). Admin entitlements and S-7 admin listing: UX-Q-31.                                                                                                                                               |
| G-2  | Fixed (UX-D-7 "defaults on first open") and UX-Q-32                                   | J-5 conflict removed: a selection in S-4 wins, defaults apply on direct entry; sort key is tenant id. "Last 7 days" and the partial current day: UX-Q-32.                                                                                                                                                               |
| G-3  | Fixed (VM-7) and UX-Q-33, UX-Q-34, UX-Q-35                                            | Single-day range is valid. Date control and VM-10: UX-Q-33; 13 months versus 396 days: UX-Q-34 (PI-24); previous period before retention horizon: UX-Q-35.                                                                                                                                                              |
| G-4  | UX-Q-36, UX-Q-37, UX-Q-38                                                             | Clear semantics, compare toggle timing, top 10 with one event type.                                                                                                                                                                                                                                                     |
| G-5  | Fixed (AC-5.6 "every view of that cell", UX-D-10) and UX-Q-39, UX-Q-40, UX-Q-41       | Value cells in comparison mode show the marker. Marker text for the complementary cell, suppressible figures and dimensions, precedence versus "n/a": open.                                                                                                                                                             |
| G-6  | Fixed (C-6, AC-8.5, C-5, UX-D-6, UX-D-8) and UX-Q-42                                  | Session end redirects to S-1 with the banner on every screen; sign-out shows S-1 without the banner; "Stay signed in" does not renew step-up age; UX-D-6 (session end) and UX-D-8 (step-up) do not conflict; a displayed secret is lost. Dialog priority: UX-Q-42.                                                      |
| G-7  | Fixed (S-3 accessibility rules, C-3)                                                  | S-3 is a dialog; "Not required" and "Success" are not dialog states; VM-6 is a form-level message.                                                                                                                                                                                                                      |
| G-8  | Fixed (AC-8.5 list) and UX-Q-43, UX-Q-44                                              | The 16 actions are enumerated in C-3 with screens; non-listed actions named. Order of validation and step-up, and extra confirmations: open. Creation of a "user" account depends on PRD Q-50.                                                                                                                          |
| G-9  | UX-Q-45, UX-Q-46                                                                      | Coverage check behind VM-22/25/30, all-pairs-refused outcome, removal flow (PI-13 extended).                                                                                                                                                                                                                            |
| G-10 | Fixed (AC-11.1 "the export") and UX-Q-47                                              | One export and one outcome table per request; failed-export copy drafted (VM-53). Request list and re-run without user ids: UX-Q-47 (PI-21).                                                                                                                                                                            |
| G-11 | UX-Q-48, UX-Q-49                                                                      | Shared tenant selector; S-16 and S-17 scope. Empty text of S-16 marked provisional.                                                                                                                                                                                                                                     |
| G-12 | Fixed (AC-10.7 in PRD rev 12 (proposed), UX-D-19, scope rules) and UX-Q-50 to UX-Q-53 | S-8 state combinations defined; detail layout not decided here (visual design). Units, unparseable replay/discard, multi-reveal, expiry display and paging: open.                                                                                                                                                       |
| G-13 | Fixed (AC-12.5, AC-12.1, C-7)                                                         | "Destroys data" means an event older than the new value exists; count and range shown at confirmation after step-up; range is ingest-date bounds; zero events means no confirmation; dialog buttons are C-7 Confirm and Cancel.                                                                                         |
| G-14 | Fixed (AC-16.6, AC-14.5) and UX-Q-54, UX-Q-55, UX-Q-56, UX-Q-63                       | "Delete" has no S-15 control; VM-40 rule reworded. Status/action matrix, role change, admin reset TOTP, username rules: open. User-account creation step-up: PRD Q-50. PI-23.                                                                                                                                           |
| G-15 | UX-Q-56, UX-Q-57 (PI-22)                                                              | Checked against PRD rev 12 (proposed): AC-16.9 says re-enrol "on next sign-in (enrolment as in AC-16.10)" and AC-16.10 defines a link only at account creation, so neither issues a link for an MFA reset; S-2, S-15 and S-19 stay inconsistent until the PO answers. S-2 and S-19 text now says so; VM-52 provisional. |
| G-16 | Fixed (UX-D-13, C-7) and UX-Q-58                                                      | Confirmation is unconditional; J-17 wording and the C-7 text corrected. Exits and the "Done" control: UX-Q-58.                                                                                                                                                                                                          |
| G-17 | UX-Q-59, UX-Q-60, UX-Q-61                                                             | Rotation display and credential name, S-17 tenant and count columns (PI-17), filter vocabulary and date filters.                                                                                                                                                                                                        |
| G-18 | Fixed (C-6, UX-D-1, UX-D-16) and UX-Q-62, UX-Q-63                                     | Missing copy drafted: VM-53 (export failed), VM-54 (key removed), VM-55 (reset link created), S-8 error without stale data uses C-6 text; S-11 removal success pending UX-Q-46. Write-screen loading disables the form (C-6). Tenant id is not case-folded (VM-14a). Retry and format rules: open.                      |

Dependencies on PRD rev 12 (proposed, HG-C-2): AC-9.5/AC-9.6 (S-6), AC-10.7 (S-8), AC-16.10 (S-15, S-19) and AC-17.7 (S-16) match this document. PRD Q-50 (step-up for a "user" setup link) and PRD Q-51 (tablet scope) are unanswered and are marked where they apply (C-3, S-15, J-16, S-5 accessibility). If rev 12 is approved, the coverage table (5.1) should add AC-9.6 (US-9), AC-10.7 (US-10), AC-16.10 (US-16) and AC-17.7 (US-17); this was not done here because rev 12 is not approved.
