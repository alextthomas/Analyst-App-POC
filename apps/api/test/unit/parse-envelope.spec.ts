import { describe, expect, it } from 'vitest';
import type { EventEnvelopeV1 } from '@ea/contracts';
import { parseEnvelope } from '../../src/ingestion/intake';

function enc(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj));
}

function validEnvelope(overrides: Partial<EventEnvelopeV1> = {}): EventEnvelopeV1 {
  return {
    contractVersion: '1.0',
    eventId: 'evt-1',
    eventType: 'page_view',
    eventTime: '2026-03-04T10:00:00.000Z',
    sentAt: '2026-03-04T10:00:01.000Z',
    tenantId: 'web-portal',
    payload: { path: '/' },
    producer: { kit: 'typescript', kitVersion: '0.1.0' },
    ...overrides,
  };
}

describe('parseEnvelope', () => {
  it('accepts a valid envelope', () => {
    const res = parseEnvelope(enc(validEnvelope()));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.env.eventId).toBe('evt-1');
  });

  it('accepts a custom.* event type', () => {
    const res = parseEnvelope(enc(validEnvelope({ eventType: 'custom.checkout_done' })));
    expect(res.ok).toBe(true);
  });

  it('dead-letters oversize messages (> 64 KiB)', () => {
    const big = validEnvelope({ payload: { blob: 'x'.repeat(70_000) } });
    const res = parseEnvelope(enc(big));
    expect(res).toMatchObject({ ok: false, reason: 'oversize' });
  });

  it('dead-letters unparseable JSON', () => {
    const res = parseEnvelope(new TextEncoder().encode('{not json'));
    expect(res).toMatchObject({ ok: false, reason: 'unparseable' });
  });

  it('dead-letters a non-object payload', () => {
    const res = parseEnvelope(enc('just a string'));
    expect(res).toMatchObject({ ok: false, reason: 'schema_violation' });
  });

  it('dead-letters a missing required field with its pointer', () => {
    const { eventId, ...rest } = validEnvelope();
    void eventId;
    const res = parseEnvelope(enc(rest));
    expect(res).toMatchObject({ ok: false, reason: 'schema_violation', fieldPath: '/eventId' });
  });

  it('dead-letters an unsupported contract version', () => {
    const res = parseEnvelope(enc(validEnvelope({ contractVersion: '2.0' })));
    expect(res).toMatchObject({ ok: false, reason: 'unsupported_version', fieldPath: '/contractVersion' });
  });

  it('dead-letters a malformed tenant id', () => {
    const res = parseEnvelope(enc(validEnvelope({ tenantId: 'BAD TENANT' })));
    expect(res).toMatchObject({ ok: false, reason: 'schema_violation', fieldPath: '/tenantId' });
  });

  it('dead-letters an unknown event type', () => {
    const res = parseEnvelope(enc(validEnvelope({ eventType: 'not_a_real_type' as EventEnvelopeV1['eventType'] })));
    expect(res).toMatchObject({ ok: false, reason: 'unknown_event_type', fieldPath: '/eventType' });
  });

  it('dead-letters an over-length event id', () => {
    const res = parseEnvelope(enc(validEnvelope({ eventId: 'e'.repeat(65) })));
    expect(res).toMatchObject({ ok: false, reason: 'schema_violation', fieldPath: '/eventId' });
  });
});
