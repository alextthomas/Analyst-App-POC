# UX Specification: Event Analytics Platform (feature id: event-analytics)

Status: DRAFT, submitted for HG-2 review | Author: @alextthomasagent | Date: 2026-10-28
Approval: not approved (this document is never self-approved; HG-2 is held by the Product Owner)
Source: approved PRD `docs/requirements/event-analytics.md` (revision 11, HG-1, content as of commit cf5c048), `docs/project-charter.md`, `CLAUDE.md`. Review findings referenced: `reports/review/event-analytics-critical-cf5c048.json` (the report writes ids as `CR-event-analytics-029`; this document writes CR-029).

Scope rules for this document:

- It specifies screens, flows, states, message text and accessibility behaviour. It does not decide visual design, layout, component library, chart type or technology. Anything the PRD leaves open is an open question (UX-Q-n, Section 6) and is not decided here.
- All on-screen message text below is **proposed copy** (UX-Q-1). The PRD requires a message in several places but does not give the words. The text is a placeholder to make the ACs testable and needs PO approval. Rules and numbers inside messages come only from the PRD.
- Tracked findings CR-029, CR-036 and CR-048 are not resolved here. Where a screen touches them the screen says so and the point is an open question.
- No PRD file is modified.

## 1. Roles, navigation scope and conventions

| Role                       | Reaches                                                                                             | Source                 |
| :------------------------- | :-------------------------------------------------------------------------------------------------- | :--------------------- |
| Unauthenticated            | Sign-in (S-1) and set-password-by-link (S-19) only                                                  | AC-8.1                 |
| user (password only)       | Application list (S-4), Overview (S-5), Access refused (S-18)                                       | AC-8.2, AC-5.4, REQ-13 |
| admin (password plus TOTP) | Everything a user reaches is not specified for admins (UX-Q-2); admin screens S-6 to S-17 after MFA | AC-8.4, REQ-13         |

Conventions that apply to every screen unless a screen says otherwise:

- C-1 Times and dates are shown in UTC and labelled "UTC" (REQ-28, REQ-12).
- C-2 Admin screens are reachable only with a valid TOTP-verified admin session. A "user" opening one gets S-18 (AC-9.3).
- C-3 Actions on the REQ-27 / AC-8.5 list open step-up (S-3) when the last authentication is older than 5 minutes. The list is a minimum that design may extend, so this document marks the 16 listed actions only.
- C-4 Raw user ids typed into admin forms are never echoed in a success message, audit view or screen after submission beyond what the screen's data table states (AC-11.3, AC-18.3, AC-19.3). See UX-Q-17.
- C-5 Passwords, TOTP codes, credential secrets and one-time reset links never appear in any screen after their single display (AC-16.3, AC-17.1, AC-16.2).
- C-6 Generic states used in every screen table:
  - Loading: a visible and announced busy indicator in place of the content; controls that depend on the data are disabled.
  - Generic error (server or network failure): "Something went wrong. Your change was not saved. Try again. If the problem continues, contact a platform admin." (read-only screens: "Something went wrong. The data could not be loaded. Try again.") with a Retry action. No stack trace, no identifiers.
  - Session ended (idle 30 minutes, AC-8.2, or account disabled, AC-16.2): "Your session has ended. Sign in again." then S-1. Unsaved form input is not kept (UX-Q-6).

## 2. Screen inventory

| ID   | Screen                                            | Roles          | Stories                                                     |
| :--- | :------------------------------------------------ | :------------- | :---------------------------------------------------------- |
| S-1  | Sign-in                                           | all            | US-8                                                        |
| S-2  | Authenticator code (TOTP) challenge and enrolment | admin          | US-8, US-16                                                 |
| S-3  | Step-up re-authentication                         | admin          | US-8, US-9, US-10, US-11, US-12, US-16, US-17, US-18, US-19 |
| S-4  | Application list                                  | user           | US-7, US-8                                                  |
| S-5  | Application overview (filters, comparison)        | user           | US-5, US-6, US-7                                            |
| S-6  | Admin: Tenants                                    | admin          | US-9                                                        |
| S-7  | Admin: User entitlements                          | admin          | US-9                                                        |
| S-8  | Admin: Ingestion health                           | admin          | US-10                                                       |
| S-9  | Admin: Dead-letter events                         | admin          | US-10, US-11                                                |
| S-10 | Admin: Data-subject access and erasure            | admin          | US-11                                                       |
| S-11 | Admin: Objection (suppression list)               | admin          | US-18                                                       |
| S-12 | Admin: Restriction list                           | admin          | US-19                                                       |
| S-13 | Admin: Tenant retention                           | admin          | US-12                                                       |
| S-14 | Admin: Tenant allow-listed property keys          | admin          | (US-13, AC-13.8)                                            |
| S-15 | Admin: Accounts                                   | admin          | US-16, US-8                                                 |
| S-16 | Admin: Producer credentials                       | admin          | US-17                                                       |
| S-17 | Admin: Audit log viewer                           | admin          | US-14                                                       |
| S-18 | Access refused                                    | user, any      | US-7, US-9, US-14                                           |
| S-19 | Set password via one-time link                    | account holder | US-16                                                       |

S-14 is included because REQ-14 and AC-13.8 place allow-list management in the admin screen; US-13 is not in the UI-facing list, so it is shown for completeness and not counted in coverage.

## 3. Journeys (one per UI-facing story)

### J-5 (US-5): View the overview of an application

- Entry: S-4 after sign-in, selecting an entitled application.
- Steps: 1. Select application. 2. S-5 loads with the default range (UX-Q-7). 3. Total events, unique users, events-over-time and top 10 event types appear. 4. Suppressed cells show the suppressed marker and a statement that displayed cells may sum to less than the total.
- Exit: user changes filters (J-6), picks another application, or signs out.
- Error branches: no events in range, empty state (AC-5.3); query failure, generic error with Retry; range shorter than one whole UTC day, not selectable (AC-5.6); session ended, S-1; application not entitled, S-18 (J-7).

### J-6 (US-6): Filter and compare

- Entry: S-5.
- Steps: 1. Choose application, start date, end date, event type. 2. Apply. 3. All figures reflect exactly the filter; active filters are listed and each can be cleared, plus "Clear all". 4. Turn on "Compare with previous period". 5. Both periods and percentage change are shown.
- Exit: filters cleared or user leaves.
- Error branches: end before start, or range longer than 13 months, validation message, query not run (AC-6.2); comparison with a previous period that cannot be computed or is suppressed (UX-Q-9, UX-Q-10); query failure, generic error.

### J-7 (US-7): See only entitled applications

- Entry: S-4 or a direct URL or API call for another tenant.
- Steps: 1. S-4 lists only entitled applications. 2. Selecting one opens S-5.
- Exit: S-5, or S-4 empty state.
- Error branches: user entitled to none, empty application list (AC-7.2); request for tenant B by a user entitled to A only, S-18 and no tenant B data (AC-7.1); entitlement revoked mid-session, next query shows S-18 (effect within 60 s, AC-9.2).

### J-8 (US-8): Sign in, MFA, step-up, lockout

