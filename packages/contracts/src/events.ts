/**
 * Event envelope, contract major version 1.
 * Faithful (POC-trimmed) port of
 * .worktrees/design/docs/design/events/event-envelope.v1.schema.json (ADR-002).
 *
 * Producers publish these over NATS to subject ingest.<tenantId>.<credentialId>.
 * Raw PII (context.*, userId) is dropped at intake; only a pseudonymous subject
 * id and coarse derived values (country, browser/OS family) are stored.
 */

export const CATALOGUE_EVENT_TYPES = [
  'page_view',
  'screen_view',
  'ui_interaction',
  'session_start',
  'session_end',
  'feature_used',
  'error_shown',
] as const;

export type CatalogueEventType = (typeof CATALOGUE_EVENT_TYPES)[number];

/** A catalogue type, or custom.<name> (empty payload; data in allow-listed properties). */
export type EventType = CatalogueEventType | `custom.${string}`;

export const EVENT_TYPE_PATTERN =
  /^(page_view|screen_view|ui_interaction|session_start|session_end|feature_used|error_shown|custom\.[a-z][a-z0-9_]{0,63})$/;

export const TENANT_ID_PATTERN = /^[a-z0-9-]{3,40}$/;
export const PROPERTY_KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
export const CONTRACT_VERSION_PATTERN = /^1\.(0|[1-9][0-9]{0,3})$/;

export type ProducerKit = 'typescript' | 'python' | 'other';

export interface EventContext {
  /** Raw PII; dropped at intake, used only to derive country. */
  ip?: string;
  /** Raw PII; dropped at intake, used only to derive browser/OS family. */
  userAgent?: string;
  deviceId?: string;
  location?: { lat: number; lon: number };
}

export type PropertyValue = string | number | boolean;

export interface EventEnvelopeV1 {
  /** major.minor of the contract; major must be 1. */
  contractVersion: string;
  /** Producer-assigned id, unique per tenant. Dedup key is (tenant, eventId). */
  eventId: string;
  eventType: EventType;
  /** When the event happened (producer clock), RFC 3339 with offset. */
  eventTime: string;
  /** Client kit send time, stamped by the kit when it publishes. */
  sentAt: string;
  tenantId: string;
  /** Optional producer user id. Pseudonymised at intake; never stored raw. */
  userId?: string;
  /** Optional client context. Every field is raw PII and is dropped at intake. */
  context?: EventContext;
  /** Free-form properties; only allow-listed keys are stored. */
  properties?: Record<string, PropertyValue>;
  /** Per-event-type payload. Validated then discarded; never stored. */
  payload: Record<string, unknown>;
  producer: { kit: ProducerKit; kitVersion: string };
}

/** Dead-letter reason codes (asyncapi.yaml). */
export const DEAD_LETTER_REASONS = [
  'oversize',
  'unparseable',
  'schema_violation',
  'invalid_property_key',
  'unknown_event_type',
  'unsupported_version',
  'wrong_tenant',
  'timestamp_out_of_bounds',
] as const;

export type DeadLetterReason = (typeof DEAD_LETTER_REASONS)[number];

/** NATS subject for a tenant+credential ingestion stream. */
export function ingestSubject(tenantId: string, credentialId: string): string {
  return `ingest.${tenantId}.${credentialId}`;
}
