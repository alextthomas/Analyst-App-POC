import { describe, expect, it, vi } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "../../src/health.controller";
import type { PrismaService } from "../../src/prisma.service";

function make(queryRaw: () => Promise<unknown>): HealthController {
  return new HealthController({
    $queryRaw: vi.fn(queryRaw),
  } as unknown as PrismaService);
}

describe("HealthController", () => {
  it("live is always ok", () => {
    expect(make(async () => 1).live()).toEqual({ status: "ok" });
  });

  it("ready is ok when the database answers", async () => {
    await expect(make(async () => [{ one: 1 }]).ready()).resolves.toEqual({
      status: "ok",
    });
  });

  it("ready throws 503 when the database is down", async () => {
    const c = make(async () => {
      throw new Error("connection refused");
    });
    const err = await c.ready().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect((err as ServiceUnavailableException).getStatus()).toBe(503);
  });
});