- Entry: any dashboard or admin URL without a session.
- Steps (user): 1. Redirect to S-1 (AC-8.1). 2. Enter username and password. 3. S-4 with entitled applications only and no admin function (AC-8.2).
- Steps (admin): 1. S-1 password. 2. S-2 TOTP code. 3. Admin screens. 4. On a REQ-27 action with last authentication older than 5 minutes, S-3 opens; on success the action continues, on failure it stays blocked (AC-8.5).
- Exit: signed in; or locked out; or signed out; session ends after 30 minutes idle (AC-8.2).
- Error branches: wrong password, generic failure; 5 consecutive failures in 15 minutes, account refused for 15 minutes then allowed automatically (AC-8.3); wrong TOTP counts together with password failures (AC-8.6); reused TOTP code rejected (AC-8.7); source throttle and global throttle refusal (AC-8.8, CR-036); correct password with no valid TOTP, no admin access (AC-8.4); failed step-up attempts (CR-029, UX-Q-3); unlock by another admin after step-up (S-15).

### J-9 (US-9): Manage tenants and entitlements

- Entry: admin menu, Tenants (S-6) or Entitlements (S-7).
- Steps (tenant): 1. New tenant. 2. Enter unique id, department owner, privacy-notice URL or reference. 3. Save. 4. Tenant appears in list with the privacy-notice reference (AC-9.5).
- Steps (entitlement): 1. Choose user and tenant. 2. Grant (step-up) or revoke. 3. Save. 4. Message states it takes effect for new queries within 60 seconds.
- Exit: list updated.
- Error branches: duplicate or missing field, field-level messages and nothing changes (AC-9.4); step-up fails, action not performed; user role opens an admin screen, S-18 and an audit entry (AC-9.3).

### J-10 (US-10): Monitor health and handle dead letters

- Entry: Ingestion health (S-8), then Dead-letter events (S-9).
- Steps: 1. S-8 shows throughput, lag, dead-letter count and refused-publish count per tenant, refreshed at least every 30 seconds. 2. Open a tenant's dead letters in S-9. 3. Select an event, step-up, view masked payload. 4. Optionally reveal one masked value with a reason and step-up. 5. Replay or discard selected events.
- Exit: list updated; actions audited.
- Error branches: unparseable body, never displayed and cannot be revealed (AC-10.6); replay of an event that still fails validation or is already stored (AC-10.2, AC-15.6); health data unavailable, error state; step-up fails; reason missing on reveal.

### J-11 (US-11): Run access and erasure for a subject

- Entry: Data-subject requests (S-10).
- Steps (access): 1. Enter verification reference. 2. Enter one or more (tenant, user id) pairs. 3. Step-up. 4. Run access. 5. Status while generating (within 15 minutes). 6. Download JSON; expires and is deleted after 7 days.
- Steps (erasure): as above, run erasure. Outcome per store is shown; note on unparseable dead letters (AC-11.7).
- Exit: result shown; audit entry written.
- Error branches: pair whose tenant is not covered by the verification reference, refused with message (AC-11.1); no data held, "no data is held" (AC-11.4); one store fails (UX-Q-23); step-up fails; same user id in another tenant, untouched (AC-11.6).

### J-12 (US-12): Set retention per tenant

- Entry: Tenant retention (S-13).
- Steps: 1. Choose tenant, current value in days shown. 2. Enter new value 1 to 396. 3. Save. 4. If shortening would destroy data: step-up, then a confirmation that states how much data will be purged; nothing is purged until confirmed (AC-12.5). 5. Success message states the change applies at the next purge run.
- Exit: saved or cancelled.
- Error branches: invalid value, field-level message and existing value unchanged (AC-12.3); confirmation cancelled, nothing changes; step-up fails.

### J-14 (US-14): Read the audit log

- Entry: Audit log (S-17).
- Steps: 1. Open viewer (the viewing is audited). 2. Filter by actor, action, tenant, date range. 3. Read matching records.
- Exit: leave viewer.
- Error branches: no matches, empty state; invalid date range, message; user role requests it, S-18 (AC-14.3).

### J-16 (US-16): Manage accounts

- Entry: Accounts (S-15).
- Steps: 1. Create account (username, role, initial password handling per UX-Q-12); admin creation needs step-up. 2. A new admin completes TOTP enrolment at first sign-in (S-2). 3. Disable, reset (step-up, one-time link shown once, 24 h, no email), change role (step-up), reset MFA of another admin (step-up), unlock account (step-up). 4. The holder of a reset link sets a password in S-19.
- Exit: list updated.
- Error branches: missing role or duplicate username (AC-16.3); password under 12 characters or on the breached list (AC-16.4); last active admin disable, delete or demote refused (AC-16.6); step-up fails; reset link used twice or after 24 hours (S-19).

### J-17 (US-17): Manage producer credentials

- Entry: Producer credentials (S-16).
- Steps: 1. Create credential for a tenant with permissions (step-up). 2. Secret shown once. 3. Rotate (step-up): both credentials accepted up to 24 hours, overlap expiry time shown. 4. Revoke: refused within 60 seconds.
- Exit: list updated, secret never shown again.
- Error branches: step-up fails; leaving the secret screen before copying (UX-Q-13); revoke confirmation cancelled.

### J-18 (US-18): Record an objection

- Entry: Objection (S-11).
- Steps: 1. Enter verification reference and (tenant, user id) pair. 2. Step-up. 3. Record. 4. Pair is on the suppression list and the erasure of AC-11.2 runs in the same flow. 5. Outcome per store is shown. 6. Removal of an entry needs a verification reference and step-up.
- Exit: outcome shown.
- Error branches: missing tenant or user id, tenant not covered, pair already listed (AC-18.5); erasure fails in one store, suppression stays in force and the erasure can be re-run after step-up (AC-18.7); removal without reference, refused.

### J-19 (US-19): Restrict processing of a subject

- Entry: Restriction list (S-12).
- Steps: 1. Enter verification reference and pair. 2. Step-up. 3. Add. 4. Stored events are excluded from every query started afterwards and kept. 5. Removal needs a verification reference and step-up.
- Exit: list updated.
- Error branches: missing field, tenant not covered, duplicate pair (AC-19.6); removal without reference refused (AC-19.5). The relation of restriction to erasure, retention and access is undecided (CR-048, UX-Q-20).

## 4. Screens

Message ids: VM-n. Every message is proposed copy (UX-Q-1).

### S-1 Sign-in

Purpose: authenticate a platform-managed account (AC-8.1, AC-8.2).
Data shown: username field, password field, messages. No analytics data.

| Field    | Source                                      |
| :------- | :------------------------------------------ |
| Username | REQ-13 (platform-managed accounts), AC-16.3 |
| Password | AC-8.2                                      |

Actions: Sign in. (No self-service reset: v1 sends no email, A-8.)

| State                         | Behaviour                                                                            |
| :---------------------------- | :----------------------------------------------------------------------------------- |
| Loading                       | Sign in button shows busy state and is disabled; announced "Signing in".             |
| Empty                         | Empty form. Reached by redirect: no message, no analytics data in the page (AC-8.1). |
| Error: wrong credentials      | VM-1                                                                                 |
| Error: locked                 | VM-2 (AC-8.3, AC-8.6). Lock never disables the account. UX-Q-4.                      |
| Error: throttled              | VM-3 (AC-8.8). CR-036, UX-Q-5.                                                       |
| Error: system                 | Generic error (C-6).                                                                 |
| Success (user)                | S-4.                                                                                 |
| Success (admin password step) | S-2.                                                                                 |
| Session ended                 | Banner "Your session has ended. Sign in again."                                      |
| Permission-denied             | Not applicable; unauthenticated users are redirected here (AC-8.1).                  |

