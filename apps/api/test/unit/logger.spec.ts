import { describe, expect, it } from "vitest";
import { createLogger, errFields } from "../../src/logger";

function capture(): {
  lines: () => Record<string, unknown>[];
  stream: { write(chunk: string): void };
} {
  const chunks: string[] = [];
  return {
    stream: { write: (c: string) => void chunks.push(c) },
    lines: () => chunks.map((c) => JSON.parse(c) as Record<string, unknown>),
  };
}

describe("logger redaction", () => {
  it("redacts sensitive keys at the top level and nested", () => {
    const cap = capture();
    const log = createLogger(cap.stream);
    log.info(
      {
        password: "p1",
        cookie: "c1",
        userId: "u1",
        properties: { plan: "x" },
        payload: { a: 1 },
        context: { b: 2 },
        req: {
          headers: {
            cookie: "sid=1",
            "x-csrf-token": "t",
            authorization: "Bearer z",
          },
        },
        body: { password: "p2", nested: { userId: "u2" } },
        err: { name: "E", meta: { target: "secret-value" } },
      },
      "hello",
    );
    const line = cap.lines()[0]!;
    const text = JSON.stringify(line);
    for (const leaked of [
      "p1",
      "c1",
      "u1",
      "sid=1",
      "Bearer z",
      "p2",
      "u2",
      "secret-value",
      '"plan"',
    ]) {
      expect(text).not.toContain(leaked);
    }
    expect(line.password).toBe("[Redacted]");
    expect(line.cookie).toBe("[Redacted]");
    expect(line.userId).toBe("[Redacted]");
    expect(line.properties).toBe("[Redacted]");
    expect(line.payload).toBe("[Redacted]");
    expect(line.context).toBe("[Redacted]");
    expect(
      (line.req as { headers: Record<string, unknown> }).headers.cookie,
    ).toBe("[Redacted]");
    expect(
      (line.req as { headers: Record<string, unknown> }).headers[
        "x-csrf-token"
      ],
    ).toBe("[Redacted]");
    expect(line.msg).toBe("hello");
  });
});

describe("errFields", () => {
  it("returns only name, code and first message line for an Error", () => {
    const err = Object.assign(
      new Error('Invalid invocation\nuserId: "alice@example.test"'),
      { code: "P2002" },
    );
    expect(errFields(err)).toEqual({
      name: "Error",
      code: "P2002",
      message: "Invalid invocation",
    });
  });

  it("omits code when non-string and truncates long messages", () => {
    const f = errFields(Object.assign(new Error("x".repeat(500)), { code: 5 }));
    expect(f.code).toBeUndefined();
    expect(f.message).toHaveLength(200);
  });

  it("handles non-Error values without echoing objects", () => {
    expect(errFields({ secret: "v" })).toEqual({
      name: "NonError",
      message: "non-error value thrown",
    });
    expect(errFields("boom")).toEqual({ name: "NonError", message: "boom" });
  });
});
