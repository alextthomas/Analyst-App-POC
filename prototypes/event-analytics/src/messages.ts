// Exact draft copy from docs/ux/event-analytics.md (UX rev 2). Ids follow VM-n.
export const GENERIC_WRITE =
  "Something went wrong. Your change was not saved. Try again. If the problem continues, contact a platform admin.";
export const GENERIC_READ =
  "Something went wrong. The data could not be loaded. Try again.";
export const PENDING = "This behaviour is pending design.";
export const SESSION_ENDED = "Your session has ended. Sign in again.";
export const IDLE_WARNING =
  "Your session will end in 2 minutes because of inactivity.";

const REF_LONG = "The verification reference can be at most 100 characters.";
export const coverText = (t: string): string =>
  `Confirm that the verification reference covers tenant ${t}.`;

export const VM = {
  v1: "Sign-in failed. Check your username and password.",
  v1a: "Enter your username.",
  v1b: "Enter your password.",
  v3: "Too many sign-in attempts. Try again in a few minutes.",
  v4: "That code is not valid. Check the code in your authenticator app and try again.",
  v4a: "Enter the 6-digit code from your authenticator app.",
  v5: "That code was already used. Wait for the next code and try again.",
  v6: "Confirmation failed. Check your password and authenticator code and try again.",
  v6a: "Enter your password and your authenticator code.",
  v7: "The end date must be on or after the start date.",
  v8: "The date range can be at most 13 months. Choose a shorter range.",
  v9: "Enter a valid date.",
  v10: "Dates are whole days in UTC. Remove the time.",
  v11: "Enter a tenant id.",
  v12: "A tenant with this id already exists. Enter a different id.",
  v13: "Enter the department owner.",
  v14: "Enter the privacy-notice URL. It is required.",
  v14a: "The tenant id must be 3 to 40 characters and use only lowercase letters, digits and hyphens.",
  v14b: "The department owner can be at most 100 characters.",
  v14c: "Enter the privacy notice as a valid URL.",
  v15: "Choose a user.",
  v16: "Choose a tenant.",
  v17: "Enter a reason to reveal this value.",
  v17a: "The reason must be 10 to 500 characters.",
  v18: "Select at least one event.",
  v19: "Enter the verification reference.",
  v19a: REF_LONG,
  v20: "Choose a tenant for each pair.",
  v21: "Enter a user id for each pair.",
  v22b: "A request can include at most 20 pairs. Remove pairs or submit a second request.",
  v22c: "Add at least one pair.",
  v23: "Choose a tenant.",
  v24: "Enter a user id.",
  v26: "This subject is already on the suppression list for this tenant.",
  v27: "Enter the verification reference. It is required.",
  v27a: REF_LONG,
  v28: "Choose a tenant.",
  v29: "Enter a user id.",
  v31: "This subject is already on the restriction list for this tenant.",
  v32: "Enter the verification reference to remove a restriction.",
  v32a: REF_LONG,
  v33: "Enter the retention in days.",
  v34: "Enter a whole number of days.",
  v35: "Retention must be at least 1 day.",
  v36: "Retention can be at most 396 days (13 months).",
  v37: "Choose a role.",
  v38: "Enter a username.",
  v39: "This username is already in use. Enter a different username.",
  v40: "This is the only active admin. Create or keep another admin before changing this account.",
  v41: "The password must be at least 12 characters.",
  v42: "This password appears in a list of breached passwords. Choose a different password.",
  v43: "Choose a tenant.",
  v45: "The end date must be on or after the start date.",
  v46: "Enter a valid date.",
  v47: "The two passwords do not match.",
  v48: "Enter a property key.",
  v49: "This key is already allow-listed.",
  v50: "Use lowercase snake_case: lowercase letters, digits and underscores, for example page_name.",
  v51: "The key can be at most 64 characters.",
  v52: "This setup page has expired. Open your setup link again to restart.",
} as const;

export const vm22 = (t: string): string =>
  `The verification reference does not cover tenant ${t}. Remove this pair or use a reference that covers it.`;
export const vmNotCovered = (t: string): string =>
  `The verification reference does not cover tenant ${t}.`;