Validation and messages:

| Id    | Field and rule                       | Text                                                                                                       | AC             |
| :---- | :----------------------------------- | :--------------------------------------------------------------------------------------------------------- | :------------- |
| VM-1  | Credentials wrong                    | "Sign-in failed. Check your username and password."                                                        | AC-8.2, AC-8.3 |
| VM-1a | Username empty                       | "Enter your username."                                                                                     | AC-8.2         |
| VM-1b | Password empty                       | "Enter your password."                                                                                     | AC-8.2         |
| VM-2  | 5 consecutive failures in 15 minutes | "Sign-in is not available for this account for 15 minutes. Try again later, or ask an admin to unlock it." | AC-8.3         |
| VM-3  | Source or global throttle            | "Too many sign-in attempts. Try again in a few minutes." (duration unstated pending CR-036)                | AC-8.8         |

Accessibility: both fields have visible labels and programmatic labels; first field receives focus on load; Enter submits; errors appear in a summary at the top that receives focus, plus text linked to the field with `aria-describedby`; error is not colour-only; password field allows paste and password managers (WCAG 3.3.8 accessible authentication); the busy state is announced politely; lock and throttle messages are text, not only a timer.
Findings touched: CR-036 (VM-3 wording, source undefined), CR-029 (lock messaging).

### S-2 Authenticator code (TOTP) challenge and enrolment

Purpose: second factor for admins (AC-8.4); first-time enrolment of a new admin (AC-16.1) and re-enrolment after an MFA reset (AC-16.9).
Data shown: code field; in enrolment, the enrolment material for the authenticator app (form of material, such as QR code or key, is a design decision, UX-Q-14).

Actions: Verify; (enrolment) confirm enrolment with a first valid code; Cancel and return to S-1.

| State                   | Behaviour                                                                            |
| :---------------------- | :----------------------------------------------------------------------------------- |
| Loading                 | Verify disabled and busy. In enrolment, loading the enrolment material is announced. |
| Empty                   | Empty code field.                                                                    |
| Error: wrong code       | VM-4; counts towards lockout (AC-8.6).                                               |
| Error: replayed code    | VM-5 (AC-8.7).                                                                       |
| Error: locked           | VM-2 text (AC-8.6).                                                                  |
| Error: no code supplied | Admin cannot reach any admin function (AC-8.4); stays on S-2.                        |
| Error: system           | Generic error.                                                                       |
| Success                 | Admin screens (first screen UX-Q-2).                                                 |
| Enrolment success       | Confirmation "Authenticator enrolled." then admin screens (AC-16.1).                 |
| Re-enrolment required   | Notice "An admin reset your authenticator. Set it up again to continue." (AC-16.9).  |
| Permission-denied       | A user-role account never sees S-2.                                                  |

| Id    | Rule                                                             | Text                                                                              | AC             |
| :---- | :--------------------------------------------------------------- | :-------------------------------------------------------------------------------- | :------------- |
| VM-4  | Code wrong or expired                                            | "That code is not valid. Check the code in your authenticator app and try again." | AC-8.4, AC-8.6 |
| VM-4a | Code empty or not the expected format (format unstated, UX-Q-14) | "Enter the code from your authenticator app."                                     | AC-8.4         |
| VM-5  | Code already used within its time step                           | "That code was already used. Wait for the next code and try again."               | AC-8.7         |

Accessibility: label "Authenticator code" with hint text; numeric entry allowed with `autocomplete="one-time-code"`; no time limit imposed by the screen beyond the code step (state in UX-Q-14); enrolment material has a text alternative that can be copied (a QR image alone fails WCAG 1.1.1 and 3.3.8); error summary receives focus.
Findings touched: CR-029 (attempt limits and what happens to the session, UX-Q-3).

### S-3 Step-up re-authentication

Purpose: re-confirm password and TOTP when the last authentication is older than 5 minutes before one of the 16 REQ-27 actions (AC-8.5).
Data shown: the action being confirmed (name only, no sensitive values), password field, TOTP field.
Actions: Confirm; Cancel (the action is not performed).

| State                          | Behaviour                                                                                                                                                   |
| :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading                        | Confirm disabled and busy.                                                                                                                                  |
| Empty                          | Empty fields; text "Confirm it is you to continue: <action>".                                                                                               |
| Not required                   | When the last authentication is 5 minutes or less old, S-3 is not shown.                                                                                    |
| Error: wrong password or code  | VM-6. Limits: CR-029.                                                                                                                                       |
| Error: replayed code           | VM-5.                                                                                                                                                       |
| Error: locked or session ended | Per CR-029 an open point: whether five failures end the session and lock the account is not stated in any AC (UX-Q-3). Interim behaviour is none specified. |
| Error: system                  | Generic error.                                                                                                                                              |
| Success                        | Returns to the blocked action, which continues; step-up is audited (AC-8.5). Whether typed input is kept is UX-Q-8.                                         |
| Permission-denied              | A user-role session cannot reach it.                                                                                                                        |

| Id    | Rule                   | Text                                                                             | AC             |
| :---- | :--------------------- | :------------------------------------------------------------------------------- | :------------- |
| VM-6  | Password or code wrong | "Confirmation failed. Check your password and authenticator code and try again." | AC-8.5, AC-8.6 |
| VM-6a | Either field empty     | "Enter your password and your authenticator code."                               | AC-8.5         |

Accessibility: presented so keyboard focus moves into it when it opens and returns to the triggering control on close; background content is not operable while it is open; Escape cancels; labels as in S-1 and S-2; the action name is announced when it opens.
Findings touched: CR-029.

### S-4 Application list

Purpose: show the user's entitled applications (AC-8.2, AC-7.2).
Data shown: application name per entitled tenant (REQ-9; tenant id and department owner are admin-held fields AC-9.1; which of them users see is UX-Q-11).
Actions: open an application (S-5); sign out.

| State                   | Behaviour                                                                                |
| :---------------------- | :--------------------------------------------------------------------------------------- |
| Loading                 | Busy indicator in the list area.                                                         |
| Empty (no entitlements) | "You are not entitled to any application yet. Ask a platform admin for access." (AC-7.2) |
| Error                   | Generic read-only error with Retry.                                                      |
| Success                 | List of entitled applications only, no admin function visible (AC-8.2).                  |
| Partial                 | Not applicable.                                                                          |
| Permission-denied       | Unauthenticated: S-1 (AC-8.1).                                                           |

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
| Previous-period values and percentage change                    | AC-6.2                                                                                             |
| Active filters list                                             | AC-6.1                                                                                             |
| Suppressed marker and sum statement                             | AC-5.1, AC-5.6, AC-5.7, REQ-29                                                                     |
| Never shown                                                     | per-user records, raw user id, pseudonymous id (AC-5.4, REQ-11, REQ-25)                            |

Filters: application, start date, end date (whole UTC days only), event type, compare toggle. Actions: apply, clear one filter, clear all, toggle comparison.

