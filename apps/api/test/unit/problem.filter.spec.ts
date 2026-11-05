import { describe, expect, it, vi } from "vitest";
import { BadRequestException, HttpException } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { ProblemFilter } from "../../src/problem.filter";
import { logger } from "../../src/logger";

/** Build a fake ArgumentsHost whose response captures status/type/body. */
function fakeHost(): {
  host: ArgumentsHost;
  captured: { status?: number; type?: string; body?: unknown };
} {
  const captured: { status?: number; type?: string; body?: unknown } = {};
  const res = {
    status: vi.fn((s: number) => {
      captured.status = s;
      return res;
    }),
    type: vi.fn((t: string) => {
      captured.type = t;
      return res;
    }),
    send: vi.fn((b: unknown) => {
      captured.body = b;
      return res;
    }),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}) }),
  } as unknown as ArgumentsHost;
  return { host, captured };
}

describe("ProblemFilter", () => {
  it("maps a structured HttpException to problem+json with code and title", () => {
    const { host, captured } = fakeHost();
    new ProblemFilter().catch(
      new BadRequestException({
        code: "validation-error",
        title: "Bad input",
        errors: [{ field: "/x", code: "required" }],
      }),
      host,
    );
    expect(captured.status).toBe(400);
    expect(captured.type).toBe("application/problem+json");
    const body = captured.body as Record<string, unknown>;
    expect(body.code).toBe("validation-error");
    expect(body.title).toBe("Bad input");
    expect(body.type).toContain("/problems/validation-error");
    expect(body.errors).toHaveLength(1);
  });

  it("maps class-validator array messages to a validation-error problem", () => {
    const { host, captured } = fakeHost();
    new ProblemFilter().catch(
      new BadRequestException({ message: ["must be a string", "too short"] }),
      host,
    );
    const body = captured.body as Record<string, unknown>;
    expect(body.code).toBe("validation-error");
    expect(body.errors).toHaveLength(2);
  });

  it("maps a string HttpException to its title", () => {
    const { host, captured } = fakeHost();
    new ProblemFilter().catch(new HttpException("Teapot", 418), host);
    expect(captured.status).toBe(418);
    expect((captured.body as Record<string, unknown>).title).toBe("Teapot");
  });

  it("maps an unknown error to a 500 internal-error problem", () => {
    const { host, captured } = fakeHost();
    new ProblemFilter().catch(new Error("boom"), host);
    expect(captured.status).toBe(500);
    expect((captured.body as Record<string, unknown>).code).toBe(
      "internal-error",
    );
  });

  it("logs unhandled errors as name/code/message only, never the raw object", () => {
    const spy = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const { host } = fakeHost();
    const err = Object.assign(
      new Error("db failed\nuserId: alice@example.test"),
      { code: "P2002" },
    );
    new ProblemFilter().catch(err, host);
    expect(spy).toHaveBeenCalledWith(
      { err: { name: "Error", code: "P2002", message: "db failed" } },
      "Unhandled error",
    );
    spy.mockRestore();
  });
});
