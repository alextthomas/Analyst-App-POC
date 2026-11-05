/**
 * Reusable producer client kit (TypeScript).
 * A producer application embeds this to publish analytics events over NATS
 * JetStream, without any change to the analytics service (charter O-3).
 */
import { connect, JSONCodec, type NatsConnection } from 'nats';
import {
  CONTRACT_VERSION_PATTERN,
  ingestSubject,
  type EventEnvelopeV1,
  type EventType,
  type PropertyValue,
} from '@ea/contracts';

const codec = JSONCodec<EventEnvelopeV1>();

export interface ProducerClientOptions {
  natsUrl: string;
  tenantId: string;
  credentialId: string;
  /** Producer credential secret (used as the NATS password in a secured deployment). */
  secret?: string;
  contractVersion?: string;
  kitVersion?: string;
}

export interface TrackInput {
  eventType: EventType;
  eventId?: string;
  eventTime?: string;
  userId?: string;
  properties?: Record<string, PropertyValue>;
  payload?: Record<string, unknown>;
  context?: EventEnvelopeV1['context'];
}

export class ProducerClient {
  private nc: NatsConnection | null = null;
  private readonly contractVersion: string;
  private readonly kitVersion: string;

  constructor(private readonly opts: ProducerClientOptions) {
    this.contractVersion = opts.contractVersion ?? '1.0';
    this.kitVersion = opts.kitVersion ?? '0.1.0';
    if (!CONTRACT_VERSION_PATTERN.test(this.contractVersion)) {
      throw new Error(`Invalid contract version: ${this.contractVersion}`);
    }
  }

  async connect(): Promise<void> {
    if (this.nc) return;
    // In a secured deployment the credential id is the NATS user and the secret
    // the password over TLS. Local docker NATS is open, so auth is optional.
    this.nc = await connect({
      servers: this.opts.natsUrl,
      user: this.opts.secret ? this.opts.credentialId : undefined,
      pass: this.opts.secret,
      name: `producer-${this.opts.tenantId}`,
    });
  }

  async track(input: TrackInput): Promise<void> {
    if (!this.nc) throw new Error('ProducerClient is not connected; call connect() first.');
    const now = new Date().toISOString();
    const envelope: EventEnvelopeV1 = {
      contractVersion: this.contractVersion,
      eventId: input.eventId ?? cryptoRandomId(),
      eventType: input.eventType,
      eventTime: input.eventTime ?? now,
      sentAt: now,
      tenantId: this.opts.tenantId,
      userId: input.userId,
      context: input.context,
      properties: input.properties,
      payload: input.payload ?? {},
      producer: { kit: 'typescript', kitVersion: this.kitVersion },
    };
    const subject = ingestSubject(this.opts.tenantId, this.opts.credentialId);
    // JetStream publish with acknowledgement would be used in production; the
    // core NATS publish is sufficient for the POC consumer.
    this.nc.publish(subject, codec.encode(envelope));
    await this.nc.flush();
  }

  async close(): Promise<void> {
    if (!this.nc) return;
    await this.nc.drain();
    this.nc = null;
  }
}

function cryptoRandomId(): string {
  // ULID-like is recommended; a UUID is accepted by the contract.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