| State                 | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading               | Busy indicator for the figures; announced; target render within 2 seconds at p95 for 30 days (AC-5.2, measured, not enforced by the screen).                                                                                                                                                                                                                                                                                                                              |
| Empty                 | "No events were recorded for this application in the selected range." No error shown and none logged (AC-5.3).                                                                                                                                                                                                                                                                                                                                                            |
| Error                 | Generic read-only error with Retry. A 403 or 404 for a tenant goes to S-18.                                                                                                                                                                                                                                                                                                                                                                                               |
| Success               | All four figures and series.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Partial (suppression) | Suppressed cells show the marker "Suppressed (fewer than 5 users)" instead of a number, in every view of that cell; for anonymous-only cells the marker reads "Suppressed (fewer than 5 events)". When exactly one cell of a breakdown is suppressed, the smallest other cell is also marked (AC-5.6). Statement shown whenever any suppression applies: "Some values are suppressed to protect privacy, so the values shown may add up to less than the total." (AC-5.1) |
| Partial (comparison)  | Previous period figure unavailable or suppressed: UX-Q-9, UX-Q-10.                                                                                                                                                                                                                                                                                                                                                                                                        |
| Permission-denied     | Not entitled to the application: S-18; no tenant data (AC-7.1).                                                                                                                                                                                                                                                                                                                                                                                                           |
| Session ended         | C-6.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Validation messages:

| Id    | Field and rule                 | Text                                                                                                                                            | AC             |
| :---- | :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------- |
| VM-7  | End date before start date     | "The end date must be on or after the start date."                                                                                              | AC-6.2         |
| VM-8  | Range longer than 13 months    | "The date range can be at most 13 months. Choose a shorter range."                                                                              | AC-6.2, REQ-12 |
| VM-9  | Date empty or not a valid date | "Enter a valid date."                                                                                                                           | AC-6.1         |
| VM-10 | Sub-day range attempted        | Not possible: the controls select whole UTC days only; if a time portion is entered the text is "Dates are whole days in UTC. Remove the time." | AC-5.6         |

In VM-7, VM-8, VM-9 the query is not run (AC-6.2).

Accessibility: filter controls have labels and are in a logical order before the figures; date entry works by keyboard and typing (WCAG 2.5.7 no drag-only); the chart has a text alternative and a data table or equivalent for the series (form decided by design, UX-Q-15); series and breakdown values are not conveyed by colour alone (1.4.1, 1.4.11 non-text contrast 3:1); the suppressed marker has the same text for assistive technology as it shows (not an ellipsis or dash alone); result updates after Apply are announced in a polite live region ("Results updated for <range>"); each active-filter chip's clear control has a name such as "Clear filter: event type"; focus is kept on the control used after update; error summary links to the failing field; UTC is stated in text next to dates.
Findings touched: none directly; REQ-29 behaviour only.

### S-6 Admin: Tenants

Purpose: list and create tenants; show the privacy-notice reference (AC-9.1, AC-9.4, AC-9.5).

| Data shown                      | PRD source                           |
| :------------------------------ | :----------------------------------- |
| Tenant id (unique)              | AC-9.1                               |
| Department owner                | AC-9.1                               |
| Privacy-notice URL or reference | AC-9.5, REQ-5                        |
| Created and changed times (UTC) | AC-9.5 (creation and change audited) |

Actions: New tenant, Save, Cancel; edit privacy-notice reference (change is audited, AC-9.5). Editing id or owner after creation is not specified (UX-Q-16).

| State             | Behaviour                                                                       |
| :---------------- | :------------------------------------------------------------------------------ |
| Loading           | Busy indicator in table and form.                                               |
| Empty             | "No tenants exist yet. Create the first tenant."                                |
| Error             | Generic error; on save failure nothing is changed.                              |
| Success           | "Tenant <id> saved." Row appears in the list with its privacy-notice reference. |
| Permission-denied | S-18 (AC-9.3).                                                                  |
| Step-up           | Not required for tenant creation by the PRD list.                               |

| Id     | Field and rule                                  | Text                                                          | AC             |
| :----- | :---------------------------------------------- | :------------------------------------------------------------ | :------------- |
| VM-11  | Tenant id missing                               | "Enter a tenant id."                                          | AC-9.4         |
| VM-12  | Tenant id duplicate                             | "A tenant with this id already exists. Enter a different id." | AC-9.4         |
| VM-13  | Department owner missing                        | "Enter the department owner."                                 | AC-9.4         |
| VM-14  | Privacy-notice URL or reference missing         | "Enter the privacy-notice URL or reference. It is required."  | AC-9.4, AC-9.5 |
| VM-14a | Id, owner or reference format or length invalid | Not stated in the PRD (UX-Q-16).                              | AC-9.4         |

Accessibility: table with column headers; form labels and required marking in text ("required"), not asterisk alone; field-level errors linked by `aria-describedby`, summary focused on failed submit; success message in a status region; privacy-notice reference, if a URL, is a link with a meaningful name.

### S-7 Admin: User entitlements

Purpose: grant and revoke a user's access to a tenant (AC-9.2).

| Data shown                                                         | PRD source |
| :----------------------------------------------------------------- | :--------- |
| User account (name or username)                                    | REQ-14     |
| Tenants granted                                                    | AC-9.2     |
| Effect-time note: "takes effect for new queries within 60 seconds" | AC-9.2     |

Actions: Grant (step-up), Revoke, Save.

| State             | Behaviour                                                                                                        |
| :---------------- | :--------------------------------------------------------------------------------------------------------------- |
| Loading           | Busy indicator.                                                                                                  |
| Empty             | "This user has no entitlements."                                                                                 |
| Error             | Generic error; nothing changes.                                                                                  |
| Success           | "Entitlement saved. It takes effect for new queries within 60 seconds."                                          |
| Step-up-required  | Grant opens S-3 if last authentication older than 5 minutes (AC-9.2, AC-8.5). Revoke is not on the step-up list. |
| Permission-denied | S-18.                                                                                                            |

Validation: user or tenant not chosen: VM-15 "Choose a user." and VM-16 "Choose a tenant." (no AC states these texts; they are derived from the form, UX-Q-1). Revoke confirmation text is UX-Q-18.
Accessibility: select controls are native or equivalent with labels; success message announced; revoke control name includes the tenant and user.

### S-8 Admin: Ingestion health

Purpose: view throughput, lag, dead-letter count and refused-publish count per tenant (AC-10.1).

| Data shown                                                                      | PRD source                                  |
| :------------------------------------------------------------------------------ | :------------------------------------------ |
| Throughput per tenant                                                           | AC-10.1, REQ-15                             |
| Consumer lag per tenant                                                         | AC-10.1                                     |
| Dead-letter count per tenant (link to S-9)                                      | AC-10.1                                     |
| Refused-publish count per tenant; unknown-credential refusals at platform level | AC-10.1, REQ-26                             |
| Last refreshed time (UTC)                                                       | AC-10.1 (refresh at least every 30 seconds) |
| Wrong-tenant dead letters shown against the credential's own tenant             | AC-9.1                                      |

Actions: open dead letters of a tenant; manual refresh (UX-Q-19).

