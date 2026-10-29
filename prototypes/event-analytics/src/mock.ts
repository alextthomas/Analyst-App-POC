// Synthetic data only. Ids such as user-0001; domains are example.com.
export interface Tenant {
  id: string;
  owner: string;
  url: string;
  created: string;
  changed: string;
}
export const TENANTS: Tenant[] = [
  {
    id: "tenant-alpha",
    owner: "Department A (example)",
    url: "https://example.com/privacy/alpha",
    created: "2026-01-10 09:00 UTC",
    changed: "2026-03-02 14:30 UTC",
  },
  {
    id: "tenant-bravo",
    owner: "Department B (example)",
    url: "https://example.com/privacy/bravo",
    created: "2026-02-01 10:15 UTC",
    changed: "2026-02-01 10:15 UTC",
  },
  {
    id: "tenant-charlie",
    owner: "Department C (example)",
    url: "https://example.com/privacy/charlie",
    created: "2026-04-20 08:45 UTC",
    changed: "2026-05-11 16:05 UTC",
  },
];
export const APPS = [
  { id: "tenant-alpha", name: "Alpha Portal", owner: "Department A (example)" },
  { id: "tenant-bravo", name: "Bravo Mobile", owner: "Department B (example)" },
  {
    id: "tenant-charlie",
    name: "Charlie Kiosk",
    owner: "Department C (example)",
  },
];
export const USERS = ["user-0001", "user-0002", "user-0003"];
export const STORES = [
  "Event store",
  "Aggregates",
  "Dead-letter store",
  "Messaging layer",
  "Deduplication state",
  "Exports",
];
export const EVENT_TYPES = [
  "page_view",
  "button_click",
  "form_submit",
  "search",
  "login",
  "logout",
  "file_download",
  "video_play",
  "share",
  "error_shown",
];
export const NOW_UTC = "2026-10-29 10:00 UTC";
/** Prototype rule: no verification reference covers this tenant (VM-22 / VM-25 / VM-30). */
export const UNCOVERED_TENANT = "tenant-charlie";
