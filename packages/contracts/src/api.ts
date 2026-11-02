/**
 * API response/request shapes for the dashboard + admin REST API.
 * Trimmed port of .worktrees/design/docs/design/openapi.yaml for the POC slice.
 * Aggregate-only: responses never contain raw/pseudonymous user ids.
 */
import type { EventType } from './events.js';

export type Role = 'user' | 'admin';

export interface SessionInfo {
  accountId: string;
  username: string;
  role: Role;
  idleExpiresAt: string;
  /** Synchroniser token required on unsafe methods via X-CSRF-Token. */
  csrfToken: string;
}

export interface SignInRequest {
  username: string;
  password: string;
}

export interface SignInResult {
  /** 'done' for the POC (MFA is skipped); the design also had 'mfa_required'. */
  next: 'done';
  session: SessionInfo;
}

/** A tenant (application) the caller is entitled to. */
export interface ApplicationSummary {
  tenantId: string;
  departmentOwner: string;
}

export interface ApplicationList {
  items: ApplicationSummary[];
}

export interface EventTypeList {
  items: EventType[];
}

/**
 * A metric cell. Below the k=5 anonymity threshold the server suppresses the
 * numbers and sends { suppressed: true } instead (REQ-29, ADR-012).
 */
export type MetricCell =
  | { suppressed: false; events: number; uniqueUsers: number }
  | { suppressed: true };

export interface SeriesPoint {
  /** UTC day YYYY-MM-DD. */
  date: string;
  cell: MetricCell;
}

export interface NamedBreakdown {
  key: string;
  cell: MetricCell;
}

export interface OverviewBreakdowns {
  country: NamedBreakdown[];
  browserFamily: NamedBreakdown[];
  osFamily: NamedBreakdown[];
  eventType: NamedBreakdown[];
}

export interface OverviewComparison {
  /** Previous period of the same number of complete days. */
  from: string;
  to: string;
  totals: MetricCell;
  /** Percent change in events vs the current period; null when not computable. */
  eventsPercentChange: number | null;
}

export interface Overview {
  tenantId: string;
  range: {
    from: string;
    to: string;
    /** Complete UTC days covered (today excluded; returned as todaySoFar). */
    completeDays: number;
  };
  totals: MetricCell;
  series: SeriesPoint[];
  topEventTypes: NamedBreakdown[];
  breakdowns: OverviewBreakdowns;
  /** Total events so far on the current UTC day (partial), when in range. */
  todaySoFar?: MetricCell;
  comparison?: OverviewComparison;
}

/** Admin: tenant record. */
export interface Tenant {
  tenantId: string;
  departmentOwner: string;
  privacyNoticeUrl: string;
  retentionDays: number;
  createdAt: string;
}

export interface TenantCreate {
  tenantId: string;
  departmentOwner: string;
  privacyNoticeUrl: string;
}

export interface TenantList {
  items: Tenant[];
}

/** Admin: account record. */
export interface Account {
  accountId: string;
  username: string;
  role: Role;
  status: 'active' | 'disabled';
  createdAt: string;
}

export interface AccountList {
  items: Account[];
}

export interface AccountCreate {
  username: string;
  role: Role;
  /** POC simplification: password set directly instead of a one-time link. */
  password: string;
}

export interface Entitlement {
  tenantId: string;
  grantedAt: string;
}

export interface EntitlementList {
  items: Entitlement[];
}

/** Admin: producer credential (secret shown once on create). */
export interface ProducerCredential {
  credentialId: string;
  tenantId: string;
  status: 'active' | 'revoked';
  createdAt: string;
}

export interface ProducerCredentialList {
  items: ProducerCredential[];
}

export interface ProducerCredentialCreate {
  tenantId: string;
}

export interface ProducerCredentialIssued extends ProducerCredential {
  /** Shown once; never returned again. */
  secret: string;
}

export interface AllowedKey {
  key: string;
  addedAt: string;
}

export interface AllowedKeyList {
  items: AllowedKey[];
}

export interface AllowedKeyCreate {
  key: string;
}

/** Admin: per-tenant ingestion health. */
export interface TenantHealth {
  tenantId: string;
  throughputPerMinute: number;
  lagSeconds: number;
  deadLetterCount: number;
  refusedPublishCount: number;
  status: 'ok' | 'unknown';
  dataAsOf: string;
}

export interface IngestionHealth {
  tenants: TenantHealth[];
}

export interface DeadLetter {
  deadLetterId: string;
  tenantId: string;
  reasonCode: string;
  fieldPath: string | null;
  deadLetteredAt: string;
  expiresAt: string;
}

export interface DeadLetterPage {
  items: DeadLetter[];
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface HealthStatus {
  status: 'ok' | 'error';
}

/** RFC 9457-style problem response. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  errors?: { field: string; code: string; message?: string }[];
}