| State             | Behaviour                                                                                                 |
| :---------------- | :-------------------------------------------------------------------------------------------------------- |
| Loading           | Busy indicator on first load only; later refreshes do not blank the page.                                 |
| Empty             | "No ingestion activity has been recorded yet."                                                            |
| Error             | "Health data could not be refreshed. Showing data from <time> UTC." with Retry (stale data kept, marked). |
| Success           | Figures per tenant plus platform-level refusals.                                                          |
| Partial           | One tenant's data unavailable: that row shows "Unavailable"; others show (UX-Q-19).                       |
| Permission-denied | S-18.                                                                                                     |

Validation: none.
Accessibility: refresh must not move focus or reset scroll; the auto-update is a polite live region only for the "last refreshed" text, not every number (avoid flooding); a control to pause auto-refresh satisfies WCAG 2.2.2 (design to confirm, UX-Q-19); numbers have units in text; status is not colour-only.

### S-9 Admin: Dead-letter events

Purpose: inspect, reveal, replay, discard dead-lettered events (AC-10.2, AC-10.4, AC-10.6, AC-11.10).

| Data shown                                                                                             | PRD source               |
| :----------------------------------------------------------------------------------------------------- | :----------------------- |
| List: tenant (the credential's own tenant), reason code, field path, dead-lettered time (UTC)          | AC-10.4, AC-15.1, AC-9.1 |
| Parseable event detail: keys visible, all payload values masked whatever the key                       | AC-10.4, REQ-15          |
| Unparseable event detail: reason code, tenant and timestamps only; body never shown, no reveal control | AC-10.6, REQ-15          |
| Expiry: expires within 7 days of dead-lettering                                                        | AC-10.3                  |

Actions: Open (step-up), Reveal one value (reason plus step-up, limited to that event), Replay, Discard.

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

| Id     | Field and rule                          | Text                                   | AC      |
| :----- | :-------------------------------------- | :------------------------------------- | :------ |
| VM-17  | Reveal reason empty                     | "Enter a reason to reveal this value." | AC-10.4 |
| VM-17a | Reason length or content rules          | Not stated (UX-Q-21).                  | AC-10.4 |
| VM-18  | Replay or discard with nothing selected | "Select at least one event."           | AC-10.2 |

Accessibility: masked values have the text "Masked" (not a row of symbols read character by character) and an accessible name that includes the key; the Reveal control names the key it reveals; confirmation of discard (UX-Q-18) is a focus-managed dialog; multi-select by checkboxes with a "select all" and a count announced; table has headers; a revealed value is announced and can be hidden again by keyboard (UX-Q-21).

### S-10 Admin: Data-subject access and erasure

Purpose: run access (Art. 15) and erasure (Art. 17) for verified requests (REQ-18, AC-11.1 to AC-11.10).

| Data entered or shown                                                                                                               | PRD source       |
| :---------------------------------------------------------------------------------------------------------------------------------- | :--------------- |
| Verification reference (recorded)                                                                                                   | AC-11.1, AC-11.3 |
| One or more (tenant, user id) pairs                                                                                                 | AC-11.1, AC-11.6 |
| Run mode: access or erasure                                                                                                         | AC-11.1, AC-11.2 |
| Access result: JSON export, download only by the requesting admin, expires and is deleted after 7 days, generated within 15 minutes | AC-11.1          |
| Erasure outcome per store: event store, aggregates, dead-letter store, messaging layer, deduplication state, exports                | AC-11.2          |
| Note on unparseable dead-letter messages                                                                                            | AC-11.7          |
| Request id, counts, time                                                                                                            | AC-11.3          |

Actions: Add pair, Remove pair, Run access (step-up), Run erasure (step-up), Download export (audited).

| State             | Behaviour                                                                                                                                                            |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Busy indicator; during access generation "Generating the export. This takes up to 15 minutes." with status (progress form UX-Q-22).                                  |
| Empty             | Blank form; the "no data" result: "No data is held for the subject. The request and outcome were recorded." (AC-11.4)                                                |
| Error             | Generic error; failed run states which stores completed and which failed (UX-Q-23).                                                                                  |
| Success: access   | "Export ready. It is available until <time> UTC and is then deleted." Download action.                                                                               |
| Success: erasure  | Outcome per store plus "Unparseable dead-letter messages cannot be matched to a subject. They are never displayed or revealable and expire within 7 days." (AC-11.7) |
| Step-up-required  | Both runs and the download of the export are guarded as listed (DSAR export, DSAR deletion; AC-8.5).                                                                 |
| Partial           | Some pairs refused (not covered) while others run is UX-Q-24.                                                                                                        |
| Expired           | Download no longer available: "This export has expired and was deleted."                                                                                             |
| Permission-denied | S-18.                                                                                                                                                                |

| Id     | Field and rule                                   | Text                                                                                                             | AC      |
| :----- | :----------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- | :------ |
| VM-19  | Verification reference missing                   | "Enter the verification reference."                                                                              | AC-11.1 |
| VM-20  | Tenant missing in a pair                         | "Choose a tenant for each pair."                                                                                 | AC-11.1 |
| VM-21  | User id missing in a pair                        | "Enter a user id for each pair."                                                                                 | AC-11.1 |
| VM-22  | Tenant not covered by the verification reference | "The verification reference does not cover tenant <tenant>. Remove this pair or use a reference that covers it." | AC-11.1 |
| VM-22a | Reference format, how coverage is checked        | Not stated (UX-Q-24).                                                                                            | AC-11.1 |

Accessibility: pairs are rows with labelled fields and "Remove pair n" controls; the user id field is not auto-completed and is not placed in the URL or page title (C-4); outcome table has headers and text status (not icon only); long-running status in a polite live region; download link names file type and expiry; a pair refused is linked from the summary to its row.
Findings touched: CR-048 (does access export include restricted events, does erasure remove restriction entry; the screen cannot state either, UX-Q-20).

### S-11 Admin: Objection (suppression list)

Purpose: record objections (Art. 21), erase in the same flow, manage entries (REQ-33, US-18).

| Data entered or shown                                                                                              | PRD source       |
| :----------------------------------------------------------------------------------------------------------------- | :--------------- |
| Verification reference                                                                                             | AC-18.1, AC-18.3 |
| (tenant, user id) pair                                                                                             | AC-18.1          |
| Suppression list per tenant: entries shown without the raw user id (display form, UX-Q-17) , date added, who added | AC-18.3, REQ-33  |
| Erasure outcome per store, including failure                                                                       | AC-18.7          |
| Dropped-new-event count per tenant                                                                                 | AC-18.1          |

Actions: Record objection (step-up), Remove entry (verification reference, step-up), Re-run erasure after a failure (step-up).

| State                    | Behaviour                                                                                                                                 |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| Loading                  | Busy indicator; erasure running status.                                                                                                   |
| Empty                    | "No objections are recorded for this tenant."                                                                                             |
| Error                    | Generic error; nothing changed.                                                                                                           |
| Success                  | "Objection recorded. New events for this subject are no longer stored. Erasure outcome:" and the per-store table (AC-18.1, AC-18.7).      |
| Partial (erasure failed) | "Erasure did not finish for: <stores>. The suppression is in effect. Re-run the erasure." with the Re-run action after step-up (AC-18.7). |
| Step-up-required         | Add, remove and re-run (AC-8.5).                                                                                                          |
| Permission-denied        | S-18.                                                                                                                                     |

| Id    | Field and rule                                 | Text                                                               | AC      |
| :---- | :--------------------------------------------- | :----------------------------------------------------------------- | :------ |
| VM-23 | Tenant missing                                 | "Choose a tenant."                                                 | AC-18.5 |
| VM-24 | User id missing                                | "Enter a user id."                                                 | AC-18.5 |
| VM-25 | Tenant not covered by the reference            | "The verification reference does not cover tenant <tenant>."       | AC-18.5 |
| VM-26 | Pair already on the list                       | "This subject is already on the suppression list for this tenant." | AC-18.5 |
| VM-27 | Verification reference missing (add or remove) | "Enter the verification reference. It is required."                | AC-18.3 |

Accessibility: as S-10; the per-store outcome includes text "Completed" or "Failed"; the list of entries has remove controls named by tenant and date (not by user id).
Findings touched: none directly; CR-048 relates to restriction, UX-Q-20.

### S-12 Admin: Restriction list

Purpose: restrict a subject's stored events from analytics without deleting them (REQ-34, US-19).

| Data entered or shown                                                                                                              | PRD source       |
| :--------------------------------------------------------------------------------------------------------------------------------- | :--------------- |
| Verification reference                                                                                                             | AC-19.3, AC-19.5 |
| (tenant, user id) pair                                                                                                             | AC-19.1          |
| Restriction list per tenant (no raw user id, date added, who added)                                                                | AC-19.3          |
| Statement of effect: stored events are kept and excluded from totals, unique users and breakdowns for queries started after saving | AC-19.1, AC-19.2 |

Actions: Add (step-up), Remove (verification reference, step-up).

| State             | Behaviour                                                                                      |
| :---------------- | :--------------------------------------------------------------------------------------------- |
| Loading           | Busy indicator.                                                                                |
| Empty             | "No restrictions are recorded for this tenant."                                                |
| Error             | Generic error; nothing changed.                                                                |
| Success: add      | "Restriction added. The subject's events are kept and excluded from queries started from now." |
| Success: remove   | "Restriction removed. Queries started from now include the subject's events again." (AC-19.5)  |
| Step-up-required  | Add and remove (AC-8.5).                                                                       |
| Permission-denied | S-18.                                                                                          |

| Id    | Field and rule                         | Text                                                               | AC      |
| :---- | :------------------------------------- | :----------------------------------------------------------------- | :------ |
| VM-28 | Tenant missing                         | "Choose a tenant."                                                 | AC-19.6 |
| VM-29 | User id missing                        | "Enter a user id."                                                 | AC-19.6 |
| VM-30 | Tenant not covered by the reference    | "The verification reference does not cover tenant <tenant>."       | AC-19.6 |
| VM-31 | Pair already on the list               | "This subject is already on the restriction list for this tenant." | AC-19.6 |
| VM-32 | Removal without verification reference | "Enter the verification reference to remove a restriction."        | AC-19.5 |

Accessibility: as S-11.
Findings touched: CR-048 (no stated outcome of erasure, retention or access for restricted subjects, so the screen cannot warn the admin; UX-Q-20).

### S-13 Admin: Tenant retention

Purpose: set retention per tenant in days (REQ-17, US-12).

| Data shown                                              | PRD source      |
| :------------------------------------------------------ | :-------------- |
| Tenant                                                  | AC-12.2         |
| Retention in days (default 396, minimum 1, maximum 396) | REQ-17, AC-12.3 |
| Note that a change applies at the next purge run        | AC-12.2         |
| Amount to be purged on shortening                       | AC-12.5         |

Actions: Save, Confirm purge, Cancel.

| State             | Behaviour                                                                                                                                                                  |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Busy indicator.                                                                                                                                                            |
| Empty             | Not applicable (a value always exists, default 396).                                                                                                                       |
| Error             | Generic error; value unchanged.                                                                                                                                            |
| Success           | "Retention saved. It applies to existing data at the next purge run." (AC-12.2) Lengthening note: "Data already purged is not restored." (AC-12.2)                         |
| Step-up-required  | Only when shortening would destroy data (AC-12.5; list item "retention shortening").                                                                                       |
| Confirmation      | "Saving this value will purge <amount> of data at the next purge run. Nothing is purged until you confirm." Confirm and Cancel (AC-12.5). Amount unit and measure UX-Q-25. |
| Permission-denied | S-18.                                                                                                                                                                      |

| Id    | Rule                      | Text                                             | AC      |
| :---- | :------------------------ | :----------------------------------------------- | :------ |
| VM-33 | Missing                   | "Enter the retention in days."                   | AC-12.3 |
| VM-34 | Non-numeric or fractional | "Enter a whole number of days."                  | AC-12.3 |
| VM-35 | Zero, negative, below 1   | "Retention must be at least 1 day."              | AC-12.3 |
| VM-36 | Above 396                 | "Retention can be at most 396 days (13 months)." | AC-12.3 |

On any of VM-33 to VM-36 the existing value is unchanged. 1 and 396 are accepted.
Accessibility: numeric input with label "Retention (days)" and hint "1 to 396"; confirmation is a focus-managed dialog with the amount in text; errors linked to field.

### S-14 Admin: Tenant allow-listed property keys

Purpose: add or remove free-form property keys accepted from a tenant (REQ-14, AC-13.8; outside the UI-facing story list).
Data shown: tenant, allowed keys, dropped-key count per tenant (AC-13.3). Actions: Add key (step-up), Remove key (step-up; both are "allow-list changes").
States: Loading busy; Empty "No keys are allow-listed for this tenant. Free-form properties are dropped."; Error generic; Success "Key <key> added. It is accepted from this tenant now." (no rebuild, AC-13.8); Step-up-required as stated; Permission-denied S-18.
Validation: key missing "Enter a property key."; key duplicate "This key is already allow-listed."; key format and length not stated (UX-Q-26). AC-13.8.
Accessibility: as S-6; add and remove controls named by key; a warning text near the field "Do not allow keys that carry personal data" is required by AC-2.4 only for docs, so its inclusion is UX-Q-26.

### S-15 Admin: Accounts

Purpose: create, reset, disable accounts, change roles, reset MFA, unlock (REQ-24, AC-16.x, AC-8.3).

| Data shown                                                                 | PRD source               |
| :------------------------------------------------------------------------- | :----------------------- |
| Username, role ("user" or "admin"), status (active, disabled, locked)      | AC-16.1, AC-16.2, AC-8.3 |
| One-time reset link, shown once, valid 24 hours, single use, no email sent | AC-16.2                  |
| Admin MFA status (enrolled, reset required)                                | AC-16.1, AC-16.9         |
| Never shown after creation: any password or credential value               | AC-16.3                  |

Actions: Create account (admin role needs step-up); Disable; Reset credential (step-up); Change role (step-up); Reset MFA (step-up); Unlock (step-up).

| State                | Behaviour                                                                                                                                                                        |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading              | Busy indicator.                                                                                                                                                                  |
| Empty                | Not applicable (at least one admin exists).                                                                                                                                      |
| Error                | Generic error; nothing changes.                                                                                                                                                  |
| Success: create      | "Account <username> created." For an admin: "<username> must set up an authenticator at first sign-in." (AC-16.1)                                                                |
| Success: disable     | "Account disabled. Existing sessions end on the next request."                                                                                                                   |
| Success: reset       | Link displayed once with "Copy link" and text: "Give this link to the account holder. It works once and expires in 24 hours. It is not shown again. No email is sent." (AC-16.2) |
| Success: role change | "Role changed. It takes effect on the next request and other sessions of this account are ended." (AC-16.8)                                                                      |
| Success: MFA reset   | "Authenticator reset. <username> must set it up again at next sign-in." (AC-16.9)                                                                                                |
| Success: unlock      | "Account unlocked." (AC-8.3)                                                                                                                                                     |
| Step-up-required     | Admin creation, reset link, role change, MFA reset, account unlock (AC-8.5).                                                                                                     |
| Refused              | Last-admin guard VM-40.                                                                                                                                                          |
| Permission-denied    | S-18.                                                                                                                                                                            |

| Id    | Field and rule                                  | Text                                                                                        | AC      |
| :---- | :---------------------------------------------- | :------------------------------------------------------------------------------------------ | :------ |
| VM-37 | Role missing                                    | "Choose a role."                                                                            | AC-16.3 |
| VM-38 | Username missing                                | "Enter a username."                                                                         | AC-16.3 |
| VM-39 | Username duplicate                              | "This username is already in use. Enter a different username."                              | AC-16.3 |
| VM-40 | Disable, delete or demote the only active admin | "This is the only active admin. Create or keep another admin before changing this account." | AC-16.6 |
| VM-41 | Password under 12 characters                    | "The password must be at least 12 characters."                                              | AC-16.4 |
| VM-42 | Password on breached list                       | "This password appears in a list of breached passwords. Choose a different password."       | AC-16.4 |

Whether the admin sets an initial password at creation or a link is issued is not stated (UX-Q-12), so VM-41 and VM-42 apply to wherever a password is entered (S-15 or S-19).
Accessibility: reset link is selectable text plus a Copy button with a status announcement "Link copied"; row actions have names including the username; destructive actions (disable, MFA reset) confirmation per UX-Q-18; status is text; the password field supports paste and shows no unrelated composition rules beyond the stated minimum.

### S-16 Admin: Producer credentials

Purpose: create, rotate, revoke credentials and their publish permissions (REQ-14, US-17).

| Data shown                                                                                | PRD source |
| :---------------------------------------------------------------------------------------- | :--------- |
| Credential name or id, tenant, permissions, status (active, in rotation overlap, revoked) | AC-17.1    |
| Secret, shown once only at creation or rotation                                           | AC-17.1    |
| Overlap expiry time (UTC) during rotation                                                 | AC-17.2    |
| Revocation time, and statement "refused within 60 seconds"                                | AC-17.4    |

Actions: Create (step-up), Rotate (step-up), Revoke.

| State             | Behaviour                                                                                                                       |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | Busy indicator.                                                                                                                 |
| Empty             | "No producer credentials exist for this tenant."                                                                                |
| Error             | Generic error; nothing changes.                                                                                                 |
| Success: create   | "Credential created. Copy the secret now. It is shown once and cannot be shown again."                                          |
| Success: rotate   | "Credential rotated. The old and the new credential are both accepted until <time> UTC (up to 24 hours)." plus new secret once. |
| Success: revoke   | "Credential revoked. Publishes with it are refused within 60 seconds."                                                          |
| Step-up-required  | Create and rotate (AC-8.5).                                                                                                     |
| Permission-denied | S-18.                                                                                                                           |

| Id    | Rule                 | Text                              | AC      |
| :---- | :------------------- | :-------------------------------- | :------ |
| VM-43 | Tenant not chosen    | "Choose a tenant."                | AC-17.1 |
| VM-44 | No permission chosen | "Choose at least one permission." | AC-17.1 |

Permission names and the minimum set are not in the PRD (UX-Q-27).
Accessibility: secret displayed as selectable text with a Copy button and "Secret copied" announcement; secret is not placed in the page title or URL; the once-only warning is text; revoke confirmation is a focus-managed dialog; status is text.

### S-17 Admin: Audit log viewer

Purpose: read and filter the audit trail (REQ-20, AC-14.3).

| Data shown                                                           | PRD source                                          |
| :------------------------------------------------------------------- | :-------------------------------------------------- |
| Actor (account id), action, target, tenant, timestamp (UTC), outcome | AC-14.1                                             |
| Aggregated refused-publish records with a count                      | REQ-26, AC-14.6                                     |
| Filters: actor, action, tenant, date range                           | AC-14.3                                             |
| Never shown                                                          | raw personal data, passwords, secrets, raw user ids | AC-14.1 |

Actions: Apply filters, Clear filters. No edit or delete control exists anywhere (AC-14.2).

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

Accessibility: records in a table with headers and sortable state announced (if sortable, UX-Q-28); filter labels; result count announced after filtering; long lists paginate by keyboard-operable controls (size UX-Q-28); timestamps carry "UTC".

### S-18 Access refused

Purpose: shared state for 403 or 404 on tenant data and admin functions (AC-7.1, AC-9.3, AC-14.3).
Data shown: heading and message only. No tenant name, no data.
Text: "You do not have access to this page." Actions: go to S-4 (user) or the admin start page (admin); sign out.
States: single state. A refusal of an admin function by a "user" writes an audit entry (AC-9.3), invisible to the user. 404 and 403 render identically so existence of another tenant is not revealed (AC-7.1 allows either; UX-Q-29).
Accessibility: heading receives focus on load; page title states "Access refused"; link names are descriptive.

### S-19 Set password via one-time link

Purpose: let an account holder set a password using the link from AC-16.2. The PRD states the link exists and its limits but not this landing flow (UX-Q-12).
Data entered: new password, confirmation.

| State                       | Behaviour                                                                          |
| :-------------------------- | :--------------------------------------------------------------------------------- |
| Loading                     | Busy indicator on submit; link validity checked on load.                           |
| Empty                       | Empty form.                                                                        |
| Error: link used or expired | "This link has expired or was already used. Ask an admin for a new one." (AC-16.2) |
| Error: password rule        | VM-41, VM-42.                                                                      |
| Error: mismatch             | VM-47 "The two passwords do not match." (derived from the form, UX-Q-1)            |
| Success                     | "Password set. Sign in." then S-1. Other sessions of the account end (AC-16.8).    |
| Permission-denied           | Not applicable (unauthenticated).                                                  |

Accessibility: both fields labelled; the minimum length is stated in text before entry; paste and password managers allowed; errors linked to fields; no password in URL.

## 5. Coverage

### 5.1 Story coverage

UI-facing stories: 13 (US-5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 17, 18, 19). Covered by a journey and at least one screen: 13. Coverage 100%.

| US      | Journey | Screens                  | ACs reachable on a screen                                                                         |
| :------ | :------ | :----------------------- | :------------------------------------------------------------------------------------------------ |
| US-5    | J-5     | S-4, S-5                 | AC-5.1, 5.2 (loading, performance measured outside the UI), 5.3, 5.4 (screen part), 5.5, 5.6, 5.7 |
| US-6    | J-6     | S-5                      | AC-6.1, 6.2                                                                                       |
| US-7    | J-7     | S-4, S-5, S-18           | AC-7.1 (UI part), 7.2 (empty list part)                                                           |
| US-8    | J-8     | S-1, S-2, S-3, S-4, S-15 | AC-8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8                                                         |
| US-9    | J-9     | S-6, S-7, S-8, S-9, S-18 | AC-9.1 (tenant form; wrong-tenant dead letter shown in S-8, S-9), 9.2, 9.3, 9.4, 9.5              |
| US-10   | J-10    | S-8, S-9                 | AC-10.1, 10.2, 10.3 (expiry shown, removal observed), 10.4, 10.6                                  |
| US-11   | J-11    | S-10, S-9, S-17          | AC-11.1, 11.2 (outcome display), 11.3 (via S-17), 11.4, 11.6, 11.7, 11.10                         |
| US-12   | J-12    | S-13                     | AC-12.2, 12.3, 12.5                                                                               |
| US-14   | J-14    | S-17, S-18               | AC-14.2 (no edit or delete control), 14.3                                                         |
| US-16   | J-16    | S-15, S-2, S-19          | AC-16.1, 16.2, 16.3, 16.4, 16.6, 16.8, 16.9                                                       |
| US-17   | J-17    | S-16                     | AC-17.1, 17.2, 17.4 (action and message)                                                          |
| US-18   | J-18    | S-11                     | AC-18.1, 18.3, 18.4 (isolation shown by tenant-scoped list), 18.5, 18.7                           |
| US-19   | J-19    | S-12                     | AC-19.1, 19.3, 19.4 (tenant-scoped), 19.5, 19.6                                                   |
| (US-13) | none    | S-14                     | AC-13.8 (not a listed UI-facing story, shown for information)                                     |

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

Not resolved here. Tracked findings are open and unchanged.

| Id               | Question                                                                                                                                                                                                                                                                                         | Touches                      |
| :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------- |
| UX-Q-1           | Is the proposed on-screen copy in this document acceptable, who owns copy approval, and is English the only language?                                                                                                                                                                            | all VM texts                 |
| UX-Q-2           | Can an admin use the dashboard (S-4, S-5) and have entitlements? PRD says user and admin roles; AC-8.2 defines the user landing only. What is the admin landing screen and how does navigation between admin screens work?                                                                       | S-2, S-4                     |
| UX-Q-3 (CR-029)  | What happens when step-up fails repeatedly? Do failed step-up codes count to the 5-in-15-minutes lockout, does reaching the limit end the session, and what does S-3 show? AC-8.3 says a lockout never applies to an established session.                                                        | S-2, S-3, AC-8.3, AC-8.6     |
| UX-Q-4           | Should the locked-account message reveal that an account is locked (account enumeration versus helpfulness), and should it show the remaining time?                                                                                                                                              | S-1, VM-2                    |
| UX-Q-5 (CR-036)  | What does a user see under the global throttle, how long should they wait, what is a "source" (IP address, office NAT), and how is throttle engagement shown to admins? The AC claim that a legitimate admin can still sign in is untestable per the finding.                                    | S-1, VM-3, AC-8.8            |
| UX-Q-6           | Idle session expiry: is a warning shown before the 30-minute timeout, and is unsaved form input preserved?                                                                                                                                                                                       | C-6, AC-8.2                  |
| UX-Q-7           | Default application, date range and event type when the overview first opens.                                                                                                                                                                                                                    | S-5                          |
| UX-Q-8           | After step-up, is the interrupted action resumed with its input kept, or restarted?                                                                                                                                                                                                              | S-3                          |
| UX-Q-9           | Definition of "previous period" (same length immediately before the range?) and how percentage change is shown when the previous value is zero.                                                                                                                                                  | S-5, AC-6.2                  |
| UX-Q-10          | How are comparison cells shown when the current or previous cell is suppressed?                                                                                                                                                                                                                  | S-5, AC-5.6, AC-6.2          |
| UX-Q-11          | Which tenant fields (name, id, department owner) are shown to users in the application list?                                                                                                                                                                                                     | S-4                          |
| UX-Q-12          | How are initial passwords handled on account creation (admin sets one, or a link only), and what is the landing flow for the one-time link (S-19)? PRD states no email is sent.                                                                                                                  | S-15, S-19, AC-16.1, AC-16.2 |
| UX-Q-13          | Is a confirmation required before leaving the one-time secret or link display, and can an admin re-show it? PRD says shown once only.                                                                                                                                                            | S-15, S-16                   |
| UX-Q-14          | TOTP code format and length, enrolment material form (QR, key), and any enrolment time limit.                                                                                                                                                                                                    | S-2                          |
| UX-Q-15          | Form of the text alternative for the time series chart (WCAG 1.1.1): data table or other. Chart type is a design decision.                                                                                                                                                                       | S-5                          |
| UX-Q-16          | Format and length rules for tenant id, department owner and privacy-notice URL or reference; whether they can be edited after creation.                                                                                                                                                          | S-6, AC-9.4                  |
| UX-Q-17          | How are user ids displayed after entry (never, masked, or only during entry) given AC-11.3, AC-18.3 and AC-19.3 exclude raw ids from audit records? Can an admin see which subjects are on a list?                                                                                               | S-10, S-11, S-12             |
| UX-Q-18          | Which destructive actions need a confirmation step (discard, revoke, disable, remove entry, MFA reset)? Only retention shortening is specified (AC-12.5).                                                                                                                                        | S-9, S-11, S-12, S-15, S-16  |
| UX-Q-19          | Health view: auto-refresh versus manual refresh, pause control, how an unavailable tenant is shown.                                                                                                                                                                                              | S-8                          |
| UX-Q-20 (CR-048) | Restriction list versus erasure, retention purge and subject access: does erasure or objection remove a restriction entry, does retention purge apply to restricted data, does an access export include restricted events? The screens S-10, S-12 and S-13 cannot warn or inform until answered. | S-10, S-12, S-13             |
| UX-Q-21          | Reveal of a masked value: rules for the reason (length, content), how long a revealed value stays visible, and whether it can be re-hidden.                                                                                                                                                      | S-9, AC-10.4                 |
| UX-Q-22          | Progress presentation for export generation (status only, polling, notification) within the 15-minute bound.                                                                                                                                                                                     | S-10                         |
| UX-Q-23          | Presentation of partial failure of an erasure run, and whether re-run is offered for erasure under S-10 as it is for objection (AC-18.7).                                                                                                                                                        | S-10, S-11                   |
| UX-Q-24          | Verification reference format and how "covers each tenant" is captured and checked by the screen; maximum number of pairs per request; behaviour when some pairs are refused.                                                                                                                    | S-10, S-11, S-12             |
| UX-Q-25          | Unit and measure of "how much data will be purged" in the retention confirmation (events, percentage, date range).                                                                                                                                                                               | S-13, AC-12.5                |
| UX-Q-26          | Allow-list key format, length and whether a privacy warning appears on the screen.                                                                                                                                                                                                               | S-14                         |
| UX-Q-27          | Names and set of producer-credential permissions.                                                                                                                                                                                                                                                | S-16                         |
| UX-Q-28          | Audit log page size, sorting and available columns.                                                                                                                                                                                                                                              | S-17                         |
| UX-Q-29          | Whether 403 and 404 for another tenant must be indistinguishable on screen.                                                                                                                                                                                                                      | S-18, AC-7.1                 |
| UX-Q-30          | Supported browsers, responsive and zoom or reflow expectations beyond WCAG 2.2 AA (NFR-14).                                                                                                                                                                                                      | all                          |
